// ═══════════════════════════════════════════
// HISTORY — board data derived from the chat itself
// ═══════════════════════════════════════════
//
// Boards are read straight from each message's text (the raw <info_board> stays in
// msg.mes) and cached per message.

import { parseInfoBoard } from './parser.js';

const cache = new WeakMap();

// Parsed board of a bot message, or null.
export function dataOf(msg) {
    if (!msg || msg.is_user) return null;
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
