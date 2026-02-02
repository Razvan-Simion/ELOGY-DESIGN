/* =========================================
   ELOGY Design – cart store (client-side)
   - single source of truth for selections
   - localStorage persisted (versioned)
   - no UI here (UI subscribes)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const storage = NS.storage;

  if (!storage) {
    // storage.js must load before cart.store.js
    console.warn("[ELOGY] storage missing. Load js/store/storage.js first.");
    return;
  }

  const SCHEMA_VERSION = storage.defaults.cartSchemaVersion;

  function nowISO() {
    return storage.nowISO();
  }

  function uid() {
    // Prefer crypto; fallback to timestamp+random
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return "li_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: nowISO(),
      items: [],
    };
  }

  function normalizeItem(raw) {
    // Keep minimal required fields; allow extra fields for future growth.
    if (!raw || typeof raw !== "object") return null;

    const lineId = typeof raw.lineId === "string" && raw.lineId ? raw.lineId : uid();

    const item = Object.assign({}, raw, { lineId });
    return item;
  }

  // --- Store core
  let state = (storage.loadCartState() || defaultState());
  const listeners = new Set();

  function emit() {
    const snapshot = getState();
    listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (e) {
        console.error("[ELOGY] cart subscriber error:", e);
      }
    });
  }

  function persist() {
    try {
      storage.saveCartState(state);
    } catch (_) {
      // storage handles errors internally
    }
  }

  function setState(next) {
    state = next;
    persist();
    emit();
  }

  function getState() {
    return clone(state);
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return function () {};
    listeners.add(fn);
    // Immediate call so UI can render without waiting
    try {
      fn(getState());
    } catch (_) {}
    return function unsubscribe() {
      listeners.delete(fn);
    };
  }

  // --- Mutations
function addItem(rawItem) {
  const item = normalizeItem(rawItem);
  if (!item) return null;

  const next = clone(state);

  // ✅ Agregare pentru accesorii simple:
  // - aceeași categorie + productId
  // - config.kind === "simple"
  // - aceeași unitate
  if (
    item.category === "accesorii" &&
    item.config && item.config.kind === "simple" &&
    typeof item.productId === "string" && item.productId
  ) {
    const unit = item.config.unit || (item.pricing && item.pricing.unitLabel) || "";

    const existingIdx = next.items.findIndex((it) =>
      it &&
      it.category === "accesorii" &&
      it.productId === item.productId &&
      it.config && it.config.kind === "simple" &&
      ((it.config.unit || (it.pricing && it.pricing.unitLabel) || "") === unit)
    );

    if (existingIdx !== -1) {
      const existing = next.items[existingIdx];

      const prevQty = (existing.config && typeof existing.config.qty === "number") ? existing.config.qty : 1;
      const addQty = (item.config && typeof item.config.qty === "number") ? item.config.qty : 1;
      const newQty = Math.max(1, prevQty + addQty);

      const unitPrice =
        (existing.config && typeof existing.config.pricePerUnit === "number" && existing.config.pricePerUnit) ||
        (existing.pricing && typeof existing.pricing.unitPrice === "number" && existing.pricing.unitPrice) ||
        (item.pricing && typeof item.pricing.unitPrice === "number" && item.pricing.unitPrice) ||
        0;

      const total = Math.round((newQty * unitPrice) * 100) / 100;

      existing.config = Object.assign({}, existing.config, {
        qty: newQty,
        unit,
        pricePerUnit: unitPrice
      });

      existing.pricing = Object.assign({}, existing.pricing, {
        unitLabel: unit,
        unitPrice,
        quantity: newQty,
        total
      });

      // update display details (opțional, dar ajută UX)
      if (existing.display && Array.isArray(existing.display.details)) {
        const rest = existing.display.details.filter((d) => !String(d).toLowerCase().startsWith("cantitate:"));
        existing.display.details = [`Cantitate: ${newQty} ${unit}`, ...rest];
      }

      next.updatedAt = nowISO();
      setState(next);
      return existing.lineId;
    }
  }

  // default behavior: line separată
  next.items.push(item);
  next.updatedAt = nowISO();
  setState(next);
  return item.lineId;
}


  function updateItem(lineId, patch) {
    if (!lineId) return false;
    const next = clone(state);
    const idx = next.items.findIndex((it) => it && it.lineId === lineId);
    if (idx === -1) return false;

    const current = next.items[idx] || {};
    const merged = Object.assign({}, current, patch, { lineId: current.lineId });

    next.items[idx] = normalizeItem(merged);
    next.updatedAt = nowISO();
    setState(next);
    return true;
  }

  function removeItem(lineId) {
    if (!lineId) return false;
    const next = clone(state);
    const before = next.items.length;
    next.items = next.items.filter((it) => it && it.lineId !== lineId);
    if (next.items.length === before) return false;

    next.updatedAt = nowISO();
    setState(next);
    return true;
  }

  function clear() {
    setState(defaultState());
    return true;
  }

  function count() {
    return state.items.length;
  }

  function getItems() {
    return clone(state.items);
  }

  // Useful for future: compute estimated subtotal if totals exist on line items
  function getEstimatedSubtotal() {
    // Lines may store `pricing.total` (number) or `total` (number).
    let sum = 0;
    for (const it of state.items) {
      const v =
        (it && it.pricing && typeof it.pricing.total === "number" && it.pricing.total) ||
        (it && typeof it.total === "number" && it.total) ||
        0;
      if (Number.isFinite(v)) sum += v;
    }
    return sum;
  }

  // Public API
  NS.cartStore = {
    getState,
    subscribe,
    addItem,
    updateItem,
    removeItem,
    clear,
    count,
    getItems,
    getEstimatedSubtotal,
  };
})();
