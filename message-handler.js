// ═══════════════════════════════════════════
// MESSAGE HANDLER — rendering, prompt context
// ═══════════════════════════════════════════

import { reportError } from './diagnostics.js';
import { getSettings, getChat } from './state.js';
import { dataOf } from './history.js';
import { hashData } from './parser.js';
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
    const key = [idx, hashData(data), open ? 1 : 0, s.compactMode ? 1 : 0, msg.name || ''].join('|');

    const html = buildCardHtml(data, {
        name: msg.name || '',
        theme: s.theme,
        open,
        compact: !!s.compactMode,
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

// Registered in manifest.json as "heartStatusContextFilter". SillyTavern passes a
// copy of the chat used for the prompt, so replacing entries never touches the
// messages.

export function filterContext(chat) {
    try {
        updatePromptInjection(chat);
    } catch (error) {
        reportError('[Heart Status] filterContext error:', error);
    }
}

// The "remove board format from message" behavior was removed as an option.
// Boards are never stripped out of msg.mes now — dataOf() in history.js parses
// them live from the message text instead. Kept as a no-op stub since it's
// still called from index.js/ui.js.
export async function captureAll() {
    return false;
}
