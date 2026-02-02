/* =========================================
   ELOGY – Cart badge (Pasul 4)
   - update live din cartStore
   - fără dependințe, fără conflicte cu drawer-ul meniului
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function formatCount(n) {
    const v = Number(n) || 0;
    if (v > 99) return "99+";
    return String(v);
  }

  function applyCount(count) {
    const links = qsa("[data-cart-link]");
    const badges = qsa("[data-cart-badge]");

    const hasItems = count > 0;

    badges.forEach((b) => {
      b.textContent = formatCount(count);
      b.hidden = !hasItems;
    });

    // A11y: aria-label + title
    links.forEach((a) => {
      const base = "Coș";
      const label = hasItems ? `${base} (${count} ${count === 1 ? "produs" : "produse"})` : base;
      a.setAttribute("aria-label", label);
      a.setAttribute("title", label);
    });
  }

  function init() {
    // Dacă nu există icon de coș în pagină, ieșim
    if (!document.querySelector("[data-cart-link]")) return;

    const store = NS.cartStore;
    if (!store || typeof store.subscribe !== "function") {
      // Pagina nu a încărcat cartStore – nu crăpăm, doar nu afișăm badge.
      applyCount(0);
      return;
    }

    store.subscribe((state) => {
      const count = state && Array.isArray(state.items) ? state.items.length : 0;
      applyCount(count);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
