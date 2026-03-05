(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const money = NS.money || {};
  const store = NS.cartStore;

  const products = (NS.data && NS.data.accesoriiProducts) ? NS.data.accesoriiProducts : [];

  const formatRON = money.formatRON
    ? money.formatRON
    : (n) => {
        const v = Number(n);
        const hasDecimals = Math.abs(v - Math.trunc(v)) > 0;
        return v.toLocaleString("ro-RO", {
          minimumFractionDigits: hasDecimals ? 2 : 0,
          maximumFractionDigits: hasDecimals ? 2 : 0,
        }) + " lei";
      };

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function clampNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function round2(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.round(v * 100) / 100;
  }


  // Underlay: clamp strict (min 0.5, step 0.01, fallback 0.5)
  function normalizeUnderlayLength(v) {
    let n = Number(v);
    if (!Number.isFinite(n)) n = 0.5;
    if (n < 0.5) n = 0.5;
    return Math.round(n * 100) / 100; // step 0.01 (2 decimals)
  }



  // DOM refs (shared contract)
  const drawer = () => qs("[data-product-drawer]");
  const panel = () => qs("[data-product-drawer-panel]");
  const fieldsWrap = () => qs("[data-product-drawer-fields]");
  const titleEl = () => qs("[data-product-drawer-title]");
  const typeEl = () => qs("[data-product-drawer-type]");
  const descEl = () => qs("[data-product-drawer-desc]");
  const priceEl = () => qs("[data-product-drawer-price]");
  const subEl = () => qs("[data-product-drawer-sub]");
  const actionBtn = () => qs("[data-product-add-to-cart]"); // re-used as add/update

  let currentProduct = null;
  let editingLineId = null;
  let lastFocus = null;

  const cfg = {
    qty: 1,
    lengthM: 0.5
  };

  function openDrawer() {
    const d = drawer();
    if (!d) return;
    lastFocus = document.activeElement;
    d.hidden = false;
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => {
      const p = panel();
      if (p) p.focus();
    }, 0);
  }

  function closeDrawer() {
    const d = drawer();
    if (!d) return;
    d.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function isUnderlay(p) {
    return p && p.type === "underlay";
  }

  function unitLabel(p) {
    const u = p && p.pricing && p.pricing.unit;
    if (u === "set") return "set";
    if (u === "buc") return "buc";
    return "mp";
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

  function buildUnderlayFields(p) {
    return `
      <div class="field">
        <label class="field__label" for="acc-underlay-lungime">Lungime (m)</label>
        <input class="field__control" id="acc-underlay-lungime" type="number"
          min="0.5" step="0.01" value="${cfg.lengthM}" inputmode="decimal" data-acc-length />
        <p class="field__hint">Underlay – lățime fixă 1,37 m. Calcul la metru pătrat.</p>
      </div>
    `;
  }

  function buildSimpleFields(p) {
    return `
      <div class="field">
        <label class="field__label" for="acc-qty">Cantitate (${unitLabel(p)})</label>
        <input class="field__control" id="acc-qty" type="number"
          min="1" step="1" value="${cfg.qty}" inputmode="numeric" data-acc-qty />
      </div>
    `;
  }

  function calcUnderlay(p, lengthM) {
    const widthM = 1.37;
    const safeLen = normalizeUnderlayLength(lengthM);
    const areaMp = round2(widthM * safeLen);
    const unitPrice = clampNum(p.pricing && p.pricing.value);
    const total = round2(areaMp * unitPrice);
    return { unitLabel: "mp", unitPrice, quantity: areaMp, total, meta: { widthM, lengthM: safeLen, areaMp } };
  }


  function calcSimple(p, qty) {
    const q = Math.max(1, Math.round(clampNum(qty)));
    const unitPrice = clampNum(p.pricing && p.pricing.value);
    const total = round2(q * unitPrice);
    return { unitLabel: unitLabel(p), unitPrice, quantity: q, total, meta: { qty: q } };
  }

  function setHeader(p) {
    if (titleEl()) titleEl().textContent = p.title || "Produs";
    if (descEl()) descEl().textContent = p.descriptionShort || "";
    if (typeEl()) typeEl().textContent = typeLabel(p.type);

    const media = qs(".pdrawer__media", panel());
    if (media) {
      media.classList.remove("media--grad-1", "media--grad-2", "media--grad-3");
      const v = p.mediaVariant;
      media.classList.add(v === 2 ? "media--grad-2" : v === 3 ? "media--grad-3" : "media--grad-1");
    }
  }

  function bindFieldEvents(p) {
    const len = qs("[data-acc-length]", panel());
    const qty = qs("[data-acc-qty]", panel());

    const onUpdate = () => updateTotals(p);

       if (len) {
      // keep typing UX the same, but calculations/validation are normalized
      len.addEventListener("input", () => { cfg.lengthM = clampNum(len.value); onUpdate(); });

      // on blur, normalize and reflect back in the input
      len.addEventListener("blur", () => {
        const v = normalizeUnderlayLength(len.value);
        cfg.lengthM = v;
        len.value = v.toFixed(2);
        onUpdate();
      });
    }

    if (qty) qty.addEventListener("input", () => { cfg.qty = clampNum(qty.value); onUpdate(); });
  }

  function setFields(p) {
    const wrap = fieldsWrap();
    if (!wrap) return;

    wrap.innerHTML = isUnderlay(p) ? buildUnderlayFields(p) : buildSimpleFields(p);
    bindFieldEvents(p);
  }

  function isValid(p) {
    if (!p) return false;
    if (isUnderlay(p)) return normalizeUnderlayLength(cfg.lengthM) >= 0.5;
    return clampNum(cfg.qty) >= 1;
  }

  function updateTotals(p) {
    if (!p) return;

    if (isUnderlay(p)) {
      const pr = calcUnderlay(p, cfg.lengthM);
      if (priceEl()) priceEl().textContent = `${formatRON(pr.total)} (estimativ)`;
      if (subEl()) subEl().textContent =
        `Suprafață estimată: ${pr.meta.areaMp.toLocaleString("ro-RO")} mp pentru lungime ${pr.meta.lengthM.toLocaleString("ro-RO")} m. Preț: ${formatRON(pr.unitPrice)} / mp.`;
    } else {
      const pr = calcSimple(p, cfg.qty);
      if (priceEl()) priceEl().textContent = `${formatRON(pr.total)} (estimativ)`;
      if (subEl()) subEl().textContent =
        `Preț: ${formatRON(pr.unitPrice)} / ${pr.unitLabel}. Cantitate: ${pr.meta.qty} ${pr.unitLabel}.`;
    }

    if (actionBtn()) actionBtn().disabled = !isValid(p);
  }

  function buildCartItem(p) {
    let pricing, config, display;

    if (isUnderlay(p)) {
      pricing = calcUnderlay(p, cfg.lengthM);
      config = {
        kind: "underlay",
        widthM: pricing.meta.widthM,
        lengthM: pricing.meta.lengthM,
        areaMp: pricing.meta.areaMp,
        pricePerUnit: pricing.unitPrice,
        unit: "mp"
      };

      display = {
        title: p.title,
        subtitle: "Underlay – lățime fixă 1,37 m",
        details: [
          `Lungime: ${pricing.meta.lengthM.toLocaleString("ro-RO")} m`,
          `Suprafață estimată: ${pricing.meta.areaMp.toLocaleString("ro-RO")} mp`,
          `Preț: ${formatRON(pricing.unitPrice)} / mp`
        ]
      };
    } else {
      pricing = calcSimple(p, cfg.qty);
      config = {
        kind: "simple",
        qty: pricing.meta.qty,
        unit: pricing.unitLabel,
        pricePerUnit: pricing.unitPrice
      };

      const specBits = [];
      if (p.specs && typeof p.specs.lengthMl === "number") specBits.push(`Lungime standard: ${p.specs.lengthMl} ml`);
      if (p.specs && typeof p.specs.lengthM === "number") specBits.push(`Dimensiune: ${p.specs.lengthM.toFixed(1)} m`);
      if (p.specs && typeof p.specs.piecesPerSet === "number") specBits.push(`Set: ${p.specs.piecesPerSet} buc`);

      display = {
        title: p.title,
        subtitle: `${typeLabel(p.type)}`,
        details: [
          `Cantitate: ${pricing.meta.qty} ${pricing.unitLabel}`,
          ...specBits
        ]
      };
    }

    return {
      category: "accesorii",
      productId: p.id,
      title: p.title,
      type: p.type,
      appliesTo: Array.isArray(p.appliesTo) ? p.appliesTo.slice() : [],
      config,
      pricing: {
        estimated: true,
        currency: "RON",
        unitLabel: pricing.unitLabel,
        unitPrice: pricing.unitPrice,
        quantity: pricing.quantity,
        total: pricing.total
      },
      display,
      createdAt: new Date().toISOString()
    };
  }

  function setActionMode() {
    const btn = actionBtn();
    if (!btn) return;
    btn.textContent = editingLineId ? "Actualizează" : "Adaugă în coș";
  }

  function loadEditState(lineId, product) {
    editingLineId = lineId || null;
    currentProduct = product;

    // defaults
    cfg.qty = 1;
    cfg.lengthM = 0.5;

    if (!editingLineId || !store) return;

    const st = store.getState ? store.getState() : null;
    const it = st && Array.isArray(st.items) ? st.items.find((x) => x && x.lineId === editingLineId) : null;
    if (!it || it.productId !== product.id) return;

    if (it.config && it.config.kind === "underlay") {
      cfg.lengthM = normalizeUnderlayLength(
        (it.config && typeof it.config.lengthM === "number") ? it.config.lengthM : 0.5
      );
    } else if (it.config && it.config.kind === "simple") {

      cfg.qty = typeof it.config.qty === "number" ? it.config.qty : 1;
    }
  }

  function bindGlobalEvents() {
    window.addEventListener("elogy:productselect", (e) => {
      const p = e.detail && e.detail.product;
      if (!p || p.category !== "accesorii") return;

      const lineId = e.detail && e.detail.lineId ? String(e.detail.lineId) : null;

      loadEditState(lineId, p);
      setHeader(p);
      setFields(p);
      setActionMode();
      updateTotals(p);
      openDrawer();
    });

    qsa("[data-product-drawer-close]").forEach((btn) => btn.addEventListener("click", closeDrawer));

    document.addEventListener("keydown", (e) => {
      const d = drawer();
      if (!d || d.hidden) return;
      if (e.key === "Escape") closeDrawer();
    });

    const btn = actionBtn();
    if (btn) {
      btn.addEventListener("click", () => {
        if (!currentProduct || !isValid(currentProduct)) return;

        if (!store || typeof store.addItem !== "function") {
          console.warn("[ELOGY] cartStore missing.");
          return;
        }

        const item = buildCartItem(currentProduct);

        if (editingLineId) {
          // update existing line (underlay or simple edit)
          store.updateItem(editingLineId, item);
          btn.textContent = "Actualizat";
          btn.disabled = true;
          setTimeout(() => {
            setActionMode();
            updateTotals(currentProduct);
            closeDrawer();
          }, 550);
          return;
        }

        // add new (store may aggregate simple accessories)
        store.addItem(item);

        btn.textContent = "Adăugat";
        btn.disabled = true;
        setTimeout(() => {
          setActionMode();
          updateTotals(currentProduct);
          closeDrawer();
        }, 550);
      });
    }
  }

  function init() {
    if (!drawer() || !panel()) return;
    bindGlobalEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
