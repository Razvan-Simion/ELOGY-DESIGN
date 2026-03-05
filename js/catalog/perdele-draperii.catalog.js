/* =========================================
   ELOGY – Perdele & Draperii catalog UI
   - grid mount: [data-fabric-grid] cu data-fabric-category="perdele|draperii"
   - click card => elogy:productselect (drawer)
   - NEW: pagination (max 6 / page)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const money = NS.money;

  const PAGE_SIZE = 6;

  const formatRON = (money && money.formatRON)
    ? money.formatRON
    : (n) => {
        const v = Number(n);
        const hasDecimals = Math.abs(v - Math.trunc(v)) > 0;
        return v.toLocaleString("ro-RO", {
          minimumFractionDigits: hasDecimals ? 2 : 0,
          maximumFractionDigits: hasDecimals ? 2 : 0
        }) + " lei";
      };

  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function mediaClass(variant) {
    if (variant === 2) return "media--grad-2";
    if (variant === 3) return "media--grad-3";
    return "media--grad-1";
  }

  function priceLine(p) {
    const unit = (p.pricing && p.pricing.unit) ? p.pricing.unit : "ml";
    const v = p.pricing ? p.pricing.value : null;
    return v != null ? `${formatRON(v)} / ${unit}` : "—";
  }

  function badgeLine(p) {
    if (p.flags && p.flags.blackout) return "Blackout";
    if (p.flags && p.flags.sheer) return "Sheer";
    if (p.flags && p.flags.versatile) return "Versatil";
    return "Premium";
  }

function cardHTML(p) {
  const title = escapeHTML(p.title || "Produs");
  const desc = escapeHTML(p.descriptionShort || "");
  const h = (p.specs && Number(p.specs.fabricHeightM)) ? `${p.specs.fabricHeightM} m` : "—";
  const badge = escapeHTML(badgeLine(p));

  const img0 = (p && Array.isArray(p.images) && p.images[0]) ? String(p.images[0]) : "";

  const mediaClasses = img0
    ? `catalog-card__media media has-image ${mediaClass(p.mediaVariant)}`
    : `catalog-card__media media media--gradient ${mediaClass(p.mediaVariant)}`;

  const mediaStyle = img0 ? ` style="background-image:url('${img0.replace(/'/g, "%27")}')"` : "";

  return `
      <button class="catalog-card" type="button" data-fabric-product="${escapeHTML(p.id)}">
        <div class="catalog-card__top">
          <div class="${mediaClasses}" aria-hidden="true"${mediaStyle}>
            <div class="media__surface"></div>
          </div>

          <div class="catalog-card__content">
            <p class="catalog-card__badge">${badge}</p>
            <h3 class="catalog-card__title">${title}</h3>
            <p class="catalog-card__desc">${desc}</p>
          </div>
        </div>

        <div class="catalog-card__foot">
          <p class="catalog-card__price">${priceLine(p)}</p>
          <p class="catalog-card__meta">Înălțime material: ${escapeHTML(h)}</p>
        </div>
      </button>
    `;
}

  function getJordanVariant(category) {
    const data = NS.data || {};
    const j = data.jordanProduct;
    if (!j) return null;

    return {
      ...j,
      category,     // "perdele" | "draperii"
      type: "fabric",
      flags: { ...(j.flags || {}), versatile: true }
    };
  }

  function getProductsForCategory(category) {
    const data = NS.data || {};
    if (category === "perdele") {
      const base = data.perdeleProducts || [];
      const jordan = getJordanVariant("perdele");
      return jordan ? [...base, jordan] : base;
    }
    if (category === "draperii") {
      const base = data.draperiiProducts || [];
      const jordan = getJordanVariant("draperii");
      return jordan ? [...base, jordan] : base;
    }
    return [];
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

  function initGrid(gridEl) {
    const category = (gridEl.dataset.fabricCategory || "").trim();
    if (!category) return;

    // inject pager under this grid
    const pagerEl = document.createElement("div");
    gridEl.insertAdjacentElement("afterend", pagerEl);

    const allProducts = getProductsForCategory(category).filter((p) => p && p.status !== "inactive");
    const state = { page: 1 };

    function render() {
      const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
      state.page = Math.max(1, Math.min(totalPages, state.page));

      const start = (state.page - 1) * PAGE_SIZE;
      const pageItems = allProducts.slice(start, start + PAGE_SIZE);

      gridEl.innerHTML = pageItems.map(cardHTML).join("");
      pagerEl.innerHTML = buildPagerHTML(totalPages, state.page);
    }

    gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fabric-product]");
      if (!btn) return;

      const productId = btn.getAttribute("data-fabric-product");
      const p = allProducts.find((x) => x.id === productId);
      if (!p) return;

      document.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product: p } }));
    });

    pagerEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.hasAttribute("data-page-prev")) {
        state.page = Math.max(1, state.page - 1);
        render();
        return;
      }
      if (btn.hasAttribute("data-page-next")) {
        state.page = state.page + 1;
        render();
        return;
      }
      const p = btn.getAttribute("data-page");
      if (p) {
        state.page = Number(p) || 1;
        render();
      }
    });

    render();
  }

  function boot() {
    const grids = qsa("[data-fabric-grid]");
    if (!grids.length) return;
    grids.forEach(initGrid);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
