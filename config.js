// ═══════════════════════════════════════════
// CONFIG — constants and default settings
// ═══════════════════════════════════════════

export const extensionName = 'heart-status';

// Key used to store the manual adjustment inside chat metadata (per chat).
export const META_KEY = 'heart_status_override';

export const defaultSettings = {
    isEnabled: true,
    // Toast when a stat jumps by at least `notifyThreshold` points (0–100 scale).
    showNotifications: true,
    notifyThreshold: 15,
    // 'dark-red' | 'white-pink'
    theme: 'dark-red',
    // Show the board as a card under the message. If off, nothing is shown in the
    // chat for it at all (stats are still tracked either way).
    showInChat: true,
    // Erase the raw <info_board>...</info_board> text from the message (and
    // its active swipe) once a reply finishes, keeping the parsed values in
    // msg.extra.heartStatus instead. If off, the raw board stays in the message
    // text (e.g. visible while editing) and is simply hidden/replaced on display.
    stripFromMessage: false,
    // Show a one-row mini card (small ring, name, inline stats) with a tap-to-expand
    // detail panel for location/thought/goal, instead of the full card every time.
    compactMode: false,
    // Whether a card starts expanded or collapsed:
    // 'always' — every card starts expanded, always (default).
    // 'never'  — every card starts collapsed to the "💗 Name's Status" summary line.
    // This only sets the STARTING state — the person can still click any card's summary
    // to open/close it by hand regardless of this setting.
    // (The old 'auto' mode was removed; saved 'auto' values are converted to 'always'.)
    openMode: 'always',
    // Remove older boards from the prompt sent to the model (the latest one stays as a format example).
    trimOldBoards: true,
};

export const OPEN_MODES = [
    { id: 'always', label: 'Always open' },
    { id: 'never', label: 'Always collapsed' },
];

export function normalizeOpenMode(id) {
    return OPEN_MODES.some(m => m.id === id) ? id : 'always';
}

export const THEMES = [
    { id: 'dark-red', label: 'Dark', color: '#ff3650' },
    { id: 'white-pink', label: 'Light', color: '#ff6f9c' },
];

const DEFAULT_THEME = 'dark-red';

export function normalizeTheme(id) {
    return THEMES.some(t => t.id === id) ? id : DEFAULT_THEME;
}

// Value ranges used by the prompt, the parser and the card.
export const LIMITS = {
    trust: [0, 100],
    arousal: [0, 100],
    jealousy: [0, 100],
    heart: [-1000, 1000],
};

// Stat accent colours (same on every theme).
export const STAT_COLORS = {
    trust: '#d9a441',
    arousal: '#ff4d6d',
    jealousy: '#ff8a3d',
};

// Ring colour follows the Heart Score percentage (0 = -1000, 100 = +1000):
// cold blue-grey when the relationship is strained, warming through violet and pink
// to red, then gold at the very top. Same on every theme.
const HEART_COLOR_STOPS = [
    [0,   [95, 126, 168]],
    [25,  [143, 127, 192]],
    [50,  [224, 105, 154]],
    [75,  [255, 61, 110]],
    [100, [255, 176, 32]],
];

export function heartColor(pct) {
    const p = Math.min(100, Math.max(0, Number(pct)));
    if (!Number.isFinite(p)) return null;
    let i = 0;
    while (i < HEART_COLOR_STOPS.length - 2 && p > HEART_COLOR_STOPS[i + 1][0]) i++;
    const [p0, c0] = HEART_COLOR_STOPS[i];
    const [p1, c1] = HEART_COLOR_STOPS[i + 1];
    const t = (p - p0) / (p1 - p0);
    const rgb = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
    const hex = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    return { hex, rgb: rgb.join(',') };
}
