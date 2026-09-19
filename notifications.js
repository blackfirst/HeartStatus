// ═══════════════════════════════════════════
// NOTIFICATIONS — toasts (SillyTavern ships toastr)
// ═══════════════════════════════════════════

export function notify(message, type = 'info') {
    try {
        if (typeof toastr !== 'undefined' && typeof toastr[type] === 'function') {
            toastr[type](message, 'Heart Status', { timeOut: 6000, escapeHtml: false });
        }
    } catch (e) { /* toasts are cosmetic */ }
}
