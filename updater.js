// ═══════════════════════════════════════════
// UPDATER — forces a page reload after the extension is updated
// ═══════════════════════════════════════════
//
// After an update the files on disk are new, but a page that is already open (or one
// whose browser cached the old scripts) keeps running the OLD code until it is reloaded.
// On load — and again on every chat change — we read manifest.json fresh from the server
// (bypassing the cache) and compare its version with EXTENSION_VERSION baked into the code
// that is actually running. A mismatch means the code is stale, so the page is reloaded.
//
// A sessionStorage guard makes sure this reloads at most once per new version, so a
// browser that keeps serving stale files can never get stuck in a reload loop.

import { EXTENSION_VERSION } from './config.js';
import { reportError } from './diagnostics.js';

const GUARD_KEY = 'heart-status:reloaded-for';

export async function reloadIfUpdated() {
    try {
        const url = new URL('manifest.json', import.meta.url);
        url.searchParams.set('_', String(Date.now()));
        const res = await fetch(url.href, { cache: 'no-store' });
        if (!res.ok) return false;
        const latest = String((await res.json())?.version || '').trim();
        if (!latest) return false;

        if (latest === EXTENSION_VERSION) {
            try { sessionStorage.removeItem(GUARD_KEY); } catch (e) { /* ignore */ }
            return false;
        }

        // Already reloaded once for this version and still stale: give up quietly.
        try {
            if (sessionStorage.getItem(GUARD_KEY) === latest) return false;
            sessionStorage.setItem(GUARD_KEY, latest);
        } catch (e) { /* storage blocked: reload anyway, once per page load */ }

        console.info(`[Heart Status] Updated ${EXTENSION_VERSION} → ${latest}, reloading page.`);
        location.reload();
        return true;
    } catch (error) {
        reportError('[Heart Status] update check failed:', error);
        return false;
    }
}
