// ═══════════════════════════════════════════
// CONFIG — constants and default settings
// ═══════════════════════════════════════════

export const extensionName = 'heart-status';

// Must match manifest.json's "version" — bump both together on release.
// updater.js compares this against the live manifest.json to detect a stale page.
export const EXTENSION_VERSION = '1.0.0';

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
    { id: 'always', label: 'Always open' },
    { id: 'never', label: 'Always collapsed' },
];

export function normalizeOpenMode(id) {
    return OPEN_MODES.some(m => m.id === id) ? id : 'always';
}

export const THEMES = [
    { id: 'dark-red', label: 'Dark' },
    { id: 'white-pink', label: 'Light' },
    { id: 'racing-dark', label: 'Racing (Dark)' },
    { id: 'racing-light', label: 'Racing (Light)' },
    { id: 'idol-night', label: 'Idol Stage (Night)' },
    { id: 'idol-day', label: 'Idol Stage (Day)' },
    { id: 'library-night', label: 'Library (Night)' },
    { id: 'library-day', label: 'Library (Day)' },
    { id: 'demons', label: 'Demons' },
    { id: 'gods', label: 'Gods' },
];

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
