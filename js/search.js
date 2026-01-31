/* =========================================
   Search: client-side, no backend
   UX state rules:
   - load + empty input: hide results section entirely; show popular
   - query present: show results + count OR no-results
   - clear: reset to popular, hide results/no-results
   ========================================= */

const searchIndex = [
  {
    title: "Mochetă",
    url: "mocheta.html",
    category: "Mochetă",
    description: "Mochetă premium pentru confort, acustică și un interior echilibrat.",
    keywords: ["mocheta","mochetă","pardoseala","confort","acustica","intretinere","trepte","trafic","rezidential","comercial"]
  },
  {
    title: "Perdele",
    url: "perdele.html",
    category: "Perdele",
    description: "Perdele care filtrează lumina și adaugă lejeritate spațiului.",
    keywords: ["perdele","transparent","semi-transparent","lumina","intimitate","rejansa","wave","sina","galerie"]
  },
  {
    title: "Draperii",
    url: "draperii.html",
    category: "Draperii",
    description: "Draperii care oferă intimitate, control al luminii și atmosferă.",
    keywords: ["draperii","blackout","dimout","opacitate","seara","statement","valuri","wave","sina","galerie"]
  },
  {
    title: "Montaj",
    url: "montaj.html",
    category: "Montaj",
    description: "Montaj profesionist și finisaje impecabile pentru un rezultat premium.",
    keywords: ["montaj","instalare","finisaje","prindere","sina","galerie","fixare","tăieturi","imbinari","verificare"]
  },
  {
    title: "Accesorii",
    url: "accesorii.html",
    category: "Accesorii",
    description: "Șine, galerii și detalii care completează finisajul.",
    keywords: ["accesorii","sina","șină","galerie","wave","rejansa","carlige","inele","capete","bride","greutati","finisaj"]
  },
  {
    title: "Showroom",
    url: "showroom.html",
    category: "Showroom",
    description: "Compară mostre reale și primește recomandări în showroom.",
    keywords: ["showroom","mostre","vizita","programare","materiale","textura","transparenta","opacitate","google maps"]
  },
  {
    title: "Contact",
    url: "contact.html",
    category: "Contact",
    description: "Trimite-ne un mesaj și revenim cu recomandări clare.",
    keywords: ["contact","telefon","email","programare","oferta","consultanta","mesaj"]
  },
  {
    title: "Homepage",
    url: "index.html",
    category: "ELOGY Design",
    description: "Mochetă, perdele și draperii premium — consiliere, montaj și finisaje elegante.",
    keywords: ["elogy","design","acasa","servicii","mocheta","perdele","draperii","showroom"]
  }
];

/* Helper: normalize diacritics + lowercase */
function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* Helper: debounce */
function debounce(fn, delay = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* EXTRA: buildSearchURL(term) */
function buildSearchURL(term) {
  const q = (term || "").trim();
  return q ? `search.html?q=${encodeURIComponent(q)}` : "search.html";
}

/* Parse query string */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

/* Ranking score: title > keywords > description */
function scoreItem(item, qNorm) {
  if (!qNorm) return -1;

  const title = normalizeText(item.title);
  const desc = normalizeText(item.description);
  const kw = (item.keywords || []).map(normalizeText).join(" ");

  let score = 0;

  // field priority boosts
  if (title.includes(qNorm)) score += 300;
  if (kw.includes(qNorm)) score += 200;
  if (desc.includes(qNorm)) score += 100;

  // token bonus
  const terms = qNorm.split(" ").filter(Boolean);
  for (const t of terms) {
    if (title.includes(t)) score += 30;
    if (kw.includes(t)) score += 20;
    if (desc.includes(t)) score += 10;
  }

  return score;
}

/* Render helpers */
function escapeHTML(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function search(query) {
  const qNorm = normalizeText(query);
  if (!qNorm) return [];

  return searchIndex
    .map((item) => ({ item, s: scoreItem(item, qNorm) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}

function renderResults(items, query, els) {
  const { wrapEl, listEl, countEl, emptyEl, popularSection } = els;

  const qRaw = (query || "").trim();
  const qNorm = normalizeText(qRaw);

  // Empty query: hide results entirely, show popular
  if (!qNorm) {
    if (wrapEl) wrapEl.hidden = true;
    if (popularSection) popularSection.hidden = false;

    if (countEl) countEl.textContent = "";
    if (listEl) listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = true;
    return;
  }

  // Query present: show results block, hide popular
  if (wrapEl) wrapEl.hidden = false;
  if (popularSection) popularSection.hidden = true;

  if (countEl) countEl.textContent = `${items.length} rezultate pentru „${qRaw}”`;

  // No results
  if (items.length === 0) {
    if (listEl) listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  // Results
  if (emptyEl) emptyEl.hidden = true;

  const html = items.map((it) => {
    const title = escapeHTML(it.title);
    const desc = escapeHTML(it.description);
    const cat = escapeHTML(it.category);
    const url = escapeHTML(it.url);

    return `
      <a class="result-card" href="${url}">
        <div class="result-card__top">
          <h3 class="result-card__title">${title}</h3>
          <span class="result-card__badge">${cat}</span>
        </div>
        <p class="result-card__desc">${desc}</p>
        <div class="result-card__meta">
          <span class="result-card__dot" aria-hidden="true"></span>
          <span>Deschide pagina</span>
        </div>
      </a>
    `;
  }).join("");

  if (listEl) listEl.innerHTML = html;
}

(function initSearchPage(){
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const wrapEl = document.getElementById("resultsWrap");
  const listEl = document.getElementById("resultsList");
  const countEl = document.getElementById("searchCount");
  const emptyEl = document.getElementById("emptyState");
  const popularSection = document.querySelector(".search-popular");

  const els = { wrapEl, listEl, countEl, emptyEl, popularSection };

  if (input) input.focus();

  // Query string prefill
  const initialQ = getQueryParam("q");
  if (initialQ && input) input.value = initialQ;

  const run = () => {
    const q = input ? input.value : "";
    const qTrim = q.trim();

    // Only search when non-empty
    const results = qTrim ? search(qTrim) : [];
    renderResults(results, qTrim, els);

    // URL sync
    const url = new URL(window.location.href);
    if (qTrim) url.searchParams.set("q", qTrim);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  };

  const runDebounced = debounce(run, 200);

  // Initial state respects rules (hidden results if empty)
  run();

  if (input) input.addEventListener("input", runDebounced);

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (input) input.value = "";
      run(); // hides results + shows popular
      if (input) input.focus();
    });
  }

  // Chips (suggestions + popular)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-term]");
    if (!btn) return;

    const term = btn.getAttribute("data-term") || "";
    if (input) input.value = term;
    run();
    if (input) input.focus();
  });
})();
