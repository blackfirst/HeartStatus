// ═══════════════════════════════════════════
// RENDER — builds the status card HTML
// ═══════════════════════════════════════════

import { STAT_COLORS, normalizeTheme } from './config.js';
import { derivePct } from './parser.js';

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

function statTile(key, icon, label, value) {
    const pct = value === null ? 0 : clamp(value, 0, 100);
    // data-stat and --p are hooks for themes that restyle the bar (e.g. Idol Stage draws it
    // as a vertical light stick, Angel fills a circular gauge from --p on the tile). Other themes ignore
    // them and keep using the width.
    return `<div class="hst-stat" data-stat="${key}" style="--sc:${STAT_COLORS[key]};--p:${pct};">
        <div class="hst-badge">${icon}</div>
        <small>${label}</small><br>
        <b>${fmt(value)}</b>
        <div class="hst-stat-bar"><div class="hst-stat-bar-fill" style="width:${pct}%;--p:${pct};"></div></div>
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

// Shared by both layouts: the stat tiles grid + the three info rows.
function statsAndInfoHtml(tiles, data, thought) {
    return `<div class="hst-stats" style="--cols:${tiles.length};">${tiles.join('')}</div>
  ${infoRow('loc', '📍 Location', escapeHtml(data.location) || '—')}
  ${infoRow('thought', '💭 Thoughts', thought)}
  ${infoRow('goal', '🏆 Goal', escapeHtml(data.goal) || '—')}`;
}

// One-line inline readout used in the compact row, e.g. "🤝 62 · 💓 40 · 🔥 12".
function miniStatsInline(data) {
    const parts = [`🤝 ${fmt(data.trust)}`];
    if (data.arousal !== null) parts.push(`💓 ${fmt(data.arousal)}`);
    if (data.jealousy !== null) parts.push(`🔥 ${fmt(data.jealousy)}`);
    return parts.join(' · ');
}

/**
 * @param {object} data   parsed board (see parser.js)
 * @param {object} opts   { name, theme, open, compact }
 */
export function buildCardHtml(data, opts = {}) {
    const theme = normalizeTheme(opts.theme);
    const name = escapeHtml(opts.name || '');

    // The ring is always a full circle. The Affection bar and label are worked out from the
    // Heart Score shown in the middle (a percentage the model wrote itself is ignored).
    const shownPct = data.heart === null ? data.pct : derivePct(data.heart);
    const ringPct = shownPct === null ? 0 : clamp(shownPct, 0, 100);

    const tiles = [statTile('trust', '🤝', 'Trust', data.trust)];
    if (data.arousal !== null) tiles.push(statTile('arousal', '💓', 'Arousal', data.arousal));
    if (data.jealousy !== null) tiles.push(statTile('jealousy', '🔥', 'Jealousy', data.jealousy));

    const thought = data.thought ? `“${escapeHtml(data.thought)}”` : '—';

    const body = opts.compact
        ? `<details class="hst-mini">
    <summary class="hst-mini-row">
      <span class="hst-mini-ring">
        <svg viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="96" fill="none" class="hst-ring-track" stroke-width="20"/>
          <circle class="hst-ring-rotate" cx="110" cy="110" r="96" fill="none" stroke-width="20" stroke-linecap="round"/>
        </svg>
        <span class="hst-mini-score">${fmt(data.heart)}</span>
      </span>
      <span class="hst-mini-mid">
        <b class="hst-mini-name">${name || 'Status'}</b>
        ${data.relationship ? `<span class="hst-mini-rel-label">${escapeHtml(data.relationship)}</span>` : ''}
        <span class="hst-mini-stats-inline">${miniStatsInline(data)}</span>
      </span>
      <span class="hst-mini-chev" aria-hidden="true">▾</span>
    </summary>
    <div class="hst-mini-body">
      ${statsAndInfoHtml(tiles, data, thought)}
    </div>
  </details>`
        : `<div>
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
        <circle class="hst-ring-rotate" cx="110" cy="110" r="96" fill="none" stroke-width="13" stroke-linecap="round"/>
      </svg>
      <div class="hst-pulse-wrap">
        <b class="hst-score">${fmt(data.heart)}</b>
        <span class="hst-ring-label">Heart Score</span>
        <svg class="hst-ecg" width="90" height="22" viewBox="0 0 200 22">
          <path class="hst-ecg-path" d="M0,11 L60,11 L70,2 L80,20 L90,11 L120,11 L130,4 L140,18 L150,11 L200,11" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="hst-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
      </div>
    </div>
    <div class="hst-affbar"><div class="hst-affbar-fill" style="width:${ringPct}%;"></div></div>
    <div class="hst-affbar-label">Affection ${fmt(shownPct)}%</div>
  </div>
  <div class="hst-divider"></div>
  <div class="hst-dt-grid">
    ${dtTile('🗓️', 'Date', data.date)}
    ${dtTile('⏰', 'Time', data.time)}
  </div>
  ${statsAndInfoHtml(tiles, data, thought)}`;

    const outerSummary = opts.compact
        ? `<summary class="hst-wrap-summary-none"></summary>`
        : `<summary>💗 ${name ? `${name}'s Status` : 'Status'}</summary>`;
    const outerOpen = opts.compact ? true : opts.open !== false;

    return `<details class="hst-wrap" data-hst-theme="${theme}"${outerOpen ? ' open' : ''}>
${outerSummary}
<div class="hst-card${opts.compact ? ' hst-compact' : ''}">
  ${body}
</div>
</details>`;
}
