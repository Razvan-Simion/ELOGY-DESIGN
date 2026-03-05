(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const money = NS.money || {};
  const store = NS.cartStore;

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

  // Rotunjire la 0.1 ml
  function round01(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.round(v * 10) / 10;
  }

  function normalizeCm(v, min = 50) {
    let n = Math.round(clampNum(v));
    if (!Number.isFinite(n)) n = min;
    if (n < min) n = min;
    return n;
  }

  function normalizeMl(v) {
    let n = clampNum(v);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0.1) n = 0.1;
    return round01(n);
  }

  function isPerdele(p) { return p && p.category === "perdele"; }
  function isDraperii(p) { return p && p.category === "draperii"; }
  function typeLabel(p) { return isPerdele(p) ? "Perdele" : isDraperii(p) ? "Draperii" : "Produs"; }

  function getJordan() {
    return (NS.data && NS.data.jordanProduct) ? NS.data.jordanProduct : null;
  }
  function isJordanStandalone(p) {
    const j = getJordan();
    return !!(j && p && p.id === j.id);
  }

  function defaultJordanStandaloneColorId(p) {
    const colors = (p && p.specs && Array.isArray(p.specs.colors)) ? p.specs.colors : [];
    if (!colors.length) return null;

    const defId = (p && p.specs && p.specs.defaultColorId) ? String(p.specs.defaultColorId) : null;
    if (defId && colors.some((c) => c && c.id === defId)) return defId;

    return colors[0] && colors[0].id ? String(colors[0].id) : null;
  }

  function getJordanStandaloneSelectedImages(p) {
    // Doar pentru Jordan cumpărat ca produs curent (standalone)
    if (!isJordanStandalone(p)) return null;

    const colors = (p && p.specs && Array.isArray(p.specs.colors)) ? p.specs.colors : [];
    if (!colors.length) return null;

    const selId = cfg.fabricColor || defaultJordanStandaloneColorId(p);
    if (!selId) return null;

    const c = colors.find((x) => x && String(x.id) === String(selId));
    const imgs = (c && Array.isArray(c.images)) ? c.images.filter(Boolean).map(String) : [];

    return imgs.length ? imgs : null;
  }

  function getJordanColorLabelById(p, colorId) {
    const colors = (p && p.specs && Array.isArray(p.specs.colors)) ? p.specs.colors : [];
    const c = colors.find((x) => x && String(x.id) === String(colorId));
    return c && c.label ? String(c.label) : "";
  }

  function factorSpec(p) {
    if (isPerdele(p)) return { min: 2.0, max: 3.5, def: 2.5, rec: 2.5 };
    if (isDraperii(p)) return { min: 1.5, max: 2.5, def: 2, rec: 2.0 };
    return { min: 1.0, max: 4.0, def: 2.0, rec: 2.0 };
  }

  // DOM contract shared
  const drawer = () => qs("[data-product-drawer]");
  const panel = () => qs("[data-product-drawer-panel]");
  const fieldsWrap = () => qs("[data-product-drawer-fields]");
  const titleEl = () => qs("[data-product-drawer-title]");
  const typeEl = () => qs("[data-product-drawer-type]");
  const descEl = () => qs("[data-product-drawer-desc]");
  const priceEl = () => qs("[data-product-drawer-price]");
  const subEl = () => qs("[data-product-drawer-sub]");
  const actionBtn = () => qs("[data-product-add-to-cart]");

  let currentProduct = null;
  let editingLineId = null;
  let lastFocus = null;

  const cfg = {
    orderType: "material",           // "material" | "worked"
    railCm: 200,                     // lungime șină/bară (cm)
    exactMaterial: false,
    exactMl: 5.0,
    factor: 2.5,
    specialHeightConsult: false,

    positionLabel: "",               // NEW

    // Montaj (simple) pentru Perdele/Draperii/Jordan
    montageCurtainsRequested: false,
    montageRailRequested: false,

    trackType: "sina",               // "none" | "galerie" | "sina"
    // Cale de rulare când "Nu există" -> chooser (doresc vs nu doresc)
    railChoice: "no",                // "want" | "no"
    railProductId: null,             // id din accesorii (sina/galerie) dacă railChoice="want"
    measurementsRequested: false,
    heightCm: 250,

    sewingOption: "creion",          // "creion" | "bara" | "capse" | "none"
    piecesMode: "1",                 // "1" | "2" | "more"
    piecesMore: 3,

    liningJordan: false,
    liningColor: "alb_01",

    // Jordan standalone (NU are legătură cu liningColor)
    fabricColor: null,

    surplusNotes: "",                // MVP: request-only info
  };

  function openDrawer() {
    const d = drawer();
    if (!d) return;
    lastFocus = document.activeElement;
    d.hidden = false;
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => { if (panel()) panel().focus(); }, 0);
  }

  function closeDrawer() {
    const d = drawer();
    if (!d) return;
    d.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function setHeader(p) {
    if (titleEl()) titleEl().textContent = p.title || "Produs";
    if (descEl()) descEl().textContent = p.descriptionShort || "";
    if (typeEl()) typeEl().textContent = typeLabel(p);

    const media = qs(".pdrawer__media", panel());
    if (media) {
      media.classList.remove("media--grad-1", "media--grad-2", "media--grad-3");
      const v = p.mediaVariant;
      media.classList.add(v === 2 ? "media--grad-2" : v === 3 ? "media--grad-3" : "media--grad-1");
    }

    setMediaGallery(p);
  }

  // ================================
  // Media gallery (thumbs + prev/next)
  // ================================
  let galleryState = { images: [], index: 0 };

  function escAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function applyMediaSrc(src) {
    const root = drawer();
    if (!root) return;

    const medias = qsa(".pdrawer__media", root);

    medias.forEach((media) => {
      if (src) {
        media.style.backgroundImage = `url("${src}")`;
        media.classList.add("has-image");
        media.classList.remove("media--gradient");
      } else {
        media.style.backgroundImage = "";
        media.classList.remove("has-image");
        media.classList.add("media--gradient");
      }
    });
  }

  function renderThumbs() {
    const root = drawer();
    if (!root) return;

    const thumbsWraps = qsa("[data-pdrawer-thumbs]", root);
    const imgs = galleryState.images;

    thumbsWraps.forEach((thumbs) => {
      thumbs.innerHTML = imgs
        .map((src, i) => {
          const safe = escAttr(src);
          const active = i === galleryState.index ? " is-active" : "";
          return `<button type="button" class="pdrawer__thumb${active}" data-pdrawer-thumb="${i}" aria-label="Imagine ${i + 1}" style="background-image:url('${safe}')"></button>`;
        })
        .join("");
    });
  }

  function updateNav() {
    const root = drawer();
    if (!root) return;

    const prevs = qsa("[data-pdrawer-prev]", root);
    const nexts = qsa("[data-pdrawer-next]", root);
    const imgs = galleryState.images;

    prevs.forEach((prev) => (prev.disabled = galleryState.index <= 0));
    nexts.forEach((next) => (next.disabled = galleryState.index >= imgs.length - 1));
  }

  function setMediaGallery(p) {
    const root = drawer();

    // 1) Jordan standalone + mapping pe culori => ia imaginile din culoarea selectată
    // 2) fallback => p.images (comportament vechi)
    const mapped = getJordanStandaloneSelectedImages(p);
    const imgs = mapped
      ? mapped
      : ((p && Array.isArray(p.images)) ? p.images.filter(Boolean).map(String) : []);

    galleryState.images = imgs;
    galleryState.index = 0; // reset index când se schimbă setul de imagini

    // imagine principală (se aplică pe toate .pdrawer__media din drawer)
    applyMediaSrc(imgs[0] || "");

    // controls: unhide/hide pentru TOATE galeriile (panel + backdrop)
    if (root) {
      qsa("[data-pdrawer-gallery]", root).forEach((g) => {
        g.hidden = imgs.length <= 1;
      });
    }

    renderThumbs();
    updateNav();
  }

  function gotoImage(idx) {
    const imgs = galleryState.images;
    if (!imgs.length) return;

    const i = Math.max(0, Math.min(imgs.length - 1, Number(idx)));
    if (!Number.isFinite(i)) return;

    galleryState.index = i;
    applyMediaSrc(imgs[i] || "");
    renderThumbs();
    updateNav();
  }


  function calcQtyMl(p) {
    const rail = normalizeCm(cfg.railCm, 50);
    const spec = factorSpec(p);

    let factor = clampNum(cfg.factor);
    if (!Number.isFinite(factor)) factor = spec.def;
    factor = Math.max(spec.min, Math.min(spec.max, factor));

    if (cfg.exactMaterial) {
      return { qtyMl: normalizeMl(cfg.exactMl), mode: "exact", factor };
    }

    const ml = ((rail + 20) / 100) * factor;
    return { qtyMl: round01(ml), mode: "formula", factor };
  }

  function sewingRate(p) {
    // tarif / ml (cost cusut+prindere)
    // Reguli:
    // - Standard (fără Jordan ca lining): 
    // - Draperii NON-BLACKOUT + Jordan ca lining: 
    //   Jordan suprascrie complet tariful standard.
    if (cfg.orderType !== "worked") return 0;
    if (cfg.sewingOption === "none") return 0;

    const jordanActive = !!(cfg.liningJordan && canUseJordan(p));

    if (cfg.sewingOption === "capse") return jordanActive ? 62 : 52;
    return jordanActive ? 47 : 37; // creion + bara
  }

  function sewingQtyMultiplier(p) {
    // Pentru Jordan ca lining (doar draperii non-blackout): se coase draperia X + Jordan X => 2X
    return (cfg.orderType === "worked" && cfg.liningJordan && canUseJordan(p)) ? 2 : 1;
  }


  function canUseJordan(p) {
    // Jordan poate fi cumpărat ca material, dar nu are sens să fie folosit ca lining peste el însuși.
    const jordan = getJordan();
    if (jordan && p && p.id === jordan.id) return false;

    // doar draperii non-blackout
    return isDraperii(p) && p.flags && p.flags.nonBlackout && !p.flags.blackout;
  }


  function calcTotals(p) {
    const qty = calcQtyMl(p);
    const qtyMl = qty.qtyMl;

    const pricePerMl = clampNum(p.pricing && p.pricing.value);
    const material = round2(qtyMl * pricePerMl);

    let sewing = 0;
    if (cfg.orderType === "worked") {
      const rate = sewingRate(p);
      const mult = sewingQtyMultiplier(p);
      sewing = round2((qtyMl * mult) * rate);
    }


    let jordan = 0;
    const jordanP = getJordan();
    const jordanPrice = jordanP ? clampNum(jordanP.pricing && jordanP.pricing.value) : 35.45;

    if (cfg.orderType === "worked" && cfg.liningJordan && canUseJordan(p)) {
      jordan = round2(qtyMl * jordanPrice);
    }

    const total = round2(material + sewing + jordan);

    return {
      qtyMl,
      factorUsed: qty.factor,
      qtyMode: qty.mode,
      pricePerMl,
      material,
      sewing,
      jordan,
      jordanPricePerMl: jordanPrice,
      total
    };
  }

  function isValid(p) {
    if (!p) return false;

    const rail = normalizeCm(cfg.railCm, 50);
    if (rail < 50) return false;

    if (cfg.exactMaterial) {
      if (normalizeMl(cfg.exactMl) <= 0) return false;
    } else {
      const spec = factorSpec(p);
      const f = clampNum(cfg.factor);
      if (!(f >= spec.min && f <= spec.max)) return false;
    }

    if (cfg.orderType === "worked") {
      // Jordan color required if lining is on
      if (cfg.liningJordan && canUseJordan(p)) {
        if (!cfg.liningColor) return false;
      }
    }

    if (cfg.orderType === "worked" && cfg.trackType === "none") {
      if (cfg.railChoice === "want" && !cfg.railProductId) return false;
    }

    return true;
  }

  function getAccesoriiProducts() {
    const NS = window.ELOGY || {};
    const data = NS.data || {};
    return Array.isArray(data.accesoriiProducts) ? data.accesoriiProducts : [];
  }

  function trackAppliesToProduct(acc, p) {
    const applies = acc && Array.isArray(acc.appliesTo) ? acc.appliesTo : [];
    // dacă produsul e perdele/draperii, filtrăm și după appliesTo; altfel (ex Jordan standalone) acceptăm universal
    if (isPerdele(p)) return applies.includes("perdele") || applies.includes("universal");
    if (isDraperii(p)) return applies.includes("draperii") || applies.includes("universal");
    return applies.includes("universal") || applies.includes("perdele") || applies.includes("draperii");
  }

  function getTrackAccessoriesForProduct(p) {
    const all = getAccesoriiProducts();
    // doar tipurile care reprezintă efectiv cale de rulare:
    // - sine_kit
    // - galerie_bara
    return all
      .filter((x) => x && x.category === "accesorii")
      .filter((x) => x.type === "sine_kit" || x.type === "galerie_bara")
      .filter((x) => trackAppliesToProduct(x, p));
  }

  function getAccessoryTitleById(id) {
    const all = getAccesoriiProducts();
    const a = all.find((x) => x && String(x.id) === String(id));
    return a && a.title ? String(a.title) : "";
  }


  function getAccessoryById(id) {
    const all = getAccesoriiProducts();
    return all.find((x) => x && String(x.id) === String(id)) || null;
  }

  function inferTrackTypeFromRailProductId(p) {
    // Certitudine doar când avem un produs ales din accesorii.
    if (!cfg.railProductId) return null;

    const acc = getAccessoryById(cfg.railProductId);
    if (!acc) return null;

    // În arhivă, "cale de rulare" este modelată prin type:
    // - sine_kit => șină
    // - galerie_bara => galerie
    if (acc.type === "sine_kit") return "sina";
    if (acc.type === "galerie_bara") return "galerie";

    return null;
  }

  function effectiveTrackTypeForSewing(p) {
    // trackType cert direct
    if (cfg.trackType === "sina" || cfg.trackType === "galerie") return cfg.trackType;

    // trackType necunoscut => cert doar dacă user a ales o cale de rulare din accesorii
    if (cfg.trackType === "none" && cfg.railChoice === "want" && cfg.railProductId) {
      return inferTrackTypeFromRailProductId(p);
    }

    // necunoscut (ex: trackType=none + railChoice=no, sau want fără produs ales)
    return null;
  }

  function allowedSewingOptionsForTrack(effectiveTrackType) {
    // IMPORTANT: nu inventăm opțiuni/câmpuri noi; folosim exact ce există deja în cfg.sewingOption
    if (effectiveTrackType === "sina") return ["creion"];
    // galerie sau necunoscut => nu filtrăm: creion/bara/capse
    return ["creion", "bara", "capse"];
  }

  function ensureCompatibleSewingOption(p) {
    // Rejansă/prindere obligatorie pentru material lucrat
    if (cfg.orderType !== "worked") return;

    if (!cfg.sewingOption || cfg.sewingOption === "none") {
      cfg.sewingOption = "creion";
    }

    const eff = effectiveTrackTypeForSewing(p);

    // Regula ta: NU resetăm când tipul e necunoscut (ex: railChoice=no)
    if (!eff) return;

    const allowed = allowedSewingOptionsForTrack(eff);
    if (!allowed.includes(cfg.sewingOption)) {
      cfg.sewingOption = allowed[0]; // default compatibil (creion)
    }
  }



  function buildFieldsHTML(p) {
    const spec = factorSpec(p);
    const h = (p.specs && Number(p.specs.fabricHeightM)) ? p.specs.fabricHeightM : null;

    const jordan = getJordan();
    const jordanColors = (jordan && jordan.specs && Array.isArray(jordan.specs.colors)) ? jordan.specs.colors : [
      { id: "alb_01", label: "Alb 01" },
      { id: "bej_06", label: "Bej 06" },
      { id: "gri_gy", label: "Gri GY" }
    ];

    const jordanOptions = jordanColors
      .map((c) => `<option value="${c.id}" ${cfg.liningColor === c.id ? "selected" : ""}>${c.label}</option>`)
      .join("");
    const jordanStandaloneOptions = jordanColors
      .map((c) => `<option value="${c.id}" ${cfg.fabricColor === c.id ? "selected" : ""}>${c.label}</option>`)
      .join("");

    const showJordanStandaloneColor = isJordanStandalone(p);
    const showWorked = cfg.orderType === "worked";
    const showJordan = showWorked && canUseJordan(p);
    const showHeight = showWorked && !cfg.measurementsRequested;
    // Pentru draperii non-blackout cu Jordan ca lining afișăm tarifele corecte (Jordan suprascrie standardul)
    const rateCreionBara = (showWorked && cfg.liningJordan && canUseJordan(p)) ? 47 : 37;
    const rateCapsa = (showWorked && cfg.liningJordan && canUseJordan(p)) ? 62 : 52;


    const galleryOptions = `
      <label class="field__label" style="display:block; margin-bottom:6px;">Sistem de prindere (per ml)</label>
      <label style="display:flex; gap:10px; align-items:flex-start;">
        <input type="radio" name="sewingOpt" value="creion" ${cfg.sewingOption === "creion" ? "checked" : ""} data-fab-sewingopt />
        <span>
          Rejansă tip creion 10 cm — <strong>${rateCreionBara} lei/ml</strong><br/>
          <span class="field__hint">inclus cusut + rejansă</span>
        </span>
      </label>

      <label style="display:flex; gap:10px; align-items:flex-start; margin-top:8px;">
        <input type="radio" name="sewingOpt" value="bara" ${cfg.sewingOption === "bara" ? "checked" : ""} data-fab-sewingopt />
        <span>
          Rejansă specială pentru bară — <strong>${rateCreionBara} lei/ml</strong><br/>
          <span class="field__hint">inclus cusut + rejansă</span>
        </span>
      </label>

      <label style="display:flex; gap:10px; align-items:flex-start; margin-top:8px;">
        <input type="radio" name="sewingOpt" value="capse" ${cfg.sewingOption === "capse" ? "checked" : ""} data-fab-sewingopt />
        <span>
          Inele tip capsa — <strong>${rateCapsa} lei/ml</strong><br/>
          <span class="field__hint">inele + cusut</span>
        </span>
      </label>
    `;

    const railOptions = `
      <label class="field__label" style="display:block; margin-bottom:6px;">Sistem de prindere (per ml)</label>
      <label style="display:flex; gap:10px; align-items:flex-start;">
        <input type="radio" name="sewingOpt" value="creion" ${cfg.sewingOption === "creion" ? "checked" : ""} data-fab-sewingopt />
        <span>
          Rejansă tip creion 10 cm — <strong>${rateCreionBara} lei/ml</strong><br/>
          <span class="field__hint">inclus cusut + rejansă</span>
        </span>
      </label>
    `;

    const piecesMoreHidden = cfg.piecesMode !== "more";

    return `
      <!-- A) Tip comandă -->
      <div class="field">
        <span class="field__label">Tip comandă <span aria-hidden="true">*</span></span>

        <label style="display:flex; gap:10px; align-items:center;">
          <input type="radio" name="orderType" value="material" ${cfg.orderType === "material" ? "checked" : ""} data-fab-ordertype />
          <span>Doresc doar material</span>
        </label>

        <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
          <input type="radio" name="orderType" value="worked" ${cfg.orderType === "worked" ? "checked" : ""} data-fab-ordertype />
          <span>Doresc material lucrat (cusut)</span>
        </label>
      </div>
      <!-- A2) Culoare (doar Jordan standalone) -->
      <div class="field" ${showJordanStandaloneColor ? "" : "hidden"}>
        <label class="field__label" for="fab-fabriccolor">Culoare</label>
        <select class="field__control" id="fab-fabriccolor" data-fab-fabriccolor>
          ${jordanStandaloneOptions}
        </select>
      </div>

      <!-- B) Dimensiuni & cantitate -->
      <div class="field">
        <label class="field__label" for="fab-rail">Lungime șină / bară (cm)</label>
        <input class="field__control" id="fab-rail" type="number" min="50" step="1"
          value="${normalizeCm(cfg.railCm, 50)}" inputmode="numeric" data-fab-rail />
        <p class="field__hint">Minim 50 cm. În calculul automat adăugăm +20 cm.</p>
      </div>

      <div class="field">
        <label style="display:flex; gap:10px; align-items:center;">
          <input type="checkbox" ${cfg.exactMaterial ? "checked" : ""} data-fab-exact />
          <span>Vreau dimensiune exactă de material</span>
        </label>
        <p class="field__hint">Când e bifat: introduci ml direct și nu aplicăm +20 cm și factorul.</p>
      </div>

      <div class="field" ${cfg.exactMaterial ? "" : "hidden"}>
        <label class="field__label" for="fab-ml">Cantitate material (ml)</label>
        <input class="field__control" id="fab-ml" type="number" min="0.1" step="0.1"
          value="${normalizeMl(cfg.exactMl)}" inputmode="decimal" data-fab-ml />
        <p class="field__hint">Rotunjire automată la 0.1 ml.</p>
      </div>

      <div class="field" ${cfg.exactMaterial ? "hidden" : ""}>
        <label class="field__label" for="fab-factor">Factor de multiplicare</label>
        <input class="field__control" id="fab-factor" type="number"
          min="${spec.min}" max="${spec.max}" step="0.1"
          value="${Number(cfg.factor).toFixed(1)}" inputmode="decimal" data-fab-factor />
        <p class="field__hint">
          Interval: ${spec.min.toFixed(1)}–${spec.max.toFixed(1)}. Recomandare: ${Number.isInteger(spec.rec) ? spec.rec.toFixed(0) : spec.rec.toFixed(1)}.

        </p>
      </div>

      <div class="field">
        <p class="field__hint" style="margin:0;">
          <strong>Înălțime material:</strong> ${h != null ? `${h.toFixed(1)} m` : "—"}
        </p>
      </div>

      <div class="field">
        <label style="display:flex; gap:10px; align-items:center;">
          <input type="checkbox" ${cfg.specialHeightConsult ? "checked" : ""} data-fab-special />
          <span>Am o înălțime mai mare și vreau să discut cu un consultant ELOGY DESIGN</span>
        </label>
      </div>

      <!-- C) Etichetă poziție -->
      <div class="field">
        <label class="field__label" for="fab-pos">Etichetă poziție (opțional)</label>
        <input class="field__control" id="fab-pos" type="text"
          placeholder="Geam living / Ușă balcon / Dormitor" value="${(cfg.positionLabel || "").replaceAll('"', "&quot;")}" data-fab-position />
        <p class="field__hint">Apare în coș pentru a diferenția ferestrele.</p>
      </div>

      <!-- D) Stil & prindere (doar lucrat) -->
      <div class="field" ${showWorked ? "" : "hidden"}>
        <span class="field__label">Tip cale de rulare</span>

        <label style="display:flex; gap:10px; align-items:center;">
          <input type="radio" name="trackType" value="none" ${cfg.trackType === "none" ? "checked" : ""} data-fab-track />
          <span>Nu există</span>
        </label>

        <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
          <input type="radio" name="trackType" value="galerie" ${cfg.trackType === "galerie" ? "checked" : ""} data-fab-track />
          <span>Galerie (bară)</span>
        </label>

        <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
          <input type="radio" name="trackType" value="sina" ${cfg.trackType === "sina" ? "checked" : ""} data-fab-track />
          <span>Șină</span>
        </label>

        <p class="field__hint" style="margin-top:8px;" ${cfg.trackType === "none" ? "" : "hidden"}>
          Nu există cale de rulare? Alege una dintre opțiunile de mai jos.
        </p>
      </div>

      <!-- D2) Chooser "Nu există" -> doresc / nu doresc -->
      <div class="field" ${showWorked && cfg.trackType === "none" ? "" : "hidden"}>
        <label style="display:flex; gap:10px; align-items:center;">
          <input type="radio" name="railChoice" value="want" ${cfg.railChoice === "want" ? "checked" : ""} data-fab-railchoice />
          <span>Doresc cale de rulare</span>
        </label>

        <div style="margin-left:26px; margin-top:10px;" ${cfg.railChoice === "want" ? "" : "hidden"}>
          <label class="field__label" for="fab-railproduct">Alege cale de rulare (din accesorii)</label>
          <select class="field__control" id="fab-railproduct" data-fab-railproduct>
            <option value="">Alege…</option>
            ${getTrackAccessoriesForProduct(p).map((a) =>
      `<option value="${a.id}" ${String(cfg.railProductId) === String(a.id) ? "selected" : ""}>${a.title}</option>`
    ).join("")}
          </select>

          <p class="field__hint" style="margin-top:8px;" >Costul accesoriilor și al montajului se confirmă ulterior.</p>
        </div>

        <label style="display:flex; gap:10px; align-items:center; margin-top:12px;">
          <input type="radio" name="railChoice" value="no" ${cfg.railChoice === "no" ? "checked" : ""} data-fab-railchoice />
          <span>Nu doresc cale de rulare (confirmăm împreună)</span>
        </label>
      </div>

      <div class="field" ${showWorked ? "" : "hidden"}>
        <label style="display:flex; gap:10px; align-items:center;">
          <input type="checkbox" ${cfg.measurementsRequested ? "checked" : ""} data-fab-measure />
          <span>Doresc măsurători realizate de ELOGY DESIGN</span>
        </label>

        <p class="field__hint" ${cfg.measurementsRequested ? "" : "hidden"}>
          Cost măsurători: • București: gratuite • Ilfov: 50 lei • Alte localități: estimare în funcție de distanță
        </p>
      </div>

      <div class="field" ${showHeight ? "" : "hidden"}>
        <label class="field__label" for="fab-h">Înălțime (cm)</label>
        <input class="field__control" id="fab-h" type="number" min="50" step="1"
          value="${normalizeCm(cfg.heightCm, 50)}" inputmode="numeric" data-fab-height />
        <p class="field__hint">Recomandare: măsoară din punctul de prindere până la podea/locul dorit.</p>
      </div>

      <div class="field" ${showWorked && !cfg.measurementsRequested ? "" : "hidden"}>
        <p class="field__hint" style="margin:0;">
          Clientul este responsabil pentru corectitudinea dimensiunilor introduse. ELOGY DESIGN nu este responsabilă
          pentru diferențele dintre dimensiunile introduse și situația din teren.
        </p>
      </div>

      <!-- E) Cusut & opțiuni (doar lucrat) -->
      <div class="field" ${showWorked ? "" : "hidden"}>
        ${(() => {
        const eff = effectiveTrackTypeForSewing(p);
        // Filtrare doar când e cert:
        // - șină => doar creion
        // - galerie => toate 3
        // - necunoscut (none + railChoice=no sau want fără produs) => toate 3 (NU filtrăm)
        return (eff === "sina") ? railOptions : galleryOptions;
      })()}
      </div>

      <div class="field" ${showWorked ? "" : "hidden"}>
        <span class="field__label">Număr de bucăți</span>

        <label style="display:flex; gap:10px; align-items:center;">
          <input type="radio" name="piecesMode" value="1" ${cfg.piecesMode === "1" ? "checked" : ""} data-fab-piecesmode />
          <span>1 bucată</span>
        </label>

        <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
          <input type="radio" name="piecesMode" value="2" ${cfg.piecesMode === "2" ? "checked" : ""} data-fab-piecesmode />
          <span>2 bucăți</span>
        </label>

        <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
          <input type="radio" name="piecesMode" value="more" ${cfg.piecesMode === "more" ? "checked" : ""} data-fab-piecesmode />
          <span>Mai multe</span>
        </label>

        <div class="field" style="margin-top:10px;" ${piecesMoreHidden ? "hidden" : ""}>
          <label class="field__label" for="fab-piecesmore">Număr bucăți</label>
          <input class="field__control" id="fab-piecesmore" type="number" min="3" step="1"
            value="${Math.max(3, Math.round(clampNum(cfg.piecesMore) || 3))}" inputmode="numeric" data-fab-piecesmore />
        </div>
      </div>

      <div class="field" ${showJordan ? "" : "hidden"}>
        <label style="display:flex; gap:10px; align-items:center;">
          <input type="checkbox" ${cfg.liningJordan ? "checked" : ""} data-fab-lining />
          <span>Doresc căptușeală Jordan</span>
        </label>

        <div class="field" style="margin-top:10px;" ${cfg.liningJordan ? "" : "hidden"}>
          <label class="field__label" for="fab-liningcolor">Culoare Jordan</label>
          <select class="field__control" id="fab-liningcolor" data-fab-liningcolor>
            ${jordanOptions}
          </select>
          <p class="field__hint">Cantitatea Jordan = cantitatea draperiei (se coase draperia X + Jordan X = 2X ml). La cusut se aplică tariful: ${rateCreionBara} lei/ml (rejansă) sau ${rateCapsa} lei/ml (capse).</p>

        </div>
      </div>

      <!-- F) Surplus (MVP: request-only info) -->
      <div class="field" ${showWorked ? "" : "hidden"}>
        <label class="field__label" for="fab-surplus">Cordoane / perne decorative ( contra cost )</label>
        <textarea class="field__control field__control--textarea" id="fab-surplus"
          placeholder="Cordoane, perne decorative, preferințe de execuție…"
          data-fab-surplus>${(cfg.surplusNotes || "")}</textarea>
      </div>
    `;
  }

  function bindFieldEvents(p) {
    const root = panel();

    const update = () => {
      // IMPORTANT: compatibilitate doar pentru worked;
      // resetăm DOAR când tipul e cert; NU resetăm când e necunoscut (railChoice=no).
      ensureCompatibleSewingOption(p);

      updateTotals(p);
      // re-render fields for conditional visibility
      const wrap = fieldsWrap();
      if (!wrap) return;
      wrap.innerHTML = buildFieldsHTML(p);
      bindFieldEvents(p);
      updateTotals(p);
    };

    qsa("[data-fab-ordertype]", root).forEach((r) => {
      r.addEventListener("change", () => {
        cfg.orderType = r.value === "worked" ? "worked" : "material";

        // defaults when switching
        if (cfg.orderType === "material") {
          cfg.measurementsRequested = false;
          cfg.liningJordan = false;
        } else {
          // sensible defaults
          cfg.trackType = cfg.trackType || "sina";
          if (!cfg.sewingOption || cfg.sewingOption === "none") cfg.sewingOption = "creion";
          ensureCompatibleSewingOption(p);
        }
        update();
      });
    });

    const rail = qs("[data-fab-rail]", root);
    if (rail) rail.addEventListener("input", () => { cfg.railCm = clampNum(rail.value); updateTotals(p); });

    const exact = qs("[data-fab-exact]", root);
    if (exact) exact.addEventListener("change", () => { cfg.exactMaterial = !!exact.checked; update(); });

    const ml = qs("[data-fab-ml]", root);
    if (ml) ml.addEventListener("input", () => { cfg.exactMl = clampNum(ml.value); updateTotals(p); });

    const factor = qs("[data-fab-factor]", root);
    if (factor) factor.addEventListener("input", () => { cfg.factor = clampNum(factor.value); updateTotals(p); });

    const special = qs("[data-fab-special]", root);
    if (special) special.addEventListener("change", () => { cfg.specialHeightConsult = !!special.checked; updateTotals(p); });

    const pos = qs("[data-fab-position]", root);
    if (pos) pos.addEventListener("input", () => { cfg.positionLabel = String(pos.value || "").slice(0, 80); });

    const fabricColor = qs("[data-fab-fabriccolor]", root);
    if (fabricColor) {
      fabricColor.addEventListener("change", () => {
        cfg.fabricColor = fabricColor.value || null;

        // comută automat galeria pe imaginile culorii alese (și resetează index=0)
        setMediaGallery(p);

        updateTotals(p);
      });
    }

    // D) Tip cale de rulare (șină / galerie / nu există)
    qsa("[data-fab-track]", root).forEach((r) => {
      r.addEventListener("change", () => {
        cfg.trackType = r.value || "none";

        // Rejansă/prindere obligatorie pentru worked.
        // Resetăm doar când tipul e cert; când e necunoscut (none + railChoice=no) nu resetăm.
        ensureCompatibleSewingOption(p);

        update(); // re-render + revalidare
      });
    });

    // D2) Chooser "Nu există" -> doresc / nu doresc (doar UI + state)
    qsa("[data-fab-railchoice]", root).forEach((r) => {
      r.addEventListener("change", () => {
        cfg.railChoice = (r.value === "want") ? "want" : "no";

        if (cfg.railChoice !== "want") {
          cfg.railProductId = null;
        }

        ensureCompatibleSewingOption(p);

        update(); // important: re-render + revalidare
      });
    });

    // D2b) Select cale de rulare din accesorii
    const railProd = qs("[data-fab-railproduct]", root);
    if (railProd) {
      railProd.addEventListener("change", () => {
        cfg.railProductId = railProd.value || null;

        ensureCompatibleSewingOption(p);

        // IMPORTANT: trebuie update() (nu doar updateTotals),
        // altfel rămâne butonul blocat până când schimbi altceva.
        update();
      });
    }

    const measure = qs("[data-fab-measure]", root);
    if (measure) measure.addEventListener("change", () => { cfg.measurementsRequested = !!measure.checked; update(); });

    const h = qs("[data-fab-height]", root);
    if (h) h.addEventListener("input", () => { cfg.heightCm = clampNum(h.value); updateTotals(p); });

    qsa("[data-fab-sewingopt]", root).forEach((r) => {
      r.addEventListener("change", () => { cfg.sewingOption = r.value || "creion"; updateTotals(p); });
    });

    qsa("[data-fab-piecesmode]", root).forEach((r) => {
      r.addEventListener("change", () => {
        cfg.piecesMode = r.value || "1";
        update();
      });
    });

    const more = qs("[data-fab-piecesmore]", root);
    if (more) more.addEventListener("input", () => { cfg.piecesMore = clampNum(more.value); updateTotals(p); });

    const lining = qs("[data-fab-lining]", root);
    if (lining) lining.addEventListener("change", () => { cfg.liningJordan = !!lining.checked; update(); });

    const liningColor = qs("[data-fab-liningcolor]", root);
    if (liningColor) liningColor.addEventListener("change", () => { cfg.liningColor = liningColor.value || "alb_01"; updateTotals(p); });

    const surplus = qs("[data-fab-surplus]", root);
    if (surplus) surplus.addEventListener("input", () => { cfg.surplusNotes = String(surplus.value || ""); });

    // Montaj (simple) – 2 bife (Perdele/Draperii/Jordan)
    const mCurtains = qs("[data-simple-montaj-curtains]", root);
    if (mCurtains) {
      mCurtains.checked = !!cfg.montageCurtainsRequested;
      mCurtains.addEventListener("change", () => {
        cfg.montageCurtainsRequested = !!mCurtains.checked;
        updateTotals(p);
      });
    }

    const mRail = qs("[data-simple-montaj-rail]", root);
    if (mRail) {
      mRail.checked = !!cfg.montageRailRequested;
      mRail.addEventListener("change", () => {
        cfg.montageRailRequested = !!mRail.checked;
        updateTotals(p);
      });
    }


  }

  function updateTotals(p) {
    if (!p) return;

    const t = calcTotals(p);

    if (priceEl()) priceEl().textContent = `${formatRON(t.total)} (estimativ)`;

    const lines = [];
    lines.push(`Cantitate material: ${t.qtyMl.toLocaleString("ro-RO")} ml`);
    lines.push(`Material: ${formatRON(t.material)}`);

    if (cfg.orderType === "worked") {
      lines.push(`Cusut/prindere: ${formatRON(t.sewing)}`);
      if (cfg.liningJordan && canUseJordan(p)) lines.push(`Căptușeală Jordan: ${formatRON(t.jordan)}`);
      if (cfg.measurementsRequested) lines.push(`Măsurători: București gratuite / Ilfov 50 lei / Alte localități estimare`);
      lines.push(`Montaj/transport: se confirmă`);
    }

    if (cfg.specialHeightConsult) lines.push(`Dimensiune specială: DA (consultant)`);

    if (subEl()) subEl().innerHTML = lines.map((x) => `• ${x}`).join("<br/>");

    if (actionBtn()) actionBtn().disabled = !isValid(p);
  }

  function piecesCount() {
    if (cfg.piecesMode === "2") return 2;
    if (cfg.piecesMode === "more") return Math.max(3, Math.round(clampNum(cfg.piecesMore) || 3));
    return 1;
  }

  function buildCartItem(p) {
    const totals = calcTotals(p);
    const qtyMl = totals.qtyMl;

    const details = [];
    if (cfg.positionLabel && cfg.positionLabel.trim()) details.push(`Poziție: ${cfg.positionLabel.trim()}`);

    details.push(`Cantitate: ${qtyMl.toLocaleString("ro-RO")} ml`);
    if (!cfg.exactMaterial) details.push(`Factor: ${Number(cfg.factor).toFixed(1)} (recomandat: ${factorSpec(p).rec.toFixed(0)})`);
    details.push(`Înălțime material: ${(p.specs && p.specs.fabricHeightM) ? `${Number(p.specs.fabricHeightM).toFixed(1)} m` : "—"}`);

    // Jordan standalone: afișăm culoarea aleasă (NU are legătură cu liningColor)
    if (isJordanStandalone(p)) {
      const colorId = cfg.fabricColor || defaultJordanStandaloneColorId(p);
      const colorLabel = colorId ? getJordanColorLabelById(p, colorId) : "";
      if (colorLabel) details.push(`Culoare: ${colorLabel}`);
    }

    if (cfg.orderType === "worked") {
      if (cfg.trackType === "none") {
        if (cfg.railChoice === "want") {
          const lbl = cfg.railProductId ? getAccessoryTitleById(cfg.railProductId) : "";
          details.push(`Cale de rulare: ${lbl || "Doresc (de confirmat)"}`);
        } else {
          details.push(`Cale de rulare: Nu doresc (confirmăm împreună)`);
        }
      } else {
        details.push(`Cale de rulare: ${cfg.trackType === "sina" ? "Șină" : "Galerie"}`);
      }
      {
        const optLabel =
          cfg.sewingOption === "capse" ? "Inele tip capsa" :
            cfg.sewingOption === "bara" ? "Rejansă specială pentru bară" :
              (cfg.sewingOption === "none" ? "de stabilit" : "Rejansă tip creion 10 cm");
        details.push(`Prindere: ${optLabel}`);
      }

      details.push(`Bucăți: ${piecesCount()}`);

      if (cfg.measurementsRequested) details.push(`Măsurători: solicitate`);
      else details.push(`Înălțime introdusă: ${normalizeCm(cfg.heightCm, 50)} cm`);

      if (cfg.liningJordan && canUseJordan(p)) {
        details.push(`Căptușeală Jordan: DA (${cfg.liningColor})`);
      }
    } else {
      details.push(`Tip comandă: doar material`);
    }

    if (cfg.specialHeightConsult) details.push(`Dimensiune specială: DA`);

    if (cfg.montageCurtainsRequested) {
      details.push(`Montaj perdele/draperii: Solicitat (cost stabilit ulterior, evaluare)`);
    }
    if (cfg.montageRailRequested) {
      details.push(`Montaj cale de rulare: Solicitat (cost stabilit ulterior, evaluare)`);
    }

    return {
      category: p.category,              // "perdele" | "draperii"
      productId: p.id,
      title: p.title,
      type: "fabric",
      config: {
        kind: "perdele_draperii",
        orderType: cfg.orderType,

        railCm: normalizeCm(cfg.railCm, 50),
        exactMaterial: !!cfg.exactMaterial,
        exactMl: cfg.exactMaterial ? normalizeMl(cfg.exactMl) : null,
        factor: cfg.exactMaterial ? null : Number(cfg.factor),
        qtyMl: qtyMl,

        fabricHeightM: (p.specs && Number(p.specs.fabricHeightM)) ? Number(p.specs.fabricHeightM) : null,
        specialHeightConsult: !!cfg.specialHeightConsult,

        positionLabel: (cfg.positionLabel || "").trim() || "",

        // Montaj (simple) pentru Perdele/Draperii/Jordan
        montageRequested: !!cfg.montageCurtainsRequested,
        railMontageRequested: !!cfg.montageRailRequested,


        trackType: cfg.orderType === "worked" ? cfg.trackType : null,
        // Cale de rulare chooser (doar când trackType = none)
        railChoice: (cfg.orderType === "worked" && cfg.trackType === "none") ? cfg.railChoice : null,
        railProductId: (cfg.orderType === "worked" && cfg.trackType === "none" && cfg.railChoice === "want") ? cfg.railProductId : null,
        railProductLabel: (cfg.orderType === "worked" && cfg.trackType === "none" && cfg.railChoice === "want" && cfg.railProductId)
          ? getAccessoryTitleById(cfg.railProductId)
          : null,
        measurementsRequested: cfg.orderType === "worked" ? !!cfg.measurementsRequested : false,
        heightCm: (cfg.orderType === "worked" && !cfg.measurementsRequested) ? normalizeCm(cfg.heightCm, 50) : null,

        sewingOption: cfg.orderType === "worked" ? cfg.sewingOption : null,
        sewingRate: cfg.orderType === "worked" ? sewingRate(p) : 0,
        sewingQtyMultiplier: cfg.orderType === "worked" ? sewingQtyMultiplier(p) : 1,


        pieces: cfg.orderType === "worked" ? piecesCount() : 1,

        liningJordan: (cfg.orderType === "worked" && canUseJordan(p)) ? !!cfg.liningJordan : false,
        liningColor: (cfg.orderType === "worked" && cfg.liningJordan && canUseJordan(p)) ? cfg.liningColor : null,

        // Jordan standalone (salvăm culoarea separat de lining)
        fabricColorId: isJordanStandalone(p) ? (cfg.fabricColor || defaultJordanStandaloneColorId(p)) : null,
        fabricColorLabel: isJordanStandalone(p)
          ? getJordanColorLabelById(p, cfg.fabricColor || defaultJordanStandaloneColorId(p))
          : null,

        surplusNotes: cfg.orderType === "worked" ? (cfg.surplusNotes || "") : "",
      },

      pricing: {
        estimated: true,
        currency: "RON",
        unitLabel: "ml",
        unitPrice: totals.pricePerMl,
        quantity: qtyMl,
        breakdown: {
          material: totals.material,
          sewing: totals.sewing,
          jordan: totals.jordan
        },
        total: totals.total
      },

      display: {
        title: p.title,
        subtitle: typeLabel(p),
        details
      },

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

    // defaults per product/category
    const fs = factorSpec(product);
    cfg.factor = fs.def;
    cfg.orderType = "worked";
    cfg.railCm = 400;
    cfg.exactMaterial = false;
    cfg.exactMl = 5.0;
    cfg.specialHeightConsult = false;
    cfg.positionLabel = "";

    cfg.trackType = "sina";
    cfg.railChoice = "no";
    cfg.railProductId = null;
    cfg.measurementsRequested = false;
    cfg.heightCm = 250;
    cfg.sewingOption = "creion";
    cfg.piecesMode = "1";
    cfg.piecesMore = 3;

    cfg.liningJordan = false;
    cfg.liningColor = "alb_01";

    // Montaj (simple) defaults
    cfg.montageCurtainsRequested = false;
    cfg.montageRailRequested = false;

    cfg.surplusNotes = "";

    // default doar când produsul curent este Jordan (standalone)
    cfg.fabricColor = isJordanStandalone(product) ? defaultJordanStandaloneColorId(product) : null;

    cfg.surplusNotes = "";

    if (!editingLineId || !store) return;

    const st = store.getState ? store.getState() : null;
    const it = st && Array.isArray(st.items) ? st.items.find((x) => x && x.lineId === editingLineId) : null;
    if (!it || it.productId !== product.id) return;

    const c = it.config || {};
    if (c.kind !== "perdele_draperii") return;

    cfg.orderType = (c.orderType === "worked") ? "worked" : "material";
    cfg.railCm = typeof c.railCm === "number" ? c.railCm : cfg.railCm;
    cfg.exactMaterial = !!c.exactMaterial;
    cfg.exactMl = typeof c.exactMl === "number" ? c.exactMl : cfg.exactMl;
    cfg.factor = typeof c.factor === "number" ? c.factor : cfg.factor;
    cfg.specialHeightConsult = !!c.specialHeightConsult;

    cfg.positionLabel = (c.positionLabel || "");

    cfg.trackType = c.trackType || cfg.trackType;
    cfg.railChoice = (c.railChoice === "want") ? "want" : "no";
    cfg.railProductId = c.railProductId || null;
    cfg.measurementsRequested = !!c.measurementsRequested;
    cfg.heightCm = typeof c.heightCm === "number" ? c.heightCm : cfg.heightCm;

    cfg.sewingOption = c.sewingOption || cfg.sewingOption;

    const pcs = typeof c.pieces === "number" ? c.pieces : 1;
    if (pcs === 1) cfg.piecesMode = "1";
    else if (pcs === 2) cfg.piecesMode = "2";
    else { cfg.piecesMode = "more"; cfg.piecesMore = Math.max(3, pcs); }

    cfg.liningJordan = !!c.liningJordan;
    cfg.liningColor = c.liningColor || cfg.liningColor;

    // Montaj (simple) restore
    cfg.montageCurtainsRequested = !!c.montageRequested;
    cfg.montageRailRequested = !!c.railMontageRequested;

    cfg.surplusNotes = c.surplusNotes || "";

    // Jordan standalone: restore culoare din coș
    if (isJordanStandalone(product)) {
      cfg.fabricColor = c.fabricColorId || cfg.fabricColor || defaultJordanStandaloneColorId(product);
    }

    cfg.surplusNotes = c.surplusNotes || "";
  }

  function setFields(p) {
    const wrap = fieldsWrap();
    if (!wrap) return;
    wrap.innerHTML = buildFieldsHTML(p);
    bindFieldEvents(p);
  }

  function bindGlobalEvents() {
    document.addEventListener("elogy:productselect", (e) => {

      const p = e.detail && e.detail.product;
      if (!p || !(p.category === "perdele" || p.category === "draperii")) return;

      const lineId = e.detail && e.detail.lineId ? String(e.detail.lineId) : null;

      loadEditState(lineId, p);
      setHeader(p);
      setFields(p);
      setActionMode();
      updateTotals(p);
      openDrawer();
    });

    qsa("[data-product-drawer-close]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        // dacă am dat click în card-ul media din blur, NU închidem drawer-ul
        if (e.target && e.target.closest && e.target.closest("[data-pdrawer-backdrop-media]")) return;
        closeDrawer();
      })
    );






    const d = drawer();
    if (d) {
      d.addEventListener("click", (e) => {
        const t = e.target;

        // dacă dai click în media din blur, NU închide drawer-ul
        if (t && t.closest && t.closest("[data-pdrawer-backdrop-media]")) {
          // doar blocăm propagarea către backdrop (care are data-product-drawer-close)
          // dar lăsăm handler-ele de thumbs/prev/next să funcționeze
        }

        const thumb = t && t.closest ? t.closest("[data-pdrawer-thumb]") : null;
        if (thumb) {
          e.preventDefault();
          e.stopPropagation();
          gotoImage(thumb.getAttribute("data-pdrawer-thumb"));
          return;
        }

        const prev = t && t.closest ? t.closest("[data-pdrawer-prev]") : null;
        if (prev) {
          e.preventDefault();
          e.stopPropagation();
          gotoImage(galleryState.index - 1);
          return;
        }

        const next = t && t.closest ? t.closest("[data-pdrawer-next]") : null;
        if (next) {
          e.preventDefault();
          e.stopPropagation();
          gotoImage(galleryState.index + 1);
          return;
        }

        // dacă click-ul e în card-ul din blur, nu îl lăsăm să ajungă la backdrop
        const inBackdropMedia = t && t.closest ? t.closest("[data-pdrawer-backdrop-media]") : null;
        if (inBackdropMedia) {
          e.stopPropagation();
          return;
        }
      });
    }





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

        // IMPORTANT: category perdele/draperii => store NU agregă (regula critică)
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
