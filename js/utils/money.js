/* =========================================
   ELOGY Design – money utils
   - format rules: no decimals for .00; else 2 decimals
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  const LOCALE = "ro-RO";

  function round2(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.round(v * 100) / 100;
  }

  function formatAmount(value) {
    const v = round2(value);
    const hasDecimals = Math.abs(v - Math.trunc(v)) > 0;
    return v.toLocaleString(LOCALE, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    });
  }

  function formatRON(value) {
    return formatAmount(value) + " lei";
  }

  NS.money = {
    round2,
    formatAmount,
    formatRON,
  };
})();
