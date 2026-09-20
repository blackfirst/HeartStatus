// ═══════════════════════════════════════════
// UI — settings drawer, quick panel, wand menu entry
// ═══════════════════════════════════════════

import { saveSettingsDebounced } from '../../../../script.js';
import { THEMES, OPEN_MODES, LIMITS, STAT_COLORS, normalizeTheme, normalizeOpenMode } from './config.js';
import { getSettings, getChat, setOverride, clearOverride, getActiveOverride } from './state.js';
import { collectHistory, lastBoardIndex, dataOf } from './history.js';
import { escapeHtml } from './render.js';
import { updatePromptInjection } from './prompts.js';
import { renderAll, captureAll } from './message-handler.js';
import { setThemeEverywhere, removeCards } from './dom.js';
import { notify } from './notifications.js';

// ─── Theme ───

function setTheme(id) {
    const s = getSettings();
    s.theme = normalizeTheme(id);
    saveSettingsDebounced();
    setThemeEverywhere(s.theme);
    $('#hst-theme').val(s.theme);
}

// ─── Settings sync ───

export function syncUI() {
    const s = getSettings();
    if (!s) return;
    $('#hst-enabled').prop('checked', !!s.isEnabled);
    $('#hst-notify').prop('checked', !!s.showNotifications);
    $('#hst-threshold').val(s.notifyThreshold);
    $('#hst-theme').val(normalizeTheme(s.theme));
    $('#hst-open-mode').val(normalizeOpenMode(s.openMode));
    $('#hst-show-in-chat').prop('checked', s.showInChat !== false);
    $('#hst-strip').prop('checked', s.stripFromMessage !== false);
    $('#hst-compact').prop('checked', !!s.compactMode);
}

// Called after any setting that changes what the model is told or what the card shows.
function refreshAll() {
    updatePromptInjection();
    renderAll();
}

// ─── Quick panel ───

function sparkline(values) {
    const W = 300, H = 84, PAD = 8;
    if (!values.length) return '<div class="hst-empty">No boards in this chat yet.</div>';
    const x = (i) => (values.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (values.length - 1));
    const y = (v) => PAD + ((LIMITS.heart[1] - v) * (H - PAD * 2)) / (LIMITS.heart[1] - LIMITS.heart[0]);
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const last = values.length - 1;
    return `<svg class="hst-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <line class="hst-spark-zero" x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>
        ${values.length > 1 ? `<polyline class="hst-spark-line" points="${pts}"/>` : ''}
        <circle class="hst-spark-dot" cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="3.5"/>
    </svg>`;
}

// `pct` (0–100) is optional: when given, the chip also carries a small bar that themed
// panels (Racing, Idol Stage) draw as a stat bar / light stick. Other themes hide it.
function chip(key, label, value, color, pct = null) {
    const p = pct === null || pct === undefined ? null : Math.min(100, Math.max(0, pct));
    const bar = p === null ? '' : '<span class="hst-chip-bar"><i></i></span>';
    return `<div class="hst-chip" data-stat="${key}" style="--sc:${color};${p === null ? '' : `--p:${p};`}"><small>${label}</small><b>${value === null || value === undefined ? '—' : value}</b>${bar}</div>`;
}

function inputRow(id, label, value, [min, max]) {
    return `<label class="hst-ov-row"><span>${label}</span>
        <input id="${id}" type="number" class="text_pole" min="${min}" max="${max}" placeholder="${min} – ${max}" value="${value ?? ''}"></label>`;
}

function readNumber(id, range) {
    const raw = $(id).val();
    if (raw === '' || raw === undefined) return null;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return null;
    return Math.min(range[1], Math.max(range[0], Math.round(n)));
}

function closePanel() {
    $('#hst-modal').remove();
}

function showPanel() {
    closePanel();
    const s = getSettings();
    const chat = getChat();
    const history = collectHistory(chat);
    const idx = lastBoardIndex(chat);
    const latest = idx >= 0 ? dataOf(chat[idx]) : null;
    const pending = getActiveOverride(chat);
    const shown = pending || latest || {};

    const chips = latest
        ? [
            chip('trust', 'Trust', latest.trust, STAT_COLORS.trust, latest.trust ?? 0),
            chip('arousal', 'Arousal', latest.arousal, STAT_COLORS.arousal, latest.arousal ?? 0),
            chip('jealousy', 'Jealousy', latest.jealousy, STAT_COLORS.jealousy, latest.jealousy ?? 0),
            chip('heart', 'Heart', latest.heart === null ? null : `${latest.heart} (${latest.pct}%)`, '#ff4d6d'),
        ].join('')
        : '';

    const html = `
<div id="hst-modal" class="hst-modal" data-hst-theme="${normalizeTheme(s.theme)}">
  <div class="hst-modal-box">
    <div class="hst-modal-head"><b>💗 Heart Status</b><span class="hst-modal-close" title="Close">✕</span></div>
    ${latest ? `<div class="hst-modal-rel">${escapeHtml(latest.relationship) || '—'}</div>` : ''}
    <div class="hst-hero">
      <div class="hst-hero-ring" aria-hidden="true"><div class="hst-hero-core"><b>${latest && latest.heart !== null ? latest.heart : '—'}</b><small>Heart score</small></div></div>
      <div class="hst-chips">${chips}</div>
    </div>
    <div class="hst-section">Heart Score history${history.length ? ` (last ${history.length})` : ''}</div>
    ${sparkline(history.map(h => h.data.heart).filter(v => v !== null))}
    <div class="hst-section">Adjust values for the next reply
      ${pending ? '<span class="hst-badge-pending">pending</span>' : ''}</div>
    <div class="hst-hint">Leave a field empty to keep it. The model is told once and the adjustment expires when the next board appears.</div>
    <div class="hst-ov-grid">
      ${inputRow('hst-ov-trust', 'Trust', shown.trust, LIMITS.trust)}
      ${inputRow('hst-ov-arousal', 'Arousal', shown.arousal, LIMITS.arousal)}
      ${inputRow('hst-ov-jealousy', 'Jealousy', shown.jealousy, LIMITS.jealousy)}
      ${inputRow('hst-ov-heart', 'Heart Score', shown.heart, LIMITS.heart)}
    </div>
    <div class="hst-buttons">
      <button id="hst-ov-apply" class="menu_button">Apply to next reply</button>
      <button id="hst-ov-clear" class="menu_button"${pending ? '' : ' disabled'}>Clear adjustment</button>
    </div>
  </div>
</div>`;
    $('body').append(html);

    $('#hst-modal').on('click', (e) => { if (e.target.id === 'hst-modal') closePanel(); });
    $('#hst-modal .hst-modal-close').on('click', closePanel);

    $('#hst-ov-apply').on('click', () => {
        const values = {
            trust: readNumber('#hst-ov-trust', LIMITS.trust),
            arousal: readNumber('#hst-ov-arousal', LIMITS.arousal),
            jealousy: readNumber('#hst-ov-jealousy', LIMITS.jealousy),
            heart: readNumber('#hst-ov-heart', LIMITS.heart),
        };
        if (Object.values(values).every(v => v === null)) {
            notify('Enter at least one value.', 'warning');
            return;
        }
        // Only keep what actually differs from the current board, so an untouched field is not "forced".
        if (latest) {
            for (const k of Object.keys(values)) if (values[k] === latest[k]) values[k] = null;
        }
        if (Object.values(values).every(v => v === null)) {
            notify('Those are already the current values.', 'info');
            return;
        }
        if (!setOverride(values)) {
            notify('Could not save the adjustment for this chat.', 'error');
            return;
        }
        updatePromptInjection();
        notify('Adjustment saved. It goes out with your next message.', 'success');
        closePanel();
    });

    $('#hst-ov-clear').on('click', () => {
        clearOverride();
        updatePromptInjection();
        notify('Adjustment cleared.', 'info');
        closePanel();
    });
}

// ─── Setup ───

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
            <label class="checkbox_label"><input type="checkbox" id="hst-enabled"><span>Enable</span></label>
            <label class="checkbox_label"><input type="checkbox" id="hst-notify"><span>Notify on big changes</span></label>
            <div class="hst-row" title="Toast when Trust, Arousal, Jealousy or the Heart Score percentage moves by at least this many points">
                <label for="hst-threshold">Notify threshold</label>
                <input type="number" id="hst-threshold" class="text_pole" min="1" max="100">
            </div>
            <hr>
            <label class="checkbox_label" title="If off, the board is tracked but nothing shows in the chat at all."><input type="checkbox" id="hst-show-in-chat"><span>Show in chat (as a card)</span></label>
            <label class="checkbox_label" title="If off, the raw <info_board> text stays in the message (e.g. visible while editing) instead of being erased."><input type="checkbox" id="hst-strip"><span>Remove board from message</span></label>
            <hr>
            <div class="hst-row">
                <label for="hst-theme">Theme</label>
                <select id="hst-theme" class="text_pole">${themeOptions}</select>
            </div>
            <label class="checkbox_label" title="Show a one-row mini card (small ring, name, inline stats) — tap it to expand location/thought/goal."><input type="checkbox" id="hst-compact"><span>Compact card (mini row, tap to expand)</span></label>
            <div class="hst-row" title="Whether a card starts expanded or collapsed. You can still click any card's summary line to open/close it by hand either way.">
                <label for="hst-open-mode">Card open state</label>
                <select id="hst-open-mode" class="text_pole">${openModeOptions}</select>
            </div>
        </div>
    </div>
</div>`;
        $('#extensions_settings2').append(html);

        // Wand menu entry (the menu is built asynchronously, so retry until it exists).
        const registerWandItem = (attempt = 0) => {
            if ($('#hst_wand_open').length > 0) return;
            const menu = $('#extensionsMenu');
            if (menu.length === 0) {
                if (attempt < 30) setTimeout(() => registerWandItem(attempt + 1), 400);
                return;
            }
            const item = $(`
                <div id="hst_wand_open" class="list-group-item flex-container flexGap5 interactable" tabindex="0" title="Heart Status — panel">
                    <div class="fa-solid fa-heart-pulse extensionsMenuExtensionButton"></div>
                    <span>Heart Status</span>
                </div>`);
            menu.append(item);
            item.on('click', () => { menu.hide(); showPanel(); });
        };
        registerWandItem();

        // ── Events ──
        const save = () => saveSettingsDebounced();

        $('#hst-enabled').on('change', function () {
            getSettings().isEnabled = this.checked;
            save();
            if (!this.checked) removeCards();
            refreshAll();
        });
        $('#hst-notify').on('change', function () { getSettings().showNotifications = this.checked; save(); });
        $('#hst-threshold').on('change', function () {
            const v = parseInt(this.value, 10);
            getSettings().notifyThreshold = Number.isFinite(v) ? Math.min(100, Math.max(1, v)) : 15;
            this.value = getSettings().notifyThreshold;
            save();
        });
        $('#hst-theme').on('change', function () { setTheme(this.value); });
        $('#hst-open-mode').on('change', function () {
            getSettings().openMode = normalizeOpenMode(this.value);
            save();
            refreshAll();
        });
        $('#hst-show-in-chat').on('change', function () { getSettings().showInChat = this.checked; save(); refreshAll(); });
        $('#hst-strip').on('change', function () {
            getSettings().stripFromMessage = this.checked;
            save();
            if (this.checked) captureAll();
        });
        $('#hst-compact').on('change', function () { getSettings().compactMode = this.checked; save(); refreshAll(); });

        syncUI();
    } catch (error) {
        console.error('[Heart Status] setupUI error:', error);
    }
}
