// ═══════════════════════════════════════════
// PROMPTS — instruction injected for the AI
// ═══════════════════════════════════════════

import { setExtensionPrompt, extension_prompts, extension_prompt_types, extension_prompt_roles } from '../../../../script.js';
import { extensionName } from './config.js';
import { reportError } from './diagnostics.js';
import { getSettings, getChat, getActiveOverride } from './state.js';
import { lastBoardIndex, dataOf } from './history.js';
import { derivePct } from './parser.js';

const FENCE = '```';

function boardFormat(s) {
    const lines = [
        '⏰ Time: [in-world time at start, 12-hour clock with AM/PM] → [in-world time at end of this post]',
        '🗓️ Date: [in-world day, EEE dd MMM yyyy] | [current season]',
        '📍 Location: [current in-world location] | 💡 [lighting/illumination level]',
        '🤝 Trust: [0 - 100]',
    ];
    if (s.showArousal !== false) lines.push('💓 Arousal: [0 - 100]');
    if (s.showJealousy !== false) lines.push('🔥 Jealousy: [0 - 100]');
    lines.push(
        '💗 Heart Score: [-1000 - 1000] ([percentage equivalent]%)',
        '🏷️ Relationship: [{{char}} ↔ {{user}} current relationship label]',
        '💭 Thought: "one unspoken sentence reflecting {{char}}\'s current internal thought"',
        '🏆 Goal: [one sentence describing {{char}}\'s current immediate goal]',
    );
    return `<info_board>\n${FENCE}\n${lines.join('\n')}\n${FENCE}\n</info_board>`;
}

function rules(s) {
    const r = [
        '- Values shift based only on what actually happens ({{user}}\'s words/actions), never randomly or by fixed steps.',
        '- Trust: ↑ honesty, kindness, consistency, kept promises; ↓ lies, broken promises, coldness, betrayal.',
    ];
    if (s.showArousal !== false) {
        r.push('- Arousal: ↑ romantic/physical closeness, flirtation, intimacy fitting the scene; decays naturally over time, distance, or conflict.');
    }
    if (s.showJealousy !== false) {
        r.push('- Jealousy: ↑ perceived rivals, neglect, threats to the relationship; ↓ reassurance, exclusivity, affection.');
    }
    r.push(
        '- Heart Score: running total reflecting cumulative interaction quality — trends up/down over time, not swung by one line. The percentage equals (score + 1000) / 20, rounded.',
        '- Change magnitude scales with the moment\'s significance (small talk = small shift; confession/betrayal/reconciliation = large shift).',
        '- The board is a summary only — it must never dictate or override {{char}}\'s behavior in the roleplay text; behavior comes first, board reflects it after.',
        '- Dates/seasons/time must match the setting\'s established calendar (real or fictional), staying internally consistent.',
        '- Write the board once, at the very start of the reply, then continue with the roleplay text.',
    );
    return r.join('\n');
}

function lastTime(time) {
    if (!time) return '';
    const parts = time.split(/→|➔|->/);
    return parts[parts.length - 1].trim();
}

function fmtStat(label, value) {
    return (value === null || value === undefined) ? '' : `${label} ${value}`;
}

// The numbers the next board must start from.
function baselineBlock(s, chat) {
    const override = getActiveOverride(chat);
    const idx = lastBoardIndex(chat);
    const prev = idx >= 0 ? dataOf(chat[idx]) : null;

    if (override) {
        const parts = [
            fmtStat('Trust', override.trust),
            s.showArousal !== false ? fmtStat('Arousal', override.arousal) : '',
            s.showJealousy !== false ? fmtStat('Jealousy', override.jealousy) : '',
            override.heart === null || override.heart === undefined
                ? '' : `Heart Score ${override.heart} (${derivePct(override.heart)}%)`,
        ].filter(Boolean);
        let b = `\n[CURRENT VALUES] {{user}} manually adjusted the tracker. Use these as the new starting point for the next board: ${parts.join(', ')}.`;
        b += ' Keep any stat not listed as it was. Never mention this adjustment in the story.';
        if (prev) b += ` Last in-world time: ${lastTime(prev.time)}; date: ${prev.date}.`;
        return b + '\n';
    }

    if (!prev) {
        return '\n[CURRENT VALUES] No board has been shown yet. Start with values that fit how well {{char}} and {{user}} know each other at this point of the story.\n';
    }

    const stats = [
        fmtStat('Trust', prev.trust),
        s.showArousal !== false ? fmtStat('Arousal', prev.arousal) : '',
        s.showJealousy !== false ? fmtStat('Jealousy', prev.jealousy) : '',
        prev.heart === null ? '' : `Heart Score ${prev.heart} (${prev.pct}%)`,
    ].filter(Boolean).join(', ');
    let b = `\n[CURRENT VALUES] Previous board: ${stats}.`;
    if (prev.relationship) b += ` Relationship: ${prev.relationship}.`;
    if (prev.location) b += ` Location: ${prev.location}.`;
    const t = lastTime(prev.time);
    if (t || prev.date) b += ` Last in-world time: ${t || 'unknown'}; date: ${prev.date || 'unknown'}.`;
    b += ' Start from these values and move them only as the rules describe.\n';
    return b;
}

export function buildPrompt(chat) {
    const s = getSettings();
    if (!s || !s.isEnabled) return '';
    let b = '[HEART STATUS]\n';
    b += 'Start every roleplay reply with an Information Board giving extra scene context, in this exact format:\n\n';
    b += boardFormat(s) + '\n\nRules:\n' + rules(s) + '\n';
    b += baselineBlock(s, chat);
    return b;
}

export function updatePromptInjection(chat) {
    try {
        const text = buildPrompt(chat || getChat());
        const installed = extension_prompts[extensionName];
        // SillyTavern replaces this registry when a chat is cleared, so compare with
        // what the host actually holds instead of a local cache.
        if (installed
            && installed.value === text
            && installed.position === extension_prompt_types.IN_CHAT
            && installed.depth === 0
            && installed.role === extension_prompt_roles.SYSTEM) return;
        setExtensionPrompt(extensionName, text, extension_prompt_types.IN_CHAT, 0, false, extension_prompt_roles.SYSTEM);
    } catch (error) {
        reportError('[Heart Status] updatePromptInjection error:', error);
    }
}
