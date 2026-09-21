// ═══════════════════════════════════════════
// CONFIG — constants and default settings
// ═══════════════════════════════════════════

export const extensionName = 'heart-status';

// Must match manifest.json's "version" — bump both together on release.
// updater.js compares this against the live manifest.json to detect a stale page.
export const EXTENSION_VERSION = '1.0.2';

// Key used to store the manual adjustment inside chat metadata (per chat).
export const META_KEY = 'heart_status_override';

export const defaultSettings = {
    // Master switch ("Enable prompt"). ON: the board instruction is injected so the AI
    // writes a board on every reply. OFF: the extension does nothing at all — no prompt
    // is sent, no styled board is drawn, the quick panel is hidden, and any board already in the
    // chat is left exactly as the model wrote it.
    isEnabled: true,
    // "Enable Theme". ON: the board is drawn styled with the theme. OFF: the plain board text is shown
    // as-is. Only matters while isEnabled is on (the prompt is sent either way).
    cardEnabled: true,
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
    // (The old 'auto' mode was removed; saved 'auto' values are converted to 'always'.)
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
