// ═══════════════════════════════════════════
// PARSER — reads the <info_board> block from a message
// ═══════════════════════════════════════════
//
// The old regex script needed every field in the exact order. This parser reads
// the block line by line instead, so a missing field, extra markdown (**bold**),
// a change trail ("40 → 62") or a board squeezed onto one line still works.

import { LIMITS } from './config.js';

// Fresh RegExp each time: a shared /g regex keeps lastIndex between calls.
const boardRe = (flags = 'i') => new RegExp('<info_board>([\\s\\S]*?)<\\/info_board>', flags);
// Fallback when the closing tag is missing: the model still wraps fields in a
// ``` fence (the instructed format), so grab that fence right after the tag.
const fenceAfterTagRe = (flags = 'i') => new RegExp('<info_board>\\s*```(?:[a-zA-Z0-9_-]*\\n)?([\\s\\S]*?)```', flags);
const openTagRe = (flags = 'gi') => new RegExp('<info_board>', flags);

// "⏰ Time: ..." / "**🤝 Trust:** 62" / "Trust: 62" -> [label, value]
const FIELD_RE = /^[^A-Za-z]*?(Time|Date|Location|Trust|Arousal|Jealousy|Heart\s*Score|Relationship|Thought|Goal)\s*\**\s*:\s*\**\s*(.*?)\s*$/i;

// Emoji that start a field. Used to split a board that arrived on a single line.
const SPLIT_RE = /\s*(?:\*{2,}\s*)?(⏰|🗓\uFE0F?|📍|🤝|💓|🔥|💗|🏷\uFE0F?|💭|🏆)(?=\s*\**\s*(?:Time|Date|Location|Trust|Arousal|Jealousy|Heart|Relationship|Thought|Goal)\b)/giu;

const TEXT_FIELDS = new Set(['time', 'date', 'location', 'relationship', 'thought', 'goal']);

function clamp(n, [min, max]) {
    return Math.min(max, Math.max(min, n));
}

function firstNumber(str) {
    const m = String(str).replace(/\u2212/g, '-').match(/[+-]?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
}

// Split "40 → 62" into ["40", "62"], ignoring arrows inside parentheses.
function splitTrail(value) {
    const chars = Array.from(String(value));
    const parts = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
        if (depth === 0) {
            if (c === '→' || c === '➔' || c === '➜' || c === '⟶') { parts.push(cur); cur = ''; continue; }
            if ((c === '-' || c === '=') && chars[i + 1] === '>') { parts.push(cur); cur = ''; i++; continue; }
        }
        cur += c;
    }
    parts.push(cur);
    return parts.map(p => p.trim()).filter(Boolean);
}

// "62", "40 → 62", "62 (+22)" -> { value: 62, from: 40 | null, last: "62 (+22)" }
function parseStat(raw, key) {
    const parts = splitTrail(raw);
    if (!parts.length) return null;
    const last = parts[parts.length - 1];
    const cur = firstNumber(last);
    if (cur === null) return null;
    const from = parts.length > 1 ? firstNumber(parts[0]) : null;
    return {
        value: clamp(cur, LIMITS[key]),
        from: from === null ? null : clamp(from, LIMITS[key]),
        last,
    };
}

// Percentage equivalent of a Heart Score (-1000..1000 -> 0..100).
export function derivePct(heart) {
    return Math.min(100, Math.max(0, Math.round((heart + 1000) / 20)));
}

function readPct(lastPart) {
    const group = lastPart.match(/\(([^)]*)\)/);
    if (!group) return null;
    const nums = [...group[1].matchAll(/([+-]?\d+(?:\.\d+)?)\s*%/g)];
    if (!nums.length) return null;
    const v = parseFloat(nums[nums.length - 1][1]);
    return v >= 0 && v <= 100 ? v : null;
}

function cleanQuotes(text) {
    return String(text).replace(/^["“”„'‘’「『«]+\s*/, '').replace(/\s*["“”„'‘’」』»]+$/, '').trim();
}

function parseBody(body, raw) {
    const lines = body.replace(SPLIT_RE, '\n$1').split(/\r?\n/);
    const fields = {};
    let current = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || /^`{3}/.test(trimmed)) continue;
        const m = FIELD_RE.exec(trimmed);
        if (m) {
            current = m[1].toLowerCase().replace(/\s+/g, '');
            fields[current] = m[2].replace(/\s*\*{2,}$/, '');
        } else if (current && TEXT_FIELDS.has(current)) {
            // A long thought or goal that wrapped onto the next line.
            fields[current] += ' ' + trimmed.replace(/\s*\*{2,}$/, '');
        }
    }

    const trust = fields.trust !== undefined ? parseStat(fields.trust, 'trust') : null;
    const arousal = fields.arousal !== undefined ? parseStat(fields.arousal, 'arousal') : null;
    const jealousy = fields.jealousy !== undefined ? parseStat(fields.jealousy, 'jealousy') : null;
    const heartStat = fields.heartscore !== undefined ? parseStat(fields.heartscore, 'heart') : null;

    let pct = null;
    if (heartStat) {
        pct = readPct(heartStat.last);
        if (pct === null) pct = derivePct(heartStat.value);
    }

    const fieldCount = Object.keys(fields).length;
    // Needs to look like a real board, not a stray mention of the tag.
    if (fieldCount < 3 || (!trust && !heartStat)) return null;

    return {
        time: (fields.time || '').trim(),
        date: (fields.date || '').trim(),
        location: (fields.location || '').trim(),
        trust: trust ? trust.value : null,
        arousal: arousal ? arousal.value : null,
        jealousy: jealousy ? jealousy.value : null,
        heart: heartStat ? heartStat.value : null,
        pct,
        relationship: (fields.relationship || '').trim(),
        thought: cleanQuotes(fields.thought || ''),
        goal: (fields.goal || '').trim(),
        // Start values when the model showed a change trail ("40 → 62").
        prev: {
            trust: trust ? trust.from : null,
            arousal: arousal ? arousal.from : null,
            jealousy: jealousy ? jealousy.from : null,
            heart: heartStat ? heartStat.from : null,
        },
        rawLength: raw.length,
    };
}

export function hasBoardTag(text) {
    return typeof text === 'string' && /<info_board>/i.test(text);
}

// Returns the parsed LAST board in the text, or null.
export function parseInfoBoard(text) {
    if (!hasBoardTag(text)) return null;

    // 1) The well-formed case: a closed <info_board>...</info_board>.
    let re = boardRe('gi');
    let match;
    let last = null;
    while ((match = re.exec(text)) !== null) last = match;
    if (last) {
        try {
            const data = parseBody(last[1], last[0]);
            if (data) return data;
        } catch (e) { /* fall through to the more forgiving passes below */ }
    }

    // 2) No closing tag, but the fields are still wrapped in a ``` fence (the
    //    format the model is instructed to use) — read that instead.
    re = fenceAfterTagRe('gi');
    match = null;
    last = null;
    while ((match = re.exec(text)) !== null) last = match;
    if (last) {
        try {
            const data = parseBody(last[1], last[0]);
            if (data) return data;
        } catch (e) { /* fall through */ }
    }

    // 3) No closing tag and no fence either. Read a bounded run of lines after
    //    the last opening tag — capped so a missing close can never swallow the
    //    rest of the reply (story text, next board, etc.).
    const openRe = openTagRe();
    let openMatch;
    let lastOpen = null;
    while ((openMatch = openRe.exec(text)) !== null) lastOpen = openMatch;
    if (lastOpen) {
        const after = text.slice(lastOpen.index + lastOpen[0].length);
        const slice = after.split(/\r?\n/).slice(0, 25).join('\n');
        try {
            return parseBody(slice, lastOpen[0] + slice);
        } catch (e) { return null; }
    }
    return null;
}

// Removes every complete board from the text.
export function stripInfoBoards(text) {
    if (!hasBoardTag(text)) return text;
    let out = text.replace(boardRe('gi'), '');
    // Also drop an unclosed board (tag + its fence) so it doesn't linger in the prompt.
    out = out.replace(new RegExp('<info_board>\\s*```(?:[a-zA-Z0-9_-]*\\n)?[\\s\\S]*?```', 'gi'), '');
    return out.replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n');
}

// Short fingerprint used to decide whether a rendered card is still up to date.
export function hashData(d) {
    if (!d) return '';
    return [d.time, d.date, d.location, d.trust, d.arousal, d.jealousy, d.heart, d.pct, d.relationship, d.thought, d.goal].join('¦');
}
