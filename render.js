// ═══════════════════════════════════════════
// RENDER — builds the status card HTML
// ═══════════════════════════════════════════

import { STAT_COLORS, normalizeTheme } from './config.js';

const RING_LENGTH = 603; // circumference of the r=96 ring

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function fmt(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Change indicators (▲/▼) are turned off — always render nothing.
function deltaHtml() {
    return '';
}

function statTile(key, icon, label, value, delta) {
    const pct = value === null ? 0 : clamp(value, 0, 100);
    return `<div class="hst-stat" style="--sc:${STAT_COLORS[key]};">
        <div class="hst-badge">${icon}</div>
        <small>${label}</small><br>
        <b>${fmt(value)}</b>${deltaHtml(delta)}
        <div class="hst-stat-bar"><div class="hst-stat-bar-fill" style="width:${pct}%;"></div></div>
    </div>`;
}

function dtTile(icon, label, value) {
    return `<div class="hst-dt">
        <div class="hst-dt-icon">${icon}</div>
        <div class="hst-dt-body"><span class="hst-dt-label">${label}</span><span class="hst-dt-value">${escapeHtml(value) || '—'}</span></div>
    </div>`;
}

function infoRow(cls, label, value) {
    return `<div class="hst-info ${cls}"><div class="hst-info-label">${label}</div><div class="hst-info-value">${value}</div></div>`;
}


/**
 * @param {object} data   parsed board (see parser.js)
 * @param {object} opts   { name, theme, open, showArousal, showJealousy, deltas }
 */
export function buildCardHtml(data, opts = {}) {
    const theme = normalizeTheme(opts.theme);
    const name = escapeHtml(opts.name || '');
    const deltas = opts.deltas || {};
    const showArousal = opts.showArousal !== false && data.arousal !== null;
    const showJealousy = opts.showJealousy !== false && data.jealousy !== null;

    const ringPct = data.pct === null ? 0 : clamp(data.pct, 0, 100);
    const dashOffset = (RING_LENGTH - (RING_LENGTH * ringPct) / 100).toFixed(1);

    const tiles = [statTile('trust', '🤝', 'Trust', data.trust, deltas.trust)];
    if (showArousal) tiles.push(statTile('arousal', '💓', 'Arousal', data.arousal, deltas.arousal));
    if (showJealousy) tiles.push(statTile('jealousy', '🔥', 'Jealousy', data.jealousy, deltas.jealousy));

    const thought = data.thought ? `“${escapeHtml(data.thought)}”` : '—';

    return `<details class="hst-wrap" data-hst-theme="${theme}"${opts.open === false ? '' : ' open'}>
<summary>💗 ${name ? `${name}'s Status` : 'Status'}</summary>
<div class="hst-card">
  <div>
    <div class="hst-eyebrow"><span>✦ Status Monitor</span></div>
    <div class="hst-namerow">
      <b class="hst-name">${name || 'Status'}</b>
      ${data.relationship ? `<span class="hst-pill">${escapeHtml(data.relationship)}</span>` : ''}
    </div>
  </div>
  <div class="hst-divider"></div>
  <div class="hst-center">
    <div class="hst-ringbox">
      <svg class="hst-ringsvg" width="220" height="220" viewBox="0 0 220 220">
        <circle cx="110" cy="110" r="96" fill="none" class="hst-ring-track" stroke-width="13"/>
        <circle class="hst-ring-rotate" cx="110" cy="110" r="96" fill="none" stroke-width="13" stroke-linecap="round" stroke-dasharray="${RING_LENGTH}" stroke-dashoffset="${dashOffset}"/>
      </svg>
      <div class="hst-pulse-wrap">
        <b class="hst-score">${fmt(data.heart)}</b>${deltaHtml(deltas.heart)}
        <span class="hst-ring-label">Heart Score</span>
        <svg class="hst-ecg" width="90" height="22" viewBox="0 0 200 22">
          <path class="hst-ecg-path" d="M0,11 L60,11 L70,2 L80,20 L90,11 L120,11 L130,4 L140,18 L150,11 L200,11" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="hst-affbar"><div class="hst-affbar-fill" style="width:${ringPct}%;"></div></div>
    <div class="hst-affbar-label">Affection ${fmt(data.pct)}%</div>
  </div>
  <div class="hst-divider"></div>
  <div class="hst-dt-grid">
    ${dtTile('🗓️', 'Date', data.date)}
    ${dtTile('⏰', 'Time', data.time)}
  </div>
  <div class="hst-stats" style="--cols:${tiles.length};">${tiles.join('')}</div>
  ${infoRow('loc', '📍 Location', escapeHtml(data.location) || '—')}
  ${infoRow('thought', '💭 Thoughts', thought)}
  ${infoRow('goal', '🏆 Goal', escapeHtml(data.goal) || '—')}
</div>
</details>`;
}
