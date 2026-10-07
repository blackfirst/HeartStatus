// ═══════════════════════════════════════════
// UI — settings drawer
// ═══════════════════════════════════════════

import { saveSettingsDebounced } from '../../../../script.js';
import { THEMES, THEME_SIDES, THEME_SWATCHES, OPEN_MODES, normalizeTheme, normalizeOpenMode } from './config.js';
import { getSettings } from './state.js';
import { updatePromptInjection } from './prompts.js';
import { renderAll } from './message-handler.js';
import { setThemeEverywhere, removeBoards } from './dom.js';

function setTheme(id) {
    const s = getSettings();
    s.theme = normalizeTheme(id);
    saveSettingsDebounced();
    setThemeEverywhere(s.theme);
    syncUI();
}

export function syncUI() {
    const s = getSettings();
    if (!s) return;
    $('#hst-enabled').prop('checked', !!s.isEnabled);
    $('#hst-board-enabled').prop('checked', !!s.boardEnabled);

    const theme = normalizeTheme(s.theme);
    $('#hst-themes .hst-swatch').each(function () {
        const picked = this.dataset.theme === theme;
        this.setAttribute('aria-checked', picked ? 'true' : 'false');
        this.tabIndex = picked ? 0 : -1;
    });
    const layout = s.compactMode ? 'on' : 'off';
    $('#hst-compact .hst-seg-btn').each(function () {
        const picked = this.dataset.value === layout;
        this.setAttribute('aria-checked', picked ? 'true' : 'false');
        this.tabIndex = picked ? 0 : -1;
    });
    const openMode = normalizeOpenMode(s.openMode);
    $('#hst-open-mode .hst-seg-btn').each(function () {
        const picked = this.dataset.value === openMode;
        this.setAttribute('aria-checked', picked ? 'true' : 'false');
        this.tabIndex = picked ? 0 : -1;
    });

    // Master off greys out everything below it.
    // Enable Theme off also greys out the options that only shape the board itself.
    const on = !!s.isEnabled;
    const board = on && !!s.boardEnabled;
    $('#hst-board-enabled').prop('disabled', !on);
    $('#hst-themes .hst-swatch').prop('disabled', !on);
    $('#hst-compact .hst-seg-btn, #hst-open-mode .hst-seg-btn').prop('disabled', !board);
    $('.hst-group-board').attr('data-off', on ? null : '');
    $('.hst-group-layout').attr('data-off', board ? null : '');
}

// Called after any setting that changes what the model is told or what the board shows.
function refreshAll() {
    updatePromptInjection();
    renderAll();
}

export function setupUI() {
    try {
        const swatch = (t) => {
            const [bg1, bg2, c1, c2] = THEME_SWATCHES[t.id] || [];
            return `<button type="button" class="hst-swatch" role="radio" aria-checked="false" data-theme="${t.id}" title="${t.label}"
                style="--sw-bg1:${bg1};--sw-bg2:${bg2};--sw-c1:${c1};--sw-c2:${c2};">
                <span class="hst-swatch-tile"><i class="hst-swatch-ring"></i><i class="hst-swatch-bar"></i><i class="hst-swatch-bar short"></i></span>
                <span class="hst-swatch-name">${t.short || t.label}</span>
            </button>`;
        };
        const swatches = THEME_SIDES.map(side => `
            <div class="hst-theme-side" data-side="${side.id}">
                <div class="hst-theme-side-label">${side.label}</div>
                <div class="hst-themes-grid">${THEMES.filter(t => t.side === side.id).map(swatch).join('')}</div>
            </div>`).join('');
        const seg = (items) => items.map(([value, label]) =>
            `<button type="button" class="hst-seg-btn" role="radio" aria-checked="false" data-value="${value}">${label}</button>`).join('');
        const html = `
<div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
        <b>Heart Status</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
        <div class="hst-settings">
            <div class="hst-group hst-group-master">
                <label class="checkbox_label hst-switch" title="Master switch. On: the board instruction is sent so the AI writes a board on every reply. Off: Heart Status stops completely.">
                    <input type="checkbox" id="hst-enabled">
                    <span class="hst-switch-text"><b>Enable</b><small>Ask the AI to write a status board on every reply.</small></span>
                </label>
            </div>

            <div class="hst-group hst-group-board">
                <label class="checkbox_label hst-switch" title="On: the board is shown styled with the theme. Off: the plain board text is shown as the AI wrote it. The prompt is still sent either way.">
                    <input type="checkbox" id="hst-board-enabled">
                    <span class="hst-switch-text"><b>Enable Theme</b><small>Draw the board with a theme. Off shows the AI's plain text.</small></span>
                </label>
                <div class="hst-field">
                    <div class="hst-field-label" id="hst-theme-label">Theme</div>
                    <div class="hst-themes" id="hst-themes" role="radiogroup" aria-labelledby="hst-theme-label">${swatches}</div>
                </div>
            </div>

            <div class="hst-group hst-group-layout">
                <div class="hst-field hst-field-inline" title="Show each board as a one-row mini version (small ring, name, inline stats). Tap it to expand location, thought and goal.">
                    <div class="hst-field-label" id="hst-compact-label">Board</div>
                    <div class="hst-seg" id="hst-compact" role="radiogroup" aria-labelledby="hst-compact-label">${seg([['off', 'Full'], ['on', 'Mini']])}</div>
                </div>
                <div class="hst-field hst-field-inline" title="Whether a board starts expanded or collapsed. You can still click any board's summary line to open or close it by hand.">
                    <div class="hst-field-label" id="hst-open-label">Board open state</div>
                    <div class="hst-seg" id="hst-open-mode" role="radiogroup" aria-labelledby="hst-open-label">${seg(OPEN_MODES.map(m => [m.id, m.label]))}</div>
                </div>
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
        $('#hst-themes').on('click', '.hst-swatch', function () { setTheme(this.dataset.theme); });
        $('#hst-open-mode').on('click', '.hst-seg-btn', function () {
            getSettings().openMode = normalizeOpenMode(this.dataset.value);
            save();
            syncUI();
            refreshAll();
        });
        $('#hst-compact').on('click', '.hst-seg-btn', function () {
            getSettings().compactMode = this.dataset.value === 'on';
            save();
            syncUI();
            refreshAll();
        });

        // Radio groups: arrow keys move the choice, like native radios.
        $('#hst-themes, #hst-compact, #hst-open-mode').on('keydown', '[role="radio"]', function (e) {
            const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            if (!(e.key in keys)) return;
            const group = $(this).closest('[role="radiogroup"]');
            const items = group.find('[role="radio"]:not(:disabled)').toArray();
            const next = items[(items.indexOf(this) + keys[e.key] + items.length) % items.length];
            if (!next) return;
            e.preventDefault();
            next.focus();
            next.click();
        });

        syncUI();
    } catch (error) {
        console.error('[Heart Status] setupUI error:', error);
    }
}
