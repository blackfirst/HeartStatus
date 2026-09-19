// ═══════════════════════════════════════════
// HISTORY — board data derived from the chat itself
// ═══════════════════════════════════════════
//
// The board is captured once (message-handler.js) into msg.extra.heartStatus and
// wiped out of msg.mes, so it's read from there first. Older messages that still
// have the raw tag in their text (saved before this existed, or not yet captured
// this session) fall back to parsing it live.

import { parseInfoBoard, derivePct } from './parser.js';

const cache = new WeakMap();

// Parsed board of a bot message, or null. Prefers the captured copy in
// msg.extra so nothing has to remain in the visible/saved message text.
export function dataOf(msg) {
    if (!msg || msg.is_user) return null;
    if (msg.extra && msg.extra.heartStatus) return msg.extra.heartStatus;
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

export function previousData(chat, idx) {
    for (let i = Math.min(idx, chat.length) - 1; i >= 0; i--) {
        if (usable(chat[i])) {
            const data = dataOf(chat[i]);
            if (data) return { idx: i, data };
        }
    }
    return null;
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

// Changes versus the previous board. A change trail inside the board ("40 → 62")
// wins over the previous message, because it is what the model itself reported.
export function computeDeltas(data, previous) {
    const deltas = {};
    for (const key of ['trust', 'arousal', 'jealousy', 'heart']) {
        const now = data[key];
        const base = data.prev[key] ?? (previous ? previous[key] : null);
        deltas[key] = (now === null || base === null || base === undefined) ? null : now - base;
    }
    let basePct = null;
    if (data.prev.heart !== null) basePct = derivePct(data.prev.heart);
    else if (previous && previous.pct !== null) basePct = previous.pct;
    deltas.heartPct = (data.pct === null || basePct === null) ? null : data.pct - basePct;
    return deltas;
}
