/* =========================================
   ELOGY – Mochetă catalog UI (Pasul 2)
   - render grid
   - tabs (all/rola/traversa)
   - destination chips (single-select)
   - fără drawer/configurator (vine la Pasul 3)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const products = (NS.data && NS.data.mochetaProducts) ? NS.data.mochetaProducts : [];

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

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
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
    // Folosește gradientele globale deja existente (.media--gradient).
    // Păstrăm doar o variație minimă printr-o clasă utilitară.
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
      // Text obligatoriu (fără simboluri care sugerează înmulțire)
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

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function render(state) {
    const grid = qs("[data-catalog-grid]");
    const empty = qs("[data-catalog-empty]");
    const meta = qs("[data-catalog-meta]");
    if (!grid || !empty || !meta) return;

    const filtered = products
      .filter((p) => matchesTab(p, state.tab))
      .filter((p) => matchesDestination(p, state.destination));

    meta.textContent = `${filtered.length} produse afișate`;

    if (!filtered.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }

    grid.innerHTML = filtered.map(cardHTML).join("");
    empty.hidden = true;
    
  }

  function init() {
    const grid = qs("[data-catalog-grid]");
    if (!grid) return;

    const state = {
      tab: "all",
      destination: "all"
    };

    // Tabs
    qsa("[data-catalog-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.tab = btn.getAttribute("data-catalog-tab") || "all";
        setActiveTab(state.tab);
        render(state);
      });
    });

    // Destination chips
    qsa("[data-catalog-destination]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.destination = btn.getAttribute("data-catalog-destination") || "all";
        setActiveDestination(state.destination);
        render(state);
      });
    });

    // Product click (pregătire pentru Pasul 3)
    grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-catalog-product]");
      if (!card) return;

      const id = card.getAttribute("data-catalog-product");
      const product = products.find((p) => p.id === id);
      if (!product) return;

      // La Pasul 3, drawer-ul va asculta acest eveniment
      window.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product } }));
    });

    // Initial render
    setActiveTab(state.tab);
    setActiveDestination(state.destination);
    render(state);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
