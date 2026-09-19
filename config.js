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
    // 'dark-red' | 'white-pink' | 'white-gold'
    theme: 'dark-red',
    // 'card' = replace the raw board with the status card, 'raw' = leave the model's text alone
    displayMode: 'card',
    // Older messages show their card collapsed; only the latest one is open.
    collapseOlder: true,
    // SFW switches: hide a stat everywhere (prompt, parser output and card).
    showArousal: true,
    showJealousy: true,
    // Remove older boards from the prompt sent to the model (the latest one stays as a format example).
    trimOldBoards: true,
};

export const THEMES = [
    { id: 'dark-red', label: 'Dark Red', color: '#ff3650' },
    { id: 'white-pink', label: 'White Pink', color: '#ff6f9c' },
    { id: 'white-gold', label: 'White Gold', color: '#c9962f' },
];

export const DEFAULT_THEME = 'dark-red';

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
