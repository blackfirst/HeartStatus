// ═══════════════════════════════════════════
// MESSAGE HANDLER — rendering, prompt context
// ═══════════════════════════════════════════

import { reportError } from './diagnostics.js';
import { getSettings, getChat } from './state.js';
import { dataOf } from './history.js';
import { hashData } from './parser.js';
import { buildBoardHtml } from './render.js';
import { mountBoard, removeBoards, hasLegacyBoard } from './dom.js';
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

    // Master switch off, or board switched off: show the plain board exactly as the model
    // wrote it. removeBoards() un-hides the original board and drops any board we drew.
    if (!s?.isEnabled || !s.boardEnabled) {
        removeBoards(mesText);
        return;
    }

    const chat = getChat();
    const msg = chat[idx];
    const data = dataOf(msg);
    if (!data) {
        // Nothing parsed: nothing to draw, and no board should be left behind.
        removeBoards(mesText);
        return;
    }

    if (hasLegacyBoard(mesText)) {
        if (!legacyWarned) {
            legacyWarned = true;
            notify('The old “Heart Status” regex script is still enabled and already draws a board. Disable it in Extensions → Regex to use this extension’s board.', 'warning');
        }
        return;
    }

    // 'always' opens every board, 'never' collapses every board (the person can still toggle by hand).
    const open = s.openMode !== 'never';
    const key = [idx, hashData(data), open ? 1 : 0, s.compactMode ? 1 : 0, msg.name || ''].join('|');

    const html = buildBoardHtml(data, {
        name: msg.name || '',
        theme: s.theme,
        open,
        compact: !!s.compactMode,
    });
    mountBoard(mesText, key, html, data.rawLength);
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
