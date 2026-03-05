/* =========================================
   ELOGY – Mochetă catalog UI (Pasul 2)
   - render grid
   - tabs (all/rola/traversa)
   - destination chips (single-select)
   - click card => elogy:productselect (drawer)
   - NEW: pagination (max 6 / page)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const products = (NS.data && NS.data.mochetaProducts) ? NS.data.mochetaProducts : [];

  const PAGE_SIZE = 6;

  const formatRON = (NS.money && NS.money.formatRON)
    ? NS.money.formatRON
    : (n) => {
        const v = Number(n);
        const hasDecimals = Math.abs(v - Math.trunc(v)) > 0;
        return v.toLocaleString("ro-RO", {
          minimumFractionDigits: hasDecimals ? 2 : 0,
          maximumFractionDigits: hasDecimals ? 2 : 0
        }) + " lei";
      };

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function minTraversePrice(byWidth) {
    if (!Array.isArray(byWidth) || !byWidth.length) return null;
    let min = Infinity;
    byWidth.forEach((w) => {
      const v = Number(w.pricePerMl);
      if (Number.isFinite(v)) min = Math.min(min, v);
    });
    return min === Infinity ? null : min;
  }

  function matchesTab(p, tab) {
    if (tab === "all") return true;
    return p.subtype === tab;
  }

  function matchesDestination(p, dest) {
    if (dest === "all") return true;
    return Array.isArray(p.destination) && p.destination.includes(dest);
  }

  function mediaClass(variant) {
    if (variant === 2) return "media--grad-2";
    if (variant === 3) return "media--grad-3";
    return "media--grad-1";
  }

  function cardHTML(p) {
    const isRola = p.subtype === "rola";
    const isTraversa = p.subtype === "traversa";

    let priceLine = "";
    let priceSub = "";

    if (isRola) {
      priceLine = `${formatRON(p.pricePerSqm)} / mp`;
      priceSub = `Rolă – lățime fixă 4 m · Calcul la metru pătrat`;
    }

    if (isTraversa) {
      const min = minTraversePrice(p.byWidth);
      priceLine = min != null ? `de la ${formatRON(min)} / ml` : `Preț la metru liniar`;
      priceSub = `Traverse – preț la metru liniar (în funcție de lățime)`;
    }

    return `
      <button class="catalog-card" type="button" data-catalog-product="${p.id}">
        <div class="catalog-card__top">
          <div class="catalog-card__media media media--gradient ${mediaClass(p.mediaVariant)}" aria-hidden="true">
            <div class="media__surface"></div>
          </div>

          <div class="catalog-card__content">
            <h3 class="catalog-card__title">${escapeHTML(p.title)}</h3>
            ${p.short ? `<p class="catalog-card__desc">${escapeHTML(p.short)}</p>` : ""}
          </div>
        </div>

        <p class="catalog-card__price">${priceLine}</p>
        <p class="catalog-card__price-sub">${escapeHTML(priceSub)}</p>
      </button>
    `;
  }

  function setActiveTab(tab) {
    qsa("[data-catalog-tab]").forEach((btn) => {
      const isActive = btn.getAttribute("data-catalog-tab") === tab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function setActiveDestination(dest) {
    qsa("[data-catalog-destination]").forEach((btn) => {
      const isActive = btn.getAttribute("data-catalog-destination") === dest;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    });
  }

  function buildPagerHTML(totalPages, page) {
    if (totalPages <= 1) return "";

    const clamp = (n) => Math.max(1, Math.min(totalPages, n));
    page = clamp(page);

    const pages = new Set([1, totalPages, page, page - 1, page + 1]);
    const sorted = Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    const items = [];
    let prev = 0;
    sorted.forEach((p) => {
      if (prev && p - prev > 1) items.push(`<span class="pager__dots" aria-hidden="true">…</span>`);
      items.push(
        `<button class="pager__btn pager__page ${p === page ? "is-active" : ""}" type="button" data-page="${p}" aria-label="Pagina ${p}">
          ${p}
        </button>`
      );
      prev = p;
    });

    return `
      <nav class="catalog-pager" aria-label="Paginare catalog">
        <div class="catalog-pager__group">
          <button class="pager__btn" type="button" data-page-prev ${page <= 1 ? "disabled" : ""} aria-label="Pagina anterioară">←</button>
          ${items.join("")}
          <button class="pager__btn" type="button" data-page-next ${page >= totalPages ? "disabled" : ""} aria-label="Pagina următoare">→</button>
        </div>
      </nav>
    `;
  }

  function render(state, pagerEl) {
    const grid = qs("[data-catalog-grid]");
    const empty = qs("[data-catalog-empty]");
    const meta = qs("[data-catalog-meta]");
    if (!grid || !empty || !meta) return;

    const filtered = products
      .filter((p) => matchesTab(p, state.tab))
      .filter((p) => matchesDestination(p, state.destination));

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.max(1, Math.min(totalPages, state.page));

    meta.textContent = `${filtered.length} produse afișate`;

    if (!filtered.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    grid.innerHTML = pageItems.map(cardHTML).join("");
    empty.hidden = true;

    if (pagerEl) pagerEl.innerHTML = buildPagerHTML(totalPages, state.page);
  }

  function init() {
    const grid = qs("[data-catalog-grid]");
    if (!grid) return;

    const pagerEl = document.createElement("div");
    grid.insertAdjacentElement("afterend", pagerEl);

    const state = { tab: "all", destination: "all", page: 1 };

    qsa("[data-catalog-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.tab = btn.getAttribute("data-catalog-tab") || "all";
        state.page = 1;
        setActiveTab(state.tab);
        render(state, pagerEl);
      });
    });

    qsa("[data-catalog-destination]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.destination = btn.getAttribute("data-catalog-destination") || "all";
        state.page = 1;
        setActiveDestination(state.destination);
        render(state, pagerEl);
      });
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-catalog-product]");
      if (!card) return;

      const id = card.getAttribute("data-catalog-product");
      const product = products.find((p) => p.id === id);
      if (!product) return;

      window.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product } }));
    });

    pagerEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.hasAttribute("data-page-prev")) {
        state.page = Math.max(1, state.page - 1);
        render(state, pagerEl);
        return;
      }
      if (btn.hasAttribute("data-page-next")) {
        state.page = state.page + 1;
        render(state, pagerEl);
        return;
      }
      const p = btn.getAttribute("data-page");
      if (p) {
        state.page = Number(p) || 1;
        render(state, pagerEl);
      }
    });

    setActiveTab(state.tab);
    setActiveDestination(state.destination);
    render(state, pagerEl);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
