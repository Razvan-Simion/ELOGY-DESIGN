/* =========================================
   ELOGY – Accesorii catalog UI
   - chips single-select: "Pentru" + "Tip"
   - AND filter
   - empty state hidden implicit în HTML
   - click card => elogy:productselect (drawer)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const products = (NS.data && NS.data.accesoriiProducts) ? NS.data.accesoriiProducts : [];

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

  function mediaClass(variant) {
    if (variant === 2) return "media--grad-2";
    if (variant === 3) return "media--grad-3";
    return "media--grad-1";
  }

  function appliesLabel(list) {
    const map = {
      mocheta: "Mochetă",
      perdele: "Perdele",
      draperii: "Draperii",
      universal: "Universal"
    };
    if (!Array.isArray(list) || !list.length) return "—";
    return list.map((k) => map[k] || k).join(", ");
  }

  function typeLabel(t) {
    const map = {
      underlay: "Underlay",
      plinte: "Plinte",
      adezivi: "Adezivi",
      sine_kit: "Șine (kit)",
      galerie_bara: "Galerie (bară)",
      galerie_accesorii: "Accesorii galerie"
    };
    return map[t] || t;
  }

  function priceLine(p) {
    const unitMap = { mp: "mp", buc: "buc", set: "set" };
    const unit = unitMap[p.pricing && p.pricing.unit] || "";
    const v = p.pricing ? p.pricing.value : null;
    return v != null ? `${formatRON(v)} / ${unit}` : "—";
  }

  function cardHTML(p) {
    return `
      <button class="catalog-card" type="button" data-acc-product="${p.id}">
        <div class="catalog-card__top">
          <div class="catalog-card__media media media--gradient ${mediaClass(p.mediaVariant)}" aria-hidden="true">
            <div class="media__surface"></div>
          </div>

          <div class="catalog-card__content">
            <h3 class="catalog-card__title">${escapeHTML(p.title)}</h3>
            ${p.descriptionShort ? `<p class="catalog-card__desc">${escapeHTML(p.descriptionShort)}</p>` : ""}
          </div>
        </div>

        <p class="catalog-card__line">Pentru: ${escapeHTML(appliesLabel(p.appliesTo))}</p>
        <p class="catalog-card__price">${escapeHTML(priceLine(p))}</p>
        <p class="catalog-card__price-sub">${escapeHTML(typeLabel(p.type))}</p>

        <span class="catalog-card__cta">Detalii</span>
      </button>
    `;
  }

  function matchesApplies(p, applies) {
    if (applies === "all") return true;
    return Array.isArray(p.appliesTo) && p.appliesTo.includes(applies);
  }

  function matchesType(p, type) {
    if (type === "all") return true;
    return p.type === type;
  }

  function setActiveApplies(applies) {
    qsa("[data-acc-applies]").forEach((btn) => {
      const isActive = btn.getAttribute("data-acc-applies") === applies;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    });
  }

  function setActiveType(type) {
    qsa("[data-acc-type]").forEach((btn) => {
      const isActive = btn.getAttribute("data-acc-type") === type;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    });
  }

  function render(state) {
    const grid = qs("[data-acc-grid]");
    const empty = qs("[data-acc-empty]");
    const meta = qs("[data-acc-meta]");
    if (!grid || !empty || !meta) return;

    const filtered = products
      .filter((p) => (p.status || "active") === "active")
      .filter((p) => matchesApplies(p, state.applies))
      .filter((p) => matchesType(p, state.type));

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
    const grid = qs("[data-acc-grid]");
    if (!grid) return;

    const state = { applies: "all", type: "all" };

    qsa("[data-acc-applies]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.applies = btn.getAttribute("data-acc-applies") || "all";
        setActiveApplies(state.applies);
        render(state);
      });
    });

    qsa("[data-acc-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.type = btn.getAttribute("data-acc-type") || "all";
        setActiveType(state.type);
        render(state);
      });
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-acc-product]");
      if (!card) return;

      const id = card.getAttribute("data-acc-product");
      const product = products.find((p) => p.id === id);
      if (!product) return;

      window.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product } }));
    });

    // initial
    setActiveApplies(state.applies);
    setActiveType(state.type);
    render(state);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
