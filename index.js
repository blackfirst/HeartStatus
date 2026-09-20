// ═══════════════════════════════════════════
// INDEX — extension entry point
// ═══════════════════════════════════════════

import { eventSource, event_types } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { extensionName, defaultSettings, normalizeTheme, normalizeOpenMode } from './config.js';
import { reportError } from './diagnostics.js';
import { updatePromptInjection } from './prompts.js';
import { setupUI, syncUI } from './ui.js';
import {
    renderMessage, renderAll, scheduleRenderAll,
    filterContext, setMutationDiscarder, captureAll,
} from './message-handler.js';
import { setThemeEverywhere } from './dom.js';
import { migrateFromOldKit } from './migrate.js';
import { reloadIfUpdated } from './updater.js';

// Named in manifest.json ("generate_interceptor"); SillyTavern calls it before every generation.
window.heartStatusContextFilter = filterContext;

function loadSettings() {
    try {
        if (!extension_settings[extensionName]) {
            extension_settings[extensionName] = structuredClone(defaultSettings);
        }
        const s = extension_settings[extensionName];
        // Add settings introduced by newer versions without touching existing choices.
        for (const key in defaultSettings) {
            if (s[key] === undefined) s[key] = structuredClone(defaultSettings[key]);
        }
        s.theme = normalizeTheme(s.theme);
        s.openMode = normalizeOpenMode(s.openMode); // removed 'auto' (or anything unknown) becomes 'always'
        // Arousal and Jealousy are always tracked now; drop the old on/off switches.
        delete s.showArousal;
        delete s.showJealousy;
        // The "notify on big changes" toast feature was removed.
        delete s.showNotifications;
        delete s.notifyThreshold;
    } catch (error) {
        reportError('[Heart Status] Error loading settings:', error);
        extension_settings[extensionName] = structuredClone(defaultSettings);
    }
}

function afterChatChange() {
    reloadIfUpdated();
    syncUI();
    updatePromptInjection();
    captureAll();
    // Messages are drawn a moment after the event; try twice for slow/large chats.
    setTimeout(renderAll, 400);
    setTimeout(renderAll, 1500);
}

jQuery(async () => {
    try {
        // If the running code is stale (extension was updated since this page loaded),
        // this reloads the page and returns true — skip the rest of setup in that case.
        if (await reloadIfUpdated()) return;

        loadSettings();
        migrateFromOldKit();
        setupUI();
        updatePromptInjection();

        // New reply finished: refresh the prompt for the next turn.
        eventSource.on(event_types.MESSAGE_RECEIVED, () => {
            updatePromptInjection();
        });

        // The message is in the DOM: swap the raw board for the card.
        if (event_types.CHARACTER_MESSAGE_RENDERED) {
            eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId) => {
                renderMessage(mesId);
                scheduleRenderAll(); // updates collapsed/open state of older cards
            });
        }
        if (event_types.GENERATION_ENDED) {
            eventSource.on(event_types.GENERATION_ENDED, () => {
                updatePromptInjection();
                // The reply is finalized now, so it's safe to pull its board into
                // msg.extra and erase it from the message text.
                captureAll().then(() => scheduleRenderAll(300));
                scheduleRenderAll(300);
            });
        }
        for (const name of ['MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED']) {
            if (event_types[name]) {
                eventSource.on(event_types[name], () => {
                    updatePromptInjection();
                    captureAll().then(() => scheduleRenderAll(300));
                    scheduleRenderAll(300);
                });
            }
        }
        if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, afterChatChange);
        }

        // SillyTavern rebuilds .mes_text on swipe/continue/edit, wiping the card.
        // Watch the chat and redraw when a message shows a raw board again.
        try {
            const chatEl = document.getElementById('chat');
            if (chatEl) {
                const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        const target = m.target && m.target.nodeType === 1 ? m.target : m.target?.parentElement;
                        const mesText = target?.closest?.('.mes_text');
                        if (mesText && !mesText.querySelector('.hst-slot')) {
                            scheduleRenderAll(150);
                            return;
                        }
                    }
                });
                observer.observe(chatEl, { childList: true, subtree: true });
                setMutationDiscarder(() => observer.takeRecords());
            }
        } catch (error) {
            reportError('[Heart Status] observer setup failed:', error);
        }

        // Apply the saved theme to any card already on screen.
        setThemeEverywhere(extension_settings[extensionName].theme);
        captureAll().then(() => setTimeout(renderAll, 800));
        setTimeout(renderAll, 800);
    } catch (error) {
        reportError('[Heart Status] FATAL ERROR:', error);
    }
});
