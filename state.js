// ═══════════════════════════════════════════
// STATE — settings and chat access
// ═══════════════════════════════════════════

import { extension_settings } from '../../../extensions.js';
import { extensionName } from './config.js';

export function getSettings() {
    return extension_settings[extensionName];
}

export function getContextSafe() {
    try {
        return SillyTavern.getContext();
    } catch (e) {
        return null;
    }
}

export function getChat() {
    return getContextSafe()?.chat || [];
}
