// ═══════════════════════════════════════════
// STATE — settings and per-chat manual adjustment
// ═══════════════════════════════════════════

import { extension_settings } from '../../../extensions.js';
import { extensionName, META_KEY } from './config.js';
import { lastBoardIndex, dataOf } from './history.js';
import { hashData } from './parser.js';

export function getSettings() {
    return extension_settings[extensionName];
}

export function getContextSafe() {
    try {
        return SillyTavern.getContext();
    } catch (e) {
        return null;
    }
}

export function getChat() {
    return getContextSafe()?.chat || [];
}

// Stored in chat metadata. It expires as soon as a newer board appears, so it
// only ever affects one reply.

export function setOverride(values) {
    const ctx = getContextSafe();
    if (!ctx) return false;
    const chat = ctx.chat || [];
    const idx = lastBoardIndex(chat);
    const meta = ctx.chatMetadata;
    if (!meta) return false;
    meta[META_KEY] = {
        values,
        atIndex: idx,
        atHash: idx >= 0 ? hashData(dataOf(chat[idx])) : '',
    };
    try { ctx.saveMetadata?.(); } catch (e) { /* non-fatal */ }
    return true;
}

export function clearOverride() {
    const ctx = getContextSafe();
    const meta = ctx?.chatMetadata;
    if (!meta || !meta[META_KEY]) return;
    delete meta[META_KEY];
    try { ctx.saveMetadata?.(); } catch (e) { /* non-fatal */ }
}

// Returns the pending adjustment for `chat`, or null when none / expired.
export function getActiveOverride(chat = getChat()) {
    const ov = getContextSafe()?.chatMetadata?.[META_KEY];
    if (!ov || typeof ov !== 'object' || !ov.values) return null;
    const idx = lastBoardIndex(chat);
    const hash = idx >= 0 ? hashData(dataOf(chat[idx])) : '';
    return (idx === ov.atIndex && hash === ov.atHash) ? ov.values : null;
}
