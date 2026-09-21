// ═══════════════════════════════════════════
// UI — settings drawer
// ═══════════════════════════════════════════

import { saveSettingsDebounced } from '../../../../script.js';
import { THEMES, OPEN_MODES, normalizeTheme, normalizeOpenMode } from './config.js';
import { getSettings } from './state.js';
import { updatePromptInjection } from './prompts.js';
import { renderAll } from './message-handler.js';
import { setThemeEverywhere, removeBoards } from './dom.js';

function setTheme(id) {
    const s = getSettings();
    s.theme = normalizeTheme(id);
    saveSettingsDebounced();
    setThemeEverywhere(s.theme);
    $('#hst-theme').val(s.theme);
}

export function syncUI() {
    const s = getSettings();
    if (!s) return;
    $('#hst-enabled').prop('checked', !!s.isEnabled);
    $('#hst-board-enabled').prop('checked', !!s.boardEnabled);
    $('#hst-theme').val(normalizeTheme(s.theme));
    $('#hst-open-mode').val(normalizeOpenMode(s.openMode));
    $('#hst-compact').val(s.compactMode ? 'on' : 'off');

    // Master off greys out everything below it.
    // Enable Theme off also greys out the options that only shape the board itself.
    const on = !!s.isEnabled;
    const board = on && !!s.boardEnabled;
    $('#hst-board-enabled, #hst-theme').prop('disabled', !on);
    $('#hst-compact, #hst-open-mode').prop('disabled', !board);
}

// Called after any setting that changes what the model is told or what the board shows.
function refreshAll() {
    updatePromptInjection();
    renderAll();
}

export function setupUI() {
    try {
        const themeOptions = THEMES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
        const openModeOptions = OPEN_MODES.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
        const html = `
<div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
        <b>Heart Status</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
        <div class="hst-settings">
            <label class="checkbox_label" title="Master switch. On: the board instruction is sent so the AI writes a board on every reply. Off: Heart Status stops completely — no prompt is sent, and no styled board is drawn."><input type="checkbox" id="hst-enabled"><span>Enable</span></label>
            <hr>
            <label class="checkbox_label" title="On: the board is shown styled with the theme. Off: the plain board text is shown as the AI wrote it. The prompt is still sent either way."><input type="checkbox" id="hst-board-enabled"><span>Enable Theme</span></label>
            <div class="hst-row">
                <label for="hst-theme">Theme</label>
                <select id="hst-theme" class="text_pole">${themeOptions}</select>
            </div>
            <div class="hst-row" title="Show each board as a one-row mini version (small ring, name, inline stats) — tap it to expand location/thought/goal.">
                <label for="hst-compact">Mini board</label>
                <select id="hst-compact" class="text_pole"><option value="off">Off</option><option value="on">On</option></select>
            </div>
            <div class="hst-row" title="Whether a board starts expanded or collapsed. You can still click any board's summary line to open/close it by hand either way.">
                <label for="hst-open-mode">Board open state</label>
                <select id="hst-open-mode" class="text_pole">${openModeOptions}</select>
            </div>
        </div>
    </div>
</div>`;
        $('#extensions_settings2').append(html);

        const save = () => saveSettingsDebounced();

        $('#hst-enabled').on('change', function () {
            getSettings().isEnabled = this.checked;
            save();
            if (!this.checked) removeBoards();
            syncUI();
            refreshAll();
        });
        $('#hst-board-enabled').on('change', function () {
            getSettings().boardEnabled = this.checked;
            save();
            if (!this.checked) removeBoards();
            syncUI();
            refreshAll();
        });
        $('#hst-theme').on('change', function () { setTheme(this.value); });
        $('#hst-open-mode').on('change', function () {
            getSettings().openMode = normalizeOpenMode(this.value);
            save();
            refreshAll();
        });
        $('#hst-compact').on('change', function () { getSettings().compactMode = this.value === 'on'; save(); refreshAll(); });

        syncUI();
    } catch (error) {
        console.error('[Heart Status] setupUI error:', error);
    }
}
