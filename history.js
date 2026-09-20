// ═══════════════════════════════════════════
// HISTORY — board data derived from the chat itself
// ═══════════════════════════════════════════
//
// The board is captured once (message-handler.js) into msg.extra.heartStatus and
// wiped out of msg.mes, so it's read from there first. Older messages that still
// have the raw tag in their text (from before this existed, or not yet captured
// this session) fall back to parsing it live.

import { parseInfoBoard, derivePct } from './parser.js';

const cache = new WeakMap();

// Boards captured before the percentage was always derived may carry a model-written
// percentage that disagrees with the score. Make it match the Heart Score.
function withDerivedPct(data) {
    if (data && typeof data.heart === 'number') {
        const pct = derivePct(data.heart);
        if (data.pct !== pct) data.pct = pct;
    }
    return data;
}

// Parsed board of a bot message, or null. Prefers the captured copy in
// msg.extra so nothing has to remain in the visible message text.
export function dataOf(msg) {
    if (!msg || msg.is_user) return null;
    if (msg.extra && msg.extra.heartStatus) return withDerivedPct(msg.extra.heartStatus);
    if (typeof msg.mes !== 'string') return null;
    const hit = cache.get(msg);
    if (hit && hit.mes === msg.mes) return hit.data;
    const data = parseInfoBoard(msg.mes);
    cache.set(msg, { mes: msg.mes, data });
    return data;
}

// "Visible to the model" = not hidden/system.
const usable = (msg) => msg && !msg.is_system;

export function lastBoardIndex(chat) {
    for (let i = chat.length - 1; i >= 0; i--) {
        if (usable(chat[i]) && dataOf(chat[i])) return i;
    }
    return -1;
}

// Oldest → newest, at most `limit` entries.
export function collectHistory(chat, limit = 60) {
    const out = [];
    for (let i = 0; i < chat.length; i++) {
        if (!usable(chat[i])) continue;
        const data = dataOf(chat[i]);
        if (data) out.push({ idx: i, data });
    }
    return out.slice(-limit);
}
