// ═══════════════════════════════════════════
// CONFIG — constants and default settings
// ═══════════════════════════════════════════

export const extensionName = 'heart-status';

// Must match manifest.json's "version" — bump both together on release.
// updater.js compares this against the live manifest.json to detect a stale page.
export const EXTENSION_VERSION = '1.0.1';

export const defaultSettings = {
    // Master switch ("Enable prompt"). ON: the board instruction is injected so the AI
    // writes a board on every reply. OFF: the extension does nothing at all — no prompt
    // is sent, and any board already in the
    // chat is left exactly as the model wrote it.
    isEnabled: true,
    // "Enable Theme". ON: the board is drawn styled with the theme. OFF: the plain board text is shown
    // as-is. Only matters while isEnabled is on (the prompt is sent either way).
    boardEnabled: true,
    // 'dark-red' | 'white-pink' | 'racing-dark' | 'racing-light' | 'idol-night' | 'idol-day'
    theme: 'dark-red',
    // Show a one-row mini board (small ring, name, inline stats) with a tap-to-expand
    // detail panel for location/thought/goal, instead of the full board every time.
    compactMode: false,
    // Whether a board starts expanded or collapsed:
    // 'always' — every board starts expanded, always (default).
    // 'never'  — every board starts collapsed to the "💗 Name's Status" summary line.
    // This only sets the STARTING state — the person can still click any board's summary
    // to open/close it by hand regardless of this setting.
    openMode: 'always',
};

export const OPEN_MODES = [
    { id: 'always', label: 'Open' },
    { id: 'never', label: 'Collapsed' },
];

export function normalizeOpenMode(id) {
    return OPEN_MODES.some(m => m.id === id) ? id : 'always';
}

export const THEMES = [
    // Dark side and Light side are listed in the same order, so each column is an opposite pair.
    { id: 'dark-red',      label: 'Dark',             short: 'Dark',       side: 'dark' },
    { id: 'racing-dark',   label: 'Racing (Dark)',    short: 'Racing',     side: 'dark' },
    { id: 'idol-night',    label: 'Idol Stage (Night)', short: 'Idol Stage', side: 'dark' },
    { id: 'library-night', label: 'Library (Night)',  short: 'Library',    side: 'dark' },
    { id: 'demons',        label: 'Demons',           short: 'Demons',     side: 'dark' },
    { id: 'white-pink',    label: 'Light',            short: 'Light',      side: 'light' },
    { id: 'racing-light',  label: 'Racing (Light)',   short: 'Racing',     side: 'light' },
    { id: 'idol-day',      label: 'Idol Stage (Day)', short: 'Idol Stage', side: 'light' },
    { id: 'library-day',   label: 'Library (Day)',    short: 'Library',    side: 'light' },
    { id: 'gods',          label: 'Gods',             short: 'Gods',       side: 'light' },
];

export const THEME_SIDES = [
    { id: 'dark',  label: 'Dark' },
    { id: 'light', label: 'Light' },
];

// Colours used to draw each theme's preview tile in the settings drawer: [background 1, background 2, accent 1, accent 2].
export const THEME_SWATCHES = {
    'dark-red':      ['#170c0d', '#0b0b0c', '#ff3650', '#b061ff'],
    'white-pink':    ['#fff6f8', '#ffffff', '#ff6f9c', '#ffd1e0'],
    'racing-dark':   ['#14100a', '#0a0a0b', '#e10600', '#ffcc00'],
    'racing-light':  ['#fff8f0', '#ffffff', '#e10600', '#ff9d00'],
    'idol-night':    ['#1d1035', '#0b0716', '#ff4fa3', '#ffd84d'],
    'idol-day':      ['#fff0f7', '#ffffff', '#e8388a', '#e9a400'],
    'library-night': ['#2a2015', '#150f0a', '#c99a4a', '#e0b563'],
    'library-day':   ['#fdf6e6', '#f4ead2', '#b5822b', '#d9a441'],
    'demons':        ['#2a0508', '#050203', '#e0243f', '#ff6b6b'],
    'gods':          ['#fffbee', '#ffffff', '#c8a03c', '#f3e2a4'],
};

const DEFAULT_THEME = 'dark-red';

export function normalizeTheme(id) {
    return THEMES.some(t => t.id === id) ? id : DEFAULT_THEME;
}

// Value ranges used by the prompt, the parser and the board.
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
