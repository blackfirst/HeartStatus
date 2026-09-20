// ═══════════════════════════════════════════
// MESSAGE HANDLER — rendering, notifications, prompt context
// ═══════════════════════════════════════════

import { reportError } from './diagnostics.js';
import { getSettings, getChat, getContextSafe } from './state.js';
import { dataOf, lastBoardIndex, previousData, computeDeltas } from './history.js';
import { hashData, hasBoardTag, stripInfoBoards, parseInfoBoard } from './parser.js';
import { buildCardHtml } from './render.js';
import { mountCard, removeCards, hasLegacyCard } from './dom.js';
import { updatePromptInjection } from './prompts.js';
import { notify } from './notifications.js';

// index.js hands over a function that drops the observer's pending records, so
// our own DOM edits never wake the observer again.
let discardMutations = () => {};
export function setMutationDiscarder(fn) {
    discardMutations = typeof fn === 'function' ? fn : () => {};
}

let legacyWarned = false;

// ─── Rendering ───

export function renderMessage(mesId) {
    const s = getSettings();
    const idx = Number(mesId);
    if (!Number.isInteger(idx)) return;
    const mesText = document.querySelector(`#chat .mes[mesid="${idx}"] .mes_text`);
    if (!mesText) return;

    if (!s?.isEnabled) {
        removeCards(mesText);
        return;
    }

    const chat = getChat();
    const msg = chat[idx];
    const data = dataOf(msg);
    if (!data) {
        // Nothing parsed: still wipe any raw board text out of view rather than
        // leaving it printed in the chat.
        removeCards(mesText);
        return;
    }

    if (!s.showInChat) {
        // Tracked, just not shown: clear whatever's there (raw text or an old
        // card) down to nothing.
        const key = [idx, hashData(data), 'hidden'].join('|');
        mountCard(mesText, key, '', data.rawLength);
        return;
    }

    if (hasLegacyCard(mesText)) {
        if (!legacyWarned) {
            legacyWarned = true;
            notify('The old “Heart Status” regex script is still enabled and already draws a card. Disable it in Extensions → Regex to use this extension’s card.', 'warning');
        }
        return;
    }

    // 'always' opens every card, 'never' collapses every card (the person can still toggle by hand).
    const open = s.openMode !== 'never';
    const previous = previousData(chat, idx);
    const deltas = computeDeltas(data, previous ? previous.data : null);
    const key = [idx, hashData(data), open ? 1 : 0, s.compactMode ? 1 : 0, msg.name || ''].join('|');

    const html = buildCardHtml(data, {
        name: msg.name || '',
        theme: s.theme,
        open,
        compact: !!s.compactMode,
        deltas,
    });
    mountCard(mesText, key, html, data.rawLength);
}

export function renderAll() {
    try {
        document.querySelectorAll('#chat .mes[is_user="false"]').forEach(el => {
            renderMessage(el.getAttribute('mesid'));
        });
    } catch (error) {
        reportError('[Heart Status] renderAll error:', error);
    } finally {
        discardMutations();
    }
}

let renderTimer = null;
export function scheduleRenderAll(delay = 150) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, delay);
}

// ─── Notifications ───

const notified = new Set();
export function resetNotified() {
    notified.clear();
}

const STAT_LABELS = [
    ['trust', 'Trust'],
    ['arousal', 'Arousal'],
    ['jealousy', 'Jealousy'],
];

export function checkNotify(mesId) {
    try {
        const s = getSettings();
        if (!s?.isEnabled || !s.showNotifications) return;
        const chat = getChat();
        const idx = Number(mesId);
        const data = dataOf(chat[idx]);
        if (!data) return;

        const key = `${idx}|${hashData(data)}`;
        if (notified.has(key)) return;
        notified.add(key);
        if (notified.size > 200) notified.delete(notified.values().next().value);

        const previous = previousData(chat, idx);
        const deltas = computeDeltas(data, previous ? previous.data : null);
        const threshold = Math.max(1, Number(s.notifyThreshold) || 15);
        const lines = [];

        for (const [k, label] of STAT_LABELS) {
            const d = deltas[k];
            if (d !== null && Math.abs(d) >= threshold) {
                lines.push(`${d > 0 ? '▲' : '▼'} ${label} ${d > 0 ? '+' : ''}${d} (now ${data[k]})`);
            }
        }
        // Heart Score is compared on its 0–100 percentage so the threshold means the same thing.
        if (deltas.heartPct !== null && Math.abs(deltas.heartPct) >= threshold) {
            const d = deltas.heart;
            lines.push(`${deltas.heartPct > 0 ? '▲' : '▼'} Heart Score ${d !== null && d > 0 ? '+' : ''}${d ?? ''} (now ${data.heart})`);
        }
        if (lines.length) notify(lines.join('<br>'), 'info');
    } catch (error) {
        reportError('[Heart Status] checkNotify error:', error);
    }
}

// ─── Prompt context (generate interceptor) ───
// Registered in manifest.json as "heartStatusContextFilter". SillyTavern passes a
// copy of the chat used for the prompt, so replacing entries never touches the
// saved messages.

export function filterContext(chat) {
    try {
        const s = getSettings();
        if (s?.isEnabled && s.trimOldBoards && Array.isArray(chat)) {
            const keep = lastBoardIndex(chat);
            for (let i = 0; i < chat.length; i++) {
                if (i === keep) continue; // the latest board stays as the model's format example
                const msg = chat[i];
                if (!msg || msg.is_user || !hasBoardTag(msg.mes)) continue;
                const clean = stripInfoBoards(msg.mes);
                if (clean && clean !== msg.mes) chat[i] = { ...msg, mes: clean };
            }
        }
        updatePromptInjection(chat);
    } catch (error) {
        reportError('[Heart Status] filterContext error:', error);
    }
}

// ─── Maintenance ───

// Reads the board out of a message's raw text into msg.extra.heartStatus, then
// erases it from the visible/saved text (and the active swipe) so it never sits
// in the message itself — not in the chat log, not while editing, not in swipes.
// Only call this once a message is finalized (never mid-stream: it mutates
// msg.mes, which an in-progress generation is still appending to).
async function captureOne(msg) {
    if (!msg || msg.is_user || typeof msg.mes !== 'string' || !hasBoardTag(msg.mes)) return false;
    const data = parseInfoBoard(msg.mes);
    if (!data) return false;
    const clean = stripInfoBoards(msg.mes);
    msg.extra = msg.extra || {};
    msg.extra.heartStatus = data;
    msg.mes = clean;
    if (Array.isArray(msg.swipes) && typeof msg.swipe_id === 'number' && typeof msg.swipes[msg.swipe_id] === 'string') {
        msg.swipes[msg.swipe_id] = stripInfoBoards(msg.swipes[msg.swipe_id]);
    }
    return true;
}

// Sweeps the whole chat (cheap: hasBoardTag skips anything already captured).
// No-ops entirely when the "erase from saved message" setting is off.
export async function captureAll() {
    if (!getSettings()?.stripFromMessage) return false;
    try {
        const ctx = getContextSafe();
        const chat = ctx?.chat;
        if (!Array.isArray(chat)) return false;
        let changed = false;
        for (const msg of chat) {
            if (await captureOne(msg)) changed = true;
        }
        if (changed) {
            try { await ctx.saveChat?.(); } catch (e) { /* ignore */ }
        }
        return changed;
    } catch (error) {
        reportError('[Heart Status] captureAll error:', error);
        return false;
    }
}

// Removes every board from the chat text (and its swipes). Returns how many messages changed.
export async function purgeBoards() {
    const ctx = getContextSafe();
    if (!ctx || !Array.isArray(ctx.chat)) return 0;
    let changed = 0;
    for (const msg of ctx.chat) {
        if (!msg?.extra?.heartStatus && !hasBoardTag(msg?.mes)) continue;
        if (msg.extra) delete msg.extra.heartStatus;
        const clean = hasBoardTag(msg.mes) ? stripInfoBoards(msg.mes) : msg.mes;
        if (clean !== msg.mes) msg.mes = clean;
        if (Array.isArray(msg.swipes)) {
            msg.swipes = msg.swipes.map(t => (typeof t === 'string' ? (stripInfoBoards(t) || t) : t));
        }
        changed++;
    }
    if (changed) {
        try { await ctx.saveChat?.(); } catch (e) { /* ignore */ }
        try { await ctx.reloadCurrentChat?.(); } catch (e) { /* ignore */ }
    }
    return changed;
}
