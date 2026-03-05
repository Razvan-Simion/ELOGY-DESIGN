/* =========================================
   ELOGY – Cart page (cos.html) (Pasul 5)
   - render items din cartStore
   - remove line
   - fulfillment pickup/delivery
   - Formspree payload human-readable (NU JSON)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const store = NS.cartStore;
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

  function setMontajMode(mode) {
    const section = qs("[data-montaj-section]");
    if (!section) return;

    const full = qs("[data-montaj-full]", section);
    const simple = qs("[data-montaj-simple]", section);
    const fullFields = qs("[data-product-montaj-fields]", section);

    // default: ascunde tot ce nu e relevant
    if (full) full.hidden = true;
    if (simple) simple.hidden = true;

    // IMPORTANT: dacă nu suntem pe FULL, ascundem și fields-urile mochetei (ca să nu rămână deschise)
    if (fullFields) fullFields.hidden = true;

    if (mode === "full") {
      if (section) section.hidden = false;
      if (full) full.hidden = false;
      return;
    }

    if (mode === "simple") {
      if (section) section.hidden = false;
      if (simple) simple.hidden = false;
      return;
    }

    // mode === "none"
    section.hidden = true;
  }

  function montajModeForCartItem(it) {
    if (!it) return "none";

    // Accesorii: nu arătăm deloc
    if (it.category === "accesorii") return "none";

    // Mochetă: full (ca acum)
    if (it.category === "mocheta") return "full";

    // Perdele / Draperii / Jordan (intră pe același flow în coș)
    if (it.category === "perdele" || it.category === "draperii" || (it.config && it.config.kind === "perdele_draperii")) {
      return "simple";
    }

    return "none";
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sumSubtotal(items) {
    let sum = 0;
    let hasAny = false;

    items.forEach((it) => {
      const v =
        (it && it.pricing && typeof it.pricing.total === "number" && it.pricing.total) ||
        (it && typeof it.total === "number" && it.total) ||
        0;

      if (Number.isFinite(v) && v > 0) {
        sum += v;
        hasAny = true;
      }
    });

    return { sum, hasAny };
  }

  function itemConfigLines(it) {
    // Prefer "display.details" (din drawer), fallback la config.
    if (it && it.display && Array.isArray(it.display.details) && it.display.details.length) {
      return it.display.details.slice();
    }

    const lines = [];
    const cfg = it && it.config ? it.config : {};

    if (cfg.type === "rola") {
      if (typeof cfg.lengthM === "number") lines.push(`Lungime: ${cfg.lengthM.toLocaleString("ro-RO")} m`);
      if (typeof cfg.areaMp === "number") lines.push(`Suprafață estimată: ${cfg.areaMp.toLocaleString("ro-RO")} mp`);
      if (typeof cfg.pricePerUnit === "number") lines.push(`Preț: ${formatRON(cfg.pricePerUnit)} / mp`);
    }

    if (cfg.type === "traversa") {
      if (cfg.widthCm) lines.push(`Lățime: ${cfg.widthCm} cm`);
      if (typeof cfg.lengthM === "number") lines.push(`Lungime: ${cfg.lengthM.toLocaleString("ro-RO")} m`);
      if (typeof cfg.pricePerUnit === "number") lines.push(`Preț: ${formatRON(cfg.pricePerUnit)} / ml`);
    }

    return lines;
  }

  function montageLines(it) {
    const m = it && it.montage ? it.montage : null;
    if (!m || !m.requested) return [];

    const lines = ["Montaj: Solicitat"];
    if (m.surfaceType) lines.push(`- Tip suprafață: ${m.surfaceType}`);
    if (m.floorType) lines.push(`- Tip pardoseală: ${m.floorType}`);
    if (m.notes) lines.push(`- Observații: ${m.notes}`);
    return lines;
  }

  function itemPriceText(it) {
    const p = it && it.pricing ? it.pricing : null;
    if (!p || typeof p.total !== "number" || !Number.isFinite(p.total)) return "—";
    return `${formatRON(p.total)} (estimativ)`;
  }

  function renderList(items) {
    const list = qs("[data-cart-list]");
    if (!list) return;

    // NEW: pentru auto “Poziție 1/2/3” când lipsește labelul
    const posCounters = { perdele: 0, draperii: 0 };

    list.innerHTML = items

      .map((it) => {
        const title = (it && it.title) || (it && it.display && it.display.title) || "Produs";
        const subtitle = (it && it.display && it.display.subtitle) || (it && it.subtype ? it.subtype : "");
        const details = itemConfigLines(it);
        const price = itemPriceText(it);
        const mont = it && it.montage && it.montage.requested ? "Montaj: Solicitat" : "";
        const isAcc = it && it.category === "accesorii";
        const isAccSimple = isAcc && it.config && it.config.kind === "simple";
        const isAccUnderlay = isAcc && it.config && it.config.kind === "underlay";
        const isMocheta = it && it.category === "mocheta";

        // NEW: Perdele/Draperii configurable
        const isFabricConfig = !!(it && it.config && it.config.kind === "perdele_draperii");

        // qty only for accesorii simple
        const qtyVal = isAccSimple ? (it.config.qty || 1) : 1;


        return `
        <li class="cart-item">
          <div class="cart-item__top">
           <div>
             <p class="cart-item__title">${escapeHTML(title)}</p>
             ${subtitle ? `<p class="cart-item__subtitle">${escapeHTML(subtitle)}</p>` : ""}

            ${isFabricConfig
            ? (() => {
              const cat = it.category === "draperii" ? "draperii" : "perdele";
              const raw = (it.config && it.config.positionLabel) ? String(it.config.positionLabel).trim() : "";
              const label = raw ? raw : `Poziție ${++posCounters[cat]}`;
              return `<p class="cart-item__subtitle">Poziție: ${escapeHTML(label)}</p>`;
            })()
            : ""
          }  
         </div>


            <div class="cart-item__actions">
              ${(isAccUnderlay || isMocheta || isFabricConfig)
            ? `<button class="cart-item__edit" type="button" data-edit-line="${escapeHTML(it.lineId)}" aria-label="Editează">Editează</button>`
            : ""
          }

              <button class="cart-item__remove" type="button" aria-label="Șterge produs" data-remove-line="${escapeHTML(it.lineId)}">
                ✕
              </button>
            </div>
          </div>

          ${details.length
            ? `<ul class="cart-item__details">${details.map((d) => `<li>${escapeHTML(d)}</li>`).join("")}</ul>`
            : ""
          }

          ${isAccSimple
            ? `
                <div class="cart-item__qty" aria-label="Cantitate">
                  <button type="button" class="cart-item__qty-btn" data-qty-dec="${escapeHTML(it.lineId)}" aria-label="Scade">−</button>
                  <span class="cart-item__qty-val" data-qty-val="${escapeHTML(it.lineId)}">${escapeHTML(String(qtyVal))}</span>
                  <button type="button" class="cart-item__qty-btn" data-qty-inc="${escapeHTML(it.lineId)}" aria-label="Crește">+</button>
                </div>
              `
            : ""
          }

          <div class="cart-item__meta">
            ${price !== "—" ? `<p class="cart-item__price">${escapeHTML(price)}</p>` : `<p class="cart-item__price">—</p>`}
            ${mont ? `<p class="cart-item__tag">${escapeHTML(mont)}</p>` : ""}
          </div>
        </li>
      `;
      })
      .join("");
  }


  function setEmpty(isEmpty) {
    const empty = qs("[data-cart-empty]");
    const grid = qs("[data-cart-grid]");

    if (!empty || !grid) return;

    if (isEmpty) {
      empty.hidden = false;
      grid.hidden = true;
    } else {
      empty.hidden = true;
      grid.hidden = false;
    }
  }


  function setMeta(count) {
    const meta = qs("[data-cart-meta]");
    if (!meta) return;
    meta.textContent = count === 1 ? "1 produs" : `${count} produse`;
  }

  function setSubtotal(items) {
    const el = qs("[data-cart-subtotal]");
    if (!el) return;

    const { sum, hasAny } = sumSubtotal(items);
    el.textContent = hasAny ? formatRON(sum) : "—";
  }

  function getFulfillment() {
    const deliveryChecked = !!qs('[data-fulfillment="delivery"]:checked');
    return deliveryChecked ? "delivery" : "pickup";
  }

  function deliveryData() {
    return {
      strada: (qs("[data-adr-strada]") && qs("[data-adr-strada]").value.trim()) || "",
      nr: (qs("[data-adr-nr]") && qs("[data-adr-nr]").value.trim()) || "",
      localitate: (qs("[data-adr-localitate]") && qs("[data-adr-localitate]").value.trim()) || "",
      judet: (qs("[data-adr-judet]") && qs("[data-adr-judet]").value.trim()) || "",
      codPostal: (qs("[data-adr-cp]") && qs("[data-adr-cp]").value.trim()) || "",
      observatii: (qs("[data-adr-obs]") && qs("[data-adr-obs]").value.trim()) || "",
    };
  }

  function buildHumanPayload(items) {
    const lines = [];

    lines.push("CERERE OFERTĂ – ELOGY Design");
    lines.push("");
    lines.push("PRODUSE:");

    items.forEach((it, idx) => {
      const title = (it && it.title) || (it && it.display && it.display.title) || "Produs";
      const subtitle = (it && it.display && it.display.subtitle) || "";
      lines.push(`${idx + 1}. ${title}${subtitle ? " — " + subtitle : ""}`);

      const details = itemConfigLines(it);
      details.forEach((d) => lines.push(`   - ${d}`));

      // price (if any)
      const p = it && it.pricing ? it.pricing : null;
      if (p && typeof p.total === "number" && Number.isFinite(p.total)) {
        lines.push(`   - Total estimativ: ${formatRON(p.total)}`);
      }

      // montage
      montageLines(it).forEach((mline) => lines.push(`   ${mline.startsWith("-") ? mline : "- " + mline}`));

      lines.push("");
    });

    const { sum, hasAny } = sumSubtotal(items);
    lines.push(`TOTAL ESTIMATIV PRODUSE: ${hasAny ? formatRON(sum) : "—"}`);
    lines.push("");

    const f = getFulfillment();
    if (f === "pickup") {
      lines.push("RIDICARE / LIVRARE:");
      lines.push("Ridicare din showroom (gratuit)");
    } else {
      const a = deliveryData();
      lines.push("RIDICARE / LIVRARE:");
      lines.push("Livrare");
      lines.push(`Adresă: ${[a.strada, a.nr].filter(Boolean).join(" ")}${a.localitate ? ", " + a.localitate : ""}${a.judet ? ", " + a.judet : ""}${a.codPostal ? ", " + a.codPostal : ""}`.trim());
      if (a.observatii) lines.push(`Observații livrare: ${a.observatii}`);
      lines.push("Notă: Costul livrării se confirmă după verificare.");
    }

    lines.push("");
    lines.push("—");
    lines.push("Mesajul clientului este inclus în câmpul „Mesaj” (dacă a fost completat).");

    return lines.join("\n");
  }

  function bindFulfillmentUI() {
    const box = qs("[data-delivery-fields]");
    if (!box) return;

    function update() {
      const f = getFulfillment();
      box.hidden = f !== "delivery";
    }

    qsa('input[name="fulfillment"]').forEach((r) => {
      r.addEventListener("change", update);
    });

    update();
  }

  function bindListActions() {
    const list = qs("[data-cart-list]");
    if (!list) return;

    list.addEventListener("click", (e) => {
      // 1) REMOVE
      const removeBtn = e.target.closest("[data-remove-line]");
      if (removeBtn) {
        const id = removeBtn.getAttribute("data-remove-line");
        if (id && store && typeof store.removeItem === "function") {
          store.removeItem(id);
        }
        return;
      }

      // 2) QTY INC (accesorii simple)
      const incBtn = e.target.closest("[data-qty-inc]");
      if (incBtn) {
        const id = incBtn.getAttribute("data-qty-inc");
        if (!id || !store || typeof store.getState !== "function" || typeof store.updateItem !== "function") return;

        const st = store.getState();
        const it = st && Array.isArray(st.items) ? st.items.find((x) => x && x.lineId === id) : null;
        if (!it || it.category !== "accesorii" || !it.config || it.config.kind !== "simple") return;

        const unitPrice =
          (it.config && typeof it.config.pricePerUnit === "number" && it.config.pricePerUnit) ||
          (it.pricing && typeof it.pricing.unitPrice === "number" && it.pricing.unitPrice) ||
          0;

        const unit =
          (it.config && it.config.unit) ||
          (it.pricing && it.pricing.unitLabel) ||
          "buc";

        const qty = Math.max(1, (it.config.qty || 1) + 1);
        const total = Math.round(qty * unitPrice * 100) / 100;

        // update item: păstrăm restul câmpurilor, actualizăm doar config/pricing/display
        const patch = {
          config: Object.assign({}, it.config, { qty, unit, pricePerUnit: unitPrice }),
          pricing: Object.assign({}, it.pricing, { quantity: qty, total, unitLabel: unit, unitPrice }),
          display: it.display ? Object.assign({}, it.display) : undefined
        };

        if (patch.display && Array.isArray(patch.display.details)) {
          const rest = patch.display.details.filter((d) => !String(d).toLowerCase().startsWith("cantitate:"));
          patch.display.details = [`Cantitate: ${qty} ${unit}`, ...rest];
        }

        store.updateItem(id, patch);
        return;
      }

      // 3) QTY DEC (accesorii simple)
      const decBtn = e.target.closest("[data-qty-dec]");
      if (decBtn) {
        const id = decBtn.getAttribute("data-qty-dec");
        if (!id || !store || typeof store.getState !== "function" || typeof store.updateItem !== "function") return;

        const st = store.getState();
        const it = st && Array.isArray(st.items) ? st.items.find((x) => x && x.lineId === id) : null;
        if (!it || it.category !== "accesorii" || !it.config || it.config.kind !== "simple") return;

        const unitPrice =
          (it.config && typeof it.config.pricePerUnit === "number" && it.config.pricePerUnit) ||
          (it.pricing && typeof it.pricing.unitPrice === "number" && it.pricing.unitPrice) ||
          0;

        const unit =
          (it.config && it.config.unit) ||
          (it.pricing && it.pricing.unitLabel) ||
          "buc";

        const qty = Math.max(1, (it.config.qty || 1) - 1);
        const total = Math.round(qty * unitPrice * 100) / 100;

        const patch = {
          config: Object.assign({}, it.config, { qty, unit, pricePerUnit: unitPrice }),
          pricing: Object.assign({}, it.pricing, { quantity: qty, total, unitLabel: unit, unitPrice }),
          display: it.display ? Object.assign({}, it.display) : undefined
        };

        if (patch.display && Array.isArray(patch.display.details)) {
          const rest = patch.display.details.filter((d) => !String(d).toLowerCase().startsWith("cantitate:"));
          patch.display.details = [`Cantitate: ${qty} ${unit}`, ...rest];
        }

        store.updateItem(id, patch);
        return;
      }

      // 4) EDIT (accesorii underlay + mocheta) -> deschide drawer cu lineId
      const editBtn = e.target.closest("[data-edit-line]");
      if (editBtn) {
        const id = editBtn.getAttribute("data-edit-line");
        if (!id || !store || typeof store.getState !== "function") return;

        const st = store.getState();
        const it = st && Array.isArray(st.items) ? st.items.find((x) => x && x.lineId === id) : null;
        if (!it) return;
        // Etapa M1: setează UI-ul de montaj în drawer în funcție de produsul editat
        setMontajMode(montajModeForCartItem(it));

        // accesorii (existing behavior)
        if (it.category === "accesorii") {
          const listProducts =
            (window.ELOGY && window.ELOGY.data && window.ELOGY.data.accesoriiProducts)
              ? window.ELOGY.data.accesoriiProducts
              : [];

          const product = listProducts.find((p) => p.id === it.productId);
          if (!product) return;

          window.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product, lineId: id } }));
          return;
        }

        // mocheta (NEW)
        if (it.category === "mocheta") {
          const listProducts =
            (window.ELOGY && window.ELOGY.data && window.ELOGY.data.mochetaProducts)
              ? window.ELOGY.data.mochetaProducts
              : [];

          const found = listProducts.find((p) => p.id === it.productId);
          if (!found) return;

          // add a lightweight category hint so drawer can ignore accesorii events
          const product = Object.assign({ category: "mocheta" }, found);

          window.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product, lineId: id } }));
          return;
        }

        // perdele / draperii (NEW)
        if (it.category === "perdele" || it.category === "draperii" || (it.config && it.config.kind === "perdele_draperii")) {
          const data = (window.ELOGY && window.ELOGY.data) ? window.ELOGY.data : {};

          const listProducts =
            it.category === "draperii"
              ? (data.draperiiProducts || [])
              : (data.perdeleProducts || []);

          let product = listProducts.find((p) => p.id === it.productId);

          // fallback pentru Jordan (dacă nu e în array)
          if (!product && data.jordanProduct && data.jordanProduct.id === it.productId) {
            product = { ...data.jordanProduct, category: it.category, type: "fabric" };
          }

          if (!product) return;

          // IMPORTANT: drawer-ul Perdele/Draperii ascultă pe document
          document.dispatchEvent(new CustomEvent("elogy:productselect", { detail: { product, lineId: id } }));
          return;
        }


      }

    });
  }


  function bindForm(itemsGetter) {
    const form = qs("[data-cart-form]");
    const payloadEl = qs("[data-cart-payload]");
    const submitBtn = qs("[data-cart-submit]");

    if (!form || !payloadEl) return;

    form.addEventListener("submit", (e) => {
      const items = itemsGetter();

      if (!items.length) {
        e.preventDefault();
        return;
      }

      // Dacă livrare: cere minim stradă + localitate + județ
      const f = getFulfillment();
      if (f === "delivery") {
        const a = deliveryData();
        const ok = a.strada && a.localitate && a.judet;
        if (!ok) {
          e.preventDefault();
          alert("Te rugăm completează minim: Stradă, Localitate, Județ (pentru livrare).");
          return;
        }
      }

      payloadEl.value = buildHumanPayload(items);

      // UX: disable to avoid double submit
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Se trimite…";
      }
    });
  }

  function init() {
    // fără store -> coș gol
    if (!store || typeof store.subscribe !== "function") {
      setEmpty(true);
      return;
    }

    bindFulfillmentUI();
    bindListActions();

    let latestItems = [];

    bindForm(() => latestItems);

    store.subscribe((state) => {
      const items = state && Array.isArray(state.items) ? state.items : [];
      latestItems = items;

      const isEmpty = items.length === 0;

      // IMPORTANT: întâi randăm conținutul
      if (!isEmpty) {
        renderList(items);
        setMeta(items.length);
        setSubtotal(items);
      }

      // abia apoi togglăm empty/grid
      setEmpty(isEmpty);
    });

  }

  document.addEventListener("DOMContentLoaded", init);
})();
