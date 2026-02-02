(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const money = NS.money || {};

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

  // --- DOM refs (SCOPED)
  const drawer = () => qs("[data-product-drawer]");
  const panel = () => qs("[data-product-drawer-panel]");
  const fieldsWrap = () => qs("[data-product-drawer-fields]");
  const titleEl = () => qs("[data-product-drawer-title]");
  const typeEl = () => qs("[data-product-drawer-type]");
  const descEl = () => qs("[data-product-drawer-desc]");
  const priceEl = () => qs("[data-product-drawer-price]");
  const subEl = () => qs("[data-product-drawer-sub]");
  const addBtn = () => qs("[data-product-add-to-cart]");

  const montajToggle = () => qs("[data-product-montaj-toggle]");
  const montajFields = () => qs("[data-product-montaj-fields]");
  const montajSurface = () => qs("[data-product-montaj-surface]");
  const montajFloor = () => qs("[data-product-montaj-floor]");
  const montajNotes = () => qs("[data-product-montaj-notes]");

  let currentProduct = null;
  let lastFocus = null;

  const cfg = {
    lengthM: 0.5,
    widthCm: null,
    montageRequested: false,
    montageSurface: "",
    montageFloor: "",
    montageNotes: "",
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
    if (montajFields()) montajFields().hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function isRola(p) { return p && p.subtype === "rola"; }
  function isTraversa(p) { return p && p.subtype === "traversa"; }

  function setMontajVisibility(isOn) {
    const box = montajFields();
    if (!box) return;
    box.hidden = !isOn;
  }

  function readMontajFromUI() {
    cfg.montageRequested = !!(montajToggle() && montajToggle().checked);
    cfg.montageSurface = (montajSurface() && montajSurface().value) || "";
    cfg.montageFloor = (montajFloor() && montajFloor().value) || "";
    cfg.montageNotes = (montajNotes() && montajNotes().value) || "";
  }

  function calcRola(p, lengthM) {
    const safeLen = Math.max(0, clampNum(lengthM));
    const widthM = 4;
    const areaMp = round2(widthM * safeLen);
    const unitPrice = clampNum(p.pricePerSqm);
    const total = round2(areaMp * unitPrice);
    return { unitLabel: "mp", unitPrice, quantity: areaMp, total, meta: { widthM, lengthM: safeLen, areaMp } };
  }

  function findTraversePrice(byWidth, widthCm) {
    if (!Array.isArray(byWidth)) return null;
    const w = Number(widthCm);
    const found = byWidth.find((x) => Number(x.widthCm) === w);
    if (!found) return null;
    const price = clampNum(found.pricePerMl);
    return Number.isFinite(price) ? price : null;
  }

  function calcTraversa(p, widthCm, lengthM) {
    const safeLen = Math.max(0, clampNum(lengthM));
    const pricePerMl = findTraversePrice(p.byWidth, widthCm) || 0;
    const total = round2(safeLen * pricePerMl);
    return { unitLabel: "ml", unitPrice: pricePerMl, quantity: safeLen, total, meta: { widthCm: Number(widthCm) || null, lengthM: safeLen } };
  }

  function buildRolaFields() {
    return `
      <div class="field">
        <label class="field__label" for="rola-lungime">Lungime (m)</label>
        <input class="field__control" id="rola-lungime" type="number"
          min="0.5" step="0.01" value="${cfg.lengthM}" inputmode="decimal" data-rola-length />
        <p class="field__hint">Rolă – lățime fixă 4 m. Calcul la metru pătrat.</p>
      </div>
    `;
  }

  function buildTraversaFields(p) {
    const opts = Array.isArray(p.byWidth) ? p.byWidth : [];
    const selected = cfg.widthCm != null ? cfg.widthCm : (opts[0] ? opts[0].widthCm : "");

    const optionsHTML = opts
      .map((o) => {
        const w = Number(o.widthCm);
        return `<option value="${w}" ${Number(selected) === w ? "selected" : ""}>${w} cm</option>`;
      })
      .join("");

    return `
      <div class="field">
        <label class="field__label" for="trv-latime">Lățime</label>
        <select class="field__control" id="trv-latime" data-trv-width>
          ${optionsHTML || `<option value="">Indisponibil</option>`}
        </select>
        <p class="field__hint">Traverse – preț la metru liniar (în funcție de lățime).</p>
      </div>

      <div class="field">
        <label class="field__label" for="trv-lungime">Lungime (m)</label>
        <input class="field__control" id="trv-lungime" type="number"
          min="0.5" step="0.01" value="${cfg.lengthM}" inputmode="decimal" data-trv-length />
      </div>
    `;
  }

  function setHeader(p) {
    if (titleEl()) titleEl().textContent = p.title || "Produs";
    if (descEl()) descEl().textContent = p.short || "";
    if (typeEl()) typeEl().textContent = isRola(p) ? "Mochetă la rolă" : isTraversa(p) ? "Traversă" : "Produs";

    const media = qs(".pdrawer__media", panel());
    if (media) {
      media.classList.remove("media--grad-1", "media--grad-2", "media--grad-3");
      const v = p.mediaVariant;
      media.classList.add(v === 2 ? "media--grad-2" : v === 3 ? "media--grad-3" : "media--grad-1");
    }
  }

  function setFields(p) {
    const wrap = fieldsWrap();
    if (!wrap) return;

    cfg.lengthM = 0.5;
    cfg.widthCm = null;
    if (isTraversa(p) && Array.isArray(p.byWidth) && p.byWidth.length) cfg.widthCm = p.byWidth[0].widthCm;

    wrap.innerHTML = isRola(p) ? buildRolaFields() : isTraversa(p) ? buildTraversaFields(p) : "";
    bindFieldEvents(p);
  }

  function bindFieldEvents(p) {
    const rolaLen = qs("[data-rola-length]", panel());
    const trvLen = qs("[data-trv-length]", panel());
    const trvWidth = qs("[data-trv-width]", panel());

    const onUpdate = () => updateTotals(p);

    if (rolaLen) rolaLen.addEventListener("input", () => { cfg.lengthM = clampNum(rolaLen.value); onUpdate(); });
    if (trvLen) trvLen.addEventListener("input", () => { cfg.lengthM = clampNum(trvLen.value); onUpdate(); });
    if (trvWidth) trvWidth.addEventListener("change", () => { cfg.widthCm = trvWidth.value ? Number(trvWidth.value) : null; onUpdate(); });
  }

  function isValid(p) {
    const okLen = clampNum(cfg.lengthM) >= 0.5;
    if (isRola(p)) return okLen;
    if (isTraversa(p)) {
      const okWidth = cfg.widthCm != null && Number.isFinite(Number(cfg.widthCm));
      const price = findTraversePrice(p.byWidth, cfg.widthCm);
      return okLen && okWidth && price != null;
    }
    return false;
  }

  function updateTotals(p) {
    if (!p) return;

    if (isRola(p)) {
      const pr = calcRola(p, cfg.lengthM);
      if (priceEl()) priceEl().textContent = `${formatRON(pr.total)} (estimativ)`;
      if (subEl()) subEl().textContent =
        `Rolă – lățime fixă 4 m. Suprafață estimată: ${pr.meta.areaMp.toLocaleString("ro-RO")} mp pentru lungime ${pr.meta.lengthM.toLocaleString("ro-RO")} m. Preț: ${formatRON(pr.unitPrice)} / mp.`;
    }

    if (isTraversa(p)) {
      const pr = calcTraversa(p, cfg.widthCm, cfg.lengthM);
      if (priceEl()) priceEl().textContent = `${formatRON(pr.total)} (estimativ)`;
      if (subEl()) subEl().textContent =
        `Traversă – lățime ${pr.meta.widthCm} cm. Lungime ${pr.meta.lengthM.toLocaleString("ro-RO")} m. Preț: ${formatRON(pr.unitPrice)} / ml pentru lățimea aleasă.`;
    }

    if (addBtn()) addBtn().disabled = !isValid(p);
  }

  function buildCartItem(p) {
    readMontajFromUI();

    let pricing, config, display;

    if (isRola(p)) {
      pricing = calcRola(p, cfg.lengthM);
      config = { type: "rola", widthM: pricing.meta.widthM, lengthM: pricing.meta.lengthM, areaMp: pricing.meta.areaMp, pricingUnit: "mp", pricePerUnit: pricing.unitPrice };
      display = { title: p.title, subtitle: "Rolă – lățime fixă 4 m", details: [
        `Lungime: ${pricing.meta.lengthM.toLocaleString("ro-RO")} m`,
        `Suprafață estimată: ${pricing.meta.areaMp.toLocaleString("ro-RO")} mp`,
        `Preț: ${formatRON(pricing.unitPrice)} / mp`,
      ]};
    }

    if (isTraversa(p)) {
      pricing = calcTraversa(p, cfg.widthCm, cfg.lengthM);
      config = { type: "traversa", widthCm: pricing.meta.widthCm, lengthM: pricing.meta.lengthM, pricingUnit: "ml", pricePerUnit: pricing.unitPrice };
      display = { title: p.title, subtitle: `Traversă – lățime ${pricing.meta.widthCm} cm`, details: [
        `Lungime: ${pricing.meta.lengthM.toLocaleString("ro-RO")} m`,
        `Preț: ${formatRON(pricing.unitPrice)} / ml`,
      ]};
    }

    const montage = cfg.montageRequested
      ? { requested: true, surfaceType: cfg.montageSurface || "", floorType: cfg.montageFloor || "", notes: cfg.montageNotes || "" }
      : { requested: false };

    return {
      category: "mocheta",
      productId: p.id,
      title: p.title,
      subtype: p.subtype,
      destination: Array.isArray(p.destination) ? p.destination.slice() : [],
      config,
      montage,
      pricing: { estimated: true, currency: "RON", unitLabel: pricing.unitLabel, unitPrice: pricing.unitPrice, quantity: pricing.quantity, total: pricing.total },
      display,
      createdAt: new Date().toISOString(),
    };
  }

  function bindGlobalEvents() {
    window.addEventListener("elogy:productselect", (e) => {
      const p = e.detail && e.detail.product;
      if (!p) return;

      currentProduct = p;

      // reset montage controls
      if (montajToggle()) montajToggle().checked = false;
      if (montajSurface()) montajSurface().value = "";
      if (montajFloor()) montajFloor().value = "";
      if (montajNotes()) montajNotes().value = "";
      setMontajVisibility(false);

      setHeader(p);
      setFields(p);
      updateTotals(p);
      openDrawer();
    });

    qsa("[data-product-drawer-close]").forEach((btn) => btn.addEventListener("click", closeDrawer));

    document.addEventListener("keydown", (e) => {
      const d = drawer();
      if (!d || d.hidden) return;
      if (e.key === "Escape") closeDrawer();
    });

    if (montajToggle()) {
      montajToggle().addEventListener("change", () => setMontajVisibility(montajToggle().checked));
    }

    if (addBtn()) {
      addBtn().addEventListener("click", () => {
        if (!currentProduct || !isValid(currentProduct)) return;

        const store = NS.cartStore;
        if (!store || typeof store.addItem !== "function") {
          console.warn("[ELOGY] cartStore missing. Pasul 1 trebuie încărcat.");
          return;
        }

        store.addItem(buildCartItem(currentProduct));

        addBtn().textContent = "Adăugat";
        addBtn().disabled = true;

        setTimeout(() => {
          addBtn().textContent = "Adaugă în coș";
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
