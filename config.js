// ═══════════════════════════════════════════
// CONFIG — constants and default settings
// ═══════════════════════════════════════════

export const extensionName = 'heart-status';

// Key used to store the manual adjustment inside chat metadata (per chat).
export const META_KEY = 'heart_status_override';

export const defaultSettings = {
    isEnabled: true,
    // 'dark-red' | 'white-pink' | 'racing-dark' | 'racing-light' | 'idol-night' | 'idol-day'
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
    trimOldBoards: false,
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
    { id: 'racing-dark', label: 'Racing (Dark)', color: '#e10600' },
    { id: 'racing-light', label: 'Racing (Light)', color: '#e10600' },
    { id: 'idol-night', label: 'Idol Stage (Night)', color: '#ff4fa3' },
    { id: 'idol-day', label: 'Idol Stage (Day)', color: '#e8388a' },
    { id: 'library-night', label: 'Library (Night)', color: '#c99a4a' },
    { id: 'library-day', label: 'Library (Day)', color: '#b5822b' },
    { id: 'demons', label: 'Demons', color: '#e0243f' },
    { id: 'gods', label: 'Gods', color: '#c8a03c' },
];

const DEFAULT_THEME = 'dark-red';

// Themes that were renamed keep working: a saved old id is mapped to its replacement.
const LEGACY_THEMES = { 'velvet-noir': 'demons', 'fallen-angel': 'demons', 'demon': 'demons', 'angel-gold': 'gods' };

export function normalizeTheme(id) {
    const mapped = LEGACY_THEMES[id] || id;
    return THEMES.some(t => t.id === mapped) ? mapped : DEFAULT_THEME;
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
