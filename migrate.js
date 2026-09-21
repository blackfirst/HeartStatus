// ═══════════════════════════════════════════
// MIGRATE — turns off the old "Heart Status" kit for people upgrading to this
// extension, so they don't end up with double instructions and double boards.
// ═══════════════════════════════════════════
//
// This runs once (guarded by a flag in extension_settings) per install. It only
// ever *disables* things — it never deletes a script or edits arbitrary prompt
// text, since that risks corrupting something the user still wants.

import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';
import { extensionName } from './config.js';
import { getContextSafe } from './state.js';
import { notify } from './notifications.js';

const MIGRATION_FLAG = 'migratedFromOldKit';
// Matches the regex script's own name, e.g. "💗 [Heart Status] FIX".
const OLD_SCRIPT_NAME_RE = /heart\s*status/i;

function disableMatchingScripts(list) {
    if (!Array.isArray(list)) return 0;
    let n = 0;
    for (const script of list) {
        if (!script || script.disabled) continue;
        const name = script.scriptName || script.name || '';
        if (OLD_SCRIPT_NAME_RE.test(name)) {
            script.disabled = true;
            n++;
        }
    }
    return n;
}

export function migrateFromOldKit() {
    try {
        const s = extension_settings[extensionName];
        if (!s || s[MIGRATION_FLAG]) return; // already handled

        let disabledCount = 0;
        // Global regex scripts (Extensions → Regex, "Global" scope).
        disabledCount += disableMatchingScripts(extension_settings?.regex);

        // Some setups keep character-scoped scripts on the character card itself.
        const ctx = getContextSafe();
        const charScripts = ctx?.characters?.[ctx.characterId]?.data?.extensions?.regex_scripts;
        disabledCount += disableMatchingScripts(charScripts);

        s[MIGRATION_FLAG] = true;
        try { saveSettingsDebounced(); } catch (e) { /* ignore */ }

        if (disabledCount > 0) {
            notify(
                `Disabled ${disabledCount} old "Heart Status" regex script(s) — this extension replaces them. Double-check under Extensions → Regex.`,
                'info',
            );
        }

        // The old prompt instruction lives inside your own preset / author's note,
        // which this extension can't safely search-and-edit on its own — a manual
        // check is the only safe option here.
        notify(
            'If you used the old Heart Status prompt kit, remove its "info-board" instruction from your preset or author\'s note — this extension injects its own, and having both confuses the model.',
            'info',
        );
    } catch (error) {
        // A failed migration attempt should never break the extension itself.
    }
}
