// ═══════════════════════════════════════════
// DOM — swaps the rendered raw board for the card
// ═══════════════════════════════════════════
//
// SillyTavern turns the model's text into HTML before we see it, and what the
// <info_board> block looks like at that point depends on the markdown renderer
// and sanitizer. Typical results:
//   A) <p><info_board></info_board></p><pre><code>…board…</code></pre><p></p>
//   B) <info_board><pre><code>…board…</code></pre></info_board>
//   C) <pre><code>…board…</code></pre>   (unknown tag stripped)
//   D) <p>⏰ Time: … <br> 🤝 Trust: …</p>  (board written without a code fence)
// locateBoard() handles all four and returns the element to replace.

const isBoardText = (t) => /Trust\s*:/i.test(t) && /(Heart\s*Score|Goal)\s*:/i.test(t);

function isEmptyShell(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag !== 'p' && tag !== 'info_board') return false;
    if (el.textContent.trim()) return false;
    return !el.querySelector('img,video,audio,iframe,svg,canvas');
}

function locateBoard(root, rawLength) {
    // 1) A wrapper element that really contains the board.
    const wrappers = Array.from(root.querySelectorAll('info_board'));
    const holder = wrappers.find(w => isBoardText(w.textContent));
    wrappers.forEach(w => { if (w !== holder && isEmptyShell(w)) w.remove(); });
    if (holder) {
        wrappers.filter(w => w !== holder && isBoardText(w.textContent)).forEach(w => w.remove());
        // If the model forgot the closing </info_board> tag, the browser may have
        // folded the following roleplay text into this element too (unknown tags
        // don't auto-close). Prefer the fenced code block inside it, if there is
        // one, so we only ever swap out the board and never eat trailing story text.
        const innerPre = Array.from(holder.querySelectorAll('pre')).find(p => isBoardText(p.textContent));
        if (innerPre) return innerPre;
        const parent = holder.parentElement;
        if (parent && parent !== root && parent.tagName === 'P'
            && parent.textContent.trim() === holder.textContent.trim()) return parent;
        return holder;
    }

    // 2) A code block holding the board.
    const pres = Array.from(root.querySelectorAll('pre')).filter(p => isBoardText(p.textContent));
    if (pres.length) {
        pres.slice(1).forEach(p => p.remove());
        return pres[0];
    }

    // 3) Plain paragraphs: the deepest block that is (almost) only the board.
    const limit = (rawLength || 600) + 80;
    const candidates = Array.from(root.querySelectorAll('p, div, blockquote'))
        .filter(el => !el.closest('.hst-slot') && isBoardText(el.textContent) && el.textContent.length <= limit);
    const deepest = candidates.find(el => !candidates.some(o => o !== el && el.contains(o)));
    return deepest || null;
}

// Empty <p> shells left next to the board once it is replaced.
function sweepRemnants(slot) {
    for (const dir of ['previousElementSibling', 'nextElementSibling']) {
        let node = slot[dir];
        while (node && isEmptyShell(node)) {
            const next = node[dir];
            node.remove();
            node = next;
        }
    }
}

/**
 * Puts the card into a message. Returns true when the DOM changed.
 * `key` identifies the content; an unchanged key means nothing to do.
 */
export function mountCard(mesText, key, html, rawLength) {
    const existing = mesText.querySelector('.hst-slot');
    if (existing && existing.dataset.hstKey === key) return false;

    const slot = document.createElement('div');
    slot.className = 'hst-slot';
    slot.dataset.hstKey = key;
    slot.innerHTML = html;

    if (existing) {
        existing.replaceWith(slot);
        return true;
    }

    const target = locateBoard(mesText, rawLength);
    if (target) {
        target.replaceWith(slot);
        sweepRemnants(slot);
    } else {
        // Board text not found in the DOM (e.g. the tag was hidden by another extension).
        mesText.insertBefore(slot, mesText.firstChild);
    }
    return true;
}

export function removeCards(root = document) {
    root.querySelectorAll('.hst-slot').forEach(el => el.remove());
}

// Cards drawn by the OLD regex script share nothing with ours except intent.
export function hasLegacyCard(mesText) {
    return !!mesText.querySelector('details.hs-wrap');
}

export function setThemeEverywhere(theme) {
    document.querySelectorAll('details.hst-wrap').forEach(el => el.setAttribute('data-hst-theme', theme));
    document.querySelectorAll('.hst-swatch').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-hst-theme-id') === theme);
    });
}

// Lets anyone override the card/panel's look from the settings panel, without
// touching style.css. Injected as its own <style> tag so it always applies last
// (after style.css) and can be swapped out cleanly.
export function applyCustomCss(css) {
    let style = document.getElementById('hst-custom-css');
    if (!style) {
        style = document.createElement('style');
        style.id = 'hst-custom-css';
        document.head.appendChild(style);
    }
    style.textContent = typeof css === 'string' ? css : '';
}
