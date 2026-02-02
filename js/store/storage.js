/* =========================================
   ELOGY Design – storage (versioned)
   - localStorage safe read/write
   - fallback sessionStorage (când localStorage e blocat)
   - schema versioning + light migration hooks
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});

  const DEFAULTS = {
    cartKey: "elogy.cart.v1",
    cartSchemaVersion: 1,
  };

  let warned = false;

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function canUseStorage(s) {
    try {
      const testKey = "__elogy_test__";
      s.setItem(testKey, "1");
      s.removeItem(testKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  function getPrimary() {
    try {
      if (typeof localStorage !== "undefined" && canUseStorage(localStorage)) return localStorage;
    } catch (_) {}
    return null;
  }

  function getFallback() {
    try {
      if (typeof sessionStorage !== "undefined" && canUseStorage(sessionStorage)) return sessionStorage;
    } catch (_) {}
    return null;
  }

  function warnOnce() {
    if (warned) return;
    warned = true;
    console.warn("[ELOGY] localStorage indisponibil. Folosesc sessionStorage (coșul se păstrează doar în tab-ul curent).");
  }

  function read(key) {
    try {
      const primary = getPrimary();
      if (primary) {
        const raw = primary.getItem(key);
        if (raw) return safeParse(raw);
      }
    } catch (_) {}

    try {
      const fallback = getFallback();
      if (fallback) {
        const raw = fallback.getItem(key);
        if (raw) return safeParse(raw);
      }
    } catch (_) {}

    return null;
  }

  function write(key, value) {
    const json = JSON.stringify(value);

    try {
      const primary = getPrimary();
      if (primary) {
        primary.setItem(key, json);
        return true;
      }
    } catch (_) {}

    try {
      const fallback = getFallback();
      if (fallback) {
        warnOnce();
        fallback.setItem(key, json);
        return true;
      }
    } catch (_) {}

    warnOnce();
    return false;
  }

  function remove(key) {
    let ok = false;

    try {
      const primary = getPrimary();
      if (primary) {
        primary.removeItem(key);
        ok = true;
      }
    } catch (_) {}

    try {
      const fallback = getFallback();
      if (fallback) {
        fallback.removeItem(key);
        ok = true;
      }
    } catch (_) {}

    return ok;
  }

  function isPlainObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }

  function isValidCartState(state) {
    if (!isPlainObject(state)) return false;
    if (state.schemaVersion !== DEFAULTS.cartSchemaVersion) return false;
    if (!Array.isArray(state.items)) return false;
    return true;
  }

  function migrateCartState(legacyState) {
    if (isValidCartState(legacyState)) return legacyState;
    return null;
  }

  function loadCartState() {
    const raw = read(DEFAULTS.cartKey);
    if (!raw) return null;
    return migrateCartState(raw);
  }

  function saveCartState(state) {
    const toSave = Object.assign({}, state, { updatedAt: nowISO() });
    write(DEFAULTS.cartKey, toSave);
  }

  NS.storage = {
    defaults: DEFAULTS,
    nowISO,
    read,
    write,
    remove,
    loadCartState,
    saveCartState,
  };
})();
