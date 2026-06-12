const DEFAULT_STATE = {
  theme: "aurora",
  quoteEnabled: true,
  weatherCity: "Berlin",
  searchEngine: "google",
  cryptoEnabled: true,
};

const THEMES = [
  {
    id: "noir_art",
    name: "Paris",
    hint: "dark • artistic • gallery",
    swatch: "linear-gradient(135deg,#07070a,#1a1b22)",
  },
  {
    id: "aurora",
    name: "Berlin",
    hint: "neon • deep • modern",
    swatch: "linear-gradient(135deg,#090a10,#1a1b3a)",
  },
  {
    id: "marker",
    name: "Helsinki",
    hint: "hand • playful • clean",
    swatch: "linear-gradient(135deg,#f3f4f6,#ffffff)",
  },
  {
    id: "cyberpunk",
    name: "Tokyo",
    hint: "neon • futuristic • blade runner",
    swatch: "linear-gradient(135deg, #050510 , #1a0033)",
  },
  {
    id: "dev",
    name: "San Francisco",
    hint: "coding • terminal • vscode",
    swatch: "linear-gradient(135deg, #084100 , #0a0a0a )",
  },
  {
    id: "retro_wave",
    name: "Los Angeles",
    hint: "80s • synth • sunset",
    swatch: "linear-gradient(135deg , #54003b , #1a002e )",
  },
  {
    id: "sage",
    name: "Rome",
    hint: "earthy • calm • aesthetic",
    swatch: "#b7b7a4",
  },
  {
    id: "royal",
    name: "London",
    hint: "prestige • champagne • deep",
    swatch: "linear-gradient(135deg, #4c3100, #0a0a0a)",
  },
  {
    id: "noble",
    name: "Vienna",
    swatch: "linear-gradient(135deg, #003259, #000f0a)",
  },
];




/* ========================= */
/*     SAFE FETCH (CORS)     */
/* ========================= */
async function safeFetch(url) {
  // اول مستقیم تلاش کن
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {
    // CORS blocked — از background بفرست
  }

  // fallback: از background script
  if (typeof browser !== "undefined" && browser.runtime) {
    const response = await browser.runtime.sendMessage({
      type: "fetch",
      url: url,
    });
    if (response?.ok) return response.data;
    throw new Error(response?.error || "Background fetch failed");
  }

  if (typeof chrome !== "undefined" && chrome.runtime) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "fetch", url }, (response) => {
        if (response?.ok) resolve(response.data);
        else reject(new Error(response?.error || "Background fetch failed"));
      });
    });
  }

  throw new Error("No fetch method available");
}





const $ = (s) => document.querySelector(s);


/* ========================= */
/*        STORAGE API        */
/* ========================= */
function getStorageAPI() {
  if (typeof browser !== "undefined" && browser.storage) return browser.storage.local;
  if (typeof chrome !== "undefined" && chrome.storage) return chrome.storage.local;
  return null;
}

async function loadState() {
  const storage = getStorageAPI();
  if (storage) {
    return new Promise((resolve) => {
      storage.get(["sintab_theme_state"], (result) => {
        resolve({ ...DEFAULT_STATE, ...(result?.sintab_theme_state || {}) });
      });
    });
  }
  try {
    const raw = localStorage.getItem("sintab_theme_state");
    return { ...DEFAULT_STATE, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(state) {
  const storage = getStorageAPI();
  if (storage) {
    return new Promise((resolve) => {
      storage.set({ sintab_theme_state: state }, resolve);
    });
  }
  localStorage.setItem("sintab_theme_state", JSON.stringify(state));
}

/* ========================= */
/*          CLOCK            */
/* ========================= */
function tickClock() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");

  const clockEl = document.getElementById("clock");
  clockEl.textContent = "";

  const hSpan = document.createElement("span");
  hSpan.className = "d";
  hSpan.textContent = h;

  const colonSpan = document.createElement("span");
  colonSpan.className = "colon";
  colonSpan.textContent = ":";

  const mSpan = document.createElement("span");
  mSpan.className = "d";
  mSpan.textContent = m;

  clockEl.appendChild(hSpan);
  clockEl.appendChild(colonSpan);
  clockEl.appendChild(mSpan);
}

/* ========================= */
/*          DATE             */
/* ========================= */
const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function renderDate() {
  const d = new Date();
  $("#jalaliDate").textContent = `${EN_WEEKDAYS[d.getDay()]} • ${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ========================= */
/*          QUOTE            */
/* ========================= */
async function renderQuote(state) {
  const wrap = $("#quoteWrap");
  if (!state.quoteEnabled) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");

  try {
    const response = await fetch("quotes.json");
    const quotes = await response.json();
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const q = quotes[randomIndex];

    $("#quoteText").textContent = q.q;
    $("#quoteAuthor").textContent = q.a ? `— ${q.a}` : "";

    wrap.onclick = () => renderQuote(state);
    wrap.style.cursor = "pointer";
  } catch (error) {
    console.error("Error loading quotes:", error);
    $("#quoteText").textContent = "Simplicity is the ultimate sophistication.";
    $("#quoteAuthor").textContent = "— Leonardo da Vinci";
  }
}

/* ========================= */
/*         THEME             */
/* ========================= */
function applyTheme(themeId) {
  document.documentElement.setAttribute("data-theme", themeId);
}

/* ========================= */
/*        DRAWERS            */
/* ========================= */
function openDrawer(id) {
  $(id).classList.remove("hidden");
}
function closeDrawer(id) {
  $(id).classList.add("hidden");
}

let drawersWired = false;

function wireDrawers(state) {
  if (drawersWired) return;
  drawersWired = true;

  $("#settingsBtn").addEventListener("click", () => {
    openDrawer("#settingsDrawer");
  });

  $("#closeSettings").addEventListener("click", () => closeDrawer("#settingsDrawer"));

  document.addEventListener("click", (e) => {
    const sd = $("#settingsDrawer");
    const sb = $("#settingsBtn");
    if (!sd.classList.contains("hidden") && !sd.contains(e.target) && !sb.contains(e.target)) {
      closeDrawer("#settingsDrawer");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer("#settingsDrawer");
  });
}

/* ========================= */
/*      THEME PICKER         */
/* ========================= */
function renderThemeCards(state) {
  const grid = $("#themesGrid");
  grid.textContent = "";

  for (const t of THEMES) {
    const card = document.createElement("div");
    card.className = "themeCard";

    const swatch = document.createElement("div");
    swatch.className = "themeSwatch";
    swatch.style.background = t.swatch;

    const name = document.createElement("div");
    name.className = "themeName";
    name.textContent = t.name;

    card.appendChild(swatch);
    card.appendChild(name);

    card.addEventListener("click", async () => {
      state.theme = t.id;
      applyTheme(state.theme);
      syncMarkerToggleUI(state);
      syncSageToggleUI(state);
      syncNobleToggleUI(state);
      await saveState(state);
    });

    grid.appendChild(card);
  }
}

/* ========================= */
/*     QUOTE SETTINGS        */
/* ========================= */
function wireSettings(state) {
  const onBtn = $("#quoteOn");
  const offBtn = $("#quoteOff");

  function updateQuoteButtons() {
    if (state.quoteEnabled) {
      onBtn.classList.add("active");
      offBtn.classList.remove("active");
    } else {
      offBtn.classList.add("active");
      onBtn.classList.remove("active");
    }
  }

  onBtn.addEventListener("click", async () => {
    state.quoteEnabled = true;
    renderQuote(state);
    updateQuoteButtons();
    await saveState(state);
  });

  offBtn.addEventListener("click", async () => {
    state.quoteEnabled = false;
    renderQuote(state);
    updateQuoteButtons();
    await saveState(state);
  });

  updateQuoteButtons();
}

/* ========================= */
/*      SEARCH ENGINE        */
/* ========================= */
const engineMap = {
  google: "https://www.google.com/search?q=",
  youtube: "https://www.youtube.com/results?search_query=",
};

function applySearchEngine(engineId, state) {
  document.querySelectorAll(".engineOption").forEach((e) => {
    e.classList.toggle("active", e.dataset.engine === engineId);
  });
  state.searchEngine = engineId;
  saveState(state);
}

document.querySelectorAll(".engineOption").forEach((el) => {
  el.addEventListener("click", async () => {
    const engine = el.dataset.engine;
    if (!engineMap[engine]) return;
    const state = await loadState();
    applySearchEngine(engine, state);
  });
});

document.getElementById("searchForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const q = document.getElementById("searchInput").value.trim();
  if (!q) return;

  const engine = document.querySelector(".engineOption.active")?.dataset.engine || "google";
  const url = engineMap[engine] || engineMap.google;
  window.location.href = url + encodeURIComponent(q);
});

document.querySelectorAll(".engineOption").forEach((el) => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".engineOption").forEach((e) => e.classList.remove("active"));
    el.classList.add("active");
  });
});

/* ========================= */
/*         WEATHER           */
/* ========================= */
async function fetchWeather(city) {
  const c = (city || "").trim() || "Berlin";
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1`
    ).then((r) => r.json());

    const place = geo?.results?.[0];
    if (!place) {
      document.getElementById("weatherCity").textContent = c;
      document.getElementById("weatherTemp").textContent = "—";
      return;
    }

    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m`
    ).then((r) => r.json());

    const temp = w?.current?.temperature_2m;
    document.getElementById("weatherCity").textContent = place.name;
    document.getElementById("weatherTemp").textContent =
      typeof temp === "number" ? `${Math.round(temp)}°` : "—";
  } catch (e) {
    document.getElementById("weatherCity").textContent = c;
    document.getElementById("weatherTemp").textContent = "—";
  }
}

function wireWeatherSettings(state) {
  const input = document.getElementById("weatherCityInput");
  const btn = document.getElementById("weatherCitySave");
  if (!input || !btn) return;

  input.value = state.weatherCity || "Berlin";

  const saveAndRefresh = async () => {
    const v = input.value.trim();
    if (!v) return;
    state.weatherCity = v;
    await saveState(state);
    fetchWeather(state.weatherCity);
  };

  btn.addEventListener("click", saveAndRefresh);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveAndRefresh();
    }
  });
}

/* ========================= */
/*     THEME TOGGLES         */
/* ========================= */
function isMarkerTheme(themeId) {
  return themeId === "marker" || themeId === "marker_dark";
}
function syncMarkerToggleUI(state) {
  const btn = document.getElementById("markerThemeToggle");
  if (!btn) return;
  const show = isMarkerTheme(state.theme);
  btn.classList.toggle("hidden", !show);
  const ico = btn.querySelector(".ico");
  if (ico) ico.textContent = state.theme === "marker_dark" ? "☀" : "☾";
}
function wireMarkerToggle(state) {
  const btn = document.getElementById("markerThemeToggle");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!isMarkerTheme(state.theme)) return;
    state.theme = state.theme === "marker" ? "marker_dark" : "marker";
    applyTheme(state.theme);
    syncMarkerToggleUI(state);
    await saveState(state);
  });
}

function isSageTheme(themeId) {
  return themeId === "sage" || themeId === "sage_dark";
}
function syncSageToggleUI(state) {
  const btn = document.getElementById("sageThemeToggle");
  if (!btn) return;
  const show = isSageTheme(state.theme);
  btn.classList.toggle("hidden", !show);
  const ico = btn.querySelector(".ico");
  if (ico) ico.textContent = state.theme === "sage_dark" ? "☀" : "☾";
}
function wireSageToggle(state) {
  const btn = document.getElementById("sageThemeToggle");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!isSageTheme(state.theme)) return;
    state.theme = state.theme === "sage" ? "sage_dark" : "sage";
    applyTheme(state.theme);
    syncSageToggleUI(state);
    await saveState(state);
  });
}

function isNobleTheme(themeId) {
  return themeId === "noble" || themeId === "noble-light";
}
function syncNobleToggleUI(state) {
  const btn = document.getElementById("nobleThemeToggle");
  if (!btn) return;
  const show = isNobleTheme(state.theme);
  btn.classList.toggle("hidden", !show);
  const ico = btn.querySelector(".ico");
  if (ico) ico.textContent = state.theme === "noble-light" ? "☾" : "☀";
}
function wireNobleToggle(state) {
  const btn = document.getElementById("nobleThemeToggle");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!isNobleTheme(state.theme)) return;
    state.theme = state.theme === "noble" ? "noble-light" : "noble";
    applyTheme(state.theme);
    syncNobleToggleUI(state);
    await saveState(state);
  });
}

/* ========================= */
/*           FAB             */
/* ========================= */
const mainFab = document.getElementById("mainFab");
const fabContainer = document.querySelector(".fab-container");
if (mainFab && fabContainer) {
  mainFab.addEventListener("click", () => {
    fabContainer.classList.toggle("open");
  });
}

/* ========================= */
/*    CRYPTO PRICES          */
/*    Kraken API (No CORS)   */
/* ========================= */
async function loadMarket(state) {
  const box = $("#marketBox");
  if (!box) return;

  if (!state.cryptoEnabled) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");

  try {
    const res = await fetch(
      "https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD"
    );
    const data = await res.json();

    const btcPrice = parseFloat(data?.result?.XXBTZUSD?.c?.[0]);
    const ethPrice = parseFloat(data?.result?.XETHZUSD?.c?.[0]);

    if ($("#btcPrice"))
      $("#btcPrice").textContent = !isNaN(btcPrice)
        ? `$${Math.round(btcPrice).toLocaleString("en-US")}`
        : "—";

    if ($("#ethPrice"))
      $("#ethPrice").textContent = !isNaN(ethPrice)
        ? `$${Math.round(ethPrice).toLocaleString("en-US")}`
        : "—";

  } catch (e) {
    console.error("Crypto fetch error:", e);
    if ($("#btcPrice")) $("#btcPrice").textContent = "—";
    if ($("#ethPrice")) $("#ethPrice").textContent = "—";
  }
}

/* ========================= */
/*    CRYPTO SETTINGS        */
/* ========================= */
function wireCryptoSettings(state) {
  const onBtn = $("#cryptoOn");
  const offBtn = $("#cryptoOff");

  function updateCryptoButtons() {
    if (state.cryptoEnabled) {
      onBtn.classList.add("active");
      offBtn.classList.remove("active");
    } else {
      offBtn.classList.add("active");
      onBtn.classList.remove("active");
    }
  }

  onBtn.addEventListener("click", async () => {
    state.cryptoEnabled = true;
    loadMarket(state);
    updateCryptoButtons();
    await saveState(state);
  });

  offBtn.addEventListener("click", async () => {
    state.cryptoEnabled = false;
    loadMarket(state);
    updateCryptoButtons();
    await saveState(state);
  });

  updateCryptoButtons();
}





/* ========================= */
/*     SUPPORT MODAL         */
/* ========================= */
const supportBtn = document.getElementById("supportBtn");
const supportModal = document.getElementById("supportModal");
const closeSupportModal = document.getElementById("closeSupportModal");

if (supportBtn && supportModal) {
  supportBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    supportModal.classList.remove("hidden");
  });

  closeSupportModal.addEventListener("click", () => {
    supportModal.classList.add("hidden");
  });

  supportModal.addEventListener("click", (e) => {
    if (e.target === supportModal) {
      supportModal.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !supportModal.classList.contains("hidden")) {
      supportModal.classList.add("hidden");
    }
  });
}

// Copy wallet address
document.querySelectorAll(".wallet-copy").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const targetId = btn.dataset.copy;
    const addressEl = document.getElementById(targetId);
    if (!addressEl) return;

    try {
      await navigator.clipboard.writeText(addressEl.textContent.trim());
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  });
});





/* ========================= */
/*           INIT            */
/* ========================= */
(async function init() {
  const state = await loadState();

  applyTheme(state.theme);

  syncMarkerToggleUI(state);
  wireMarkerToggle(state);

  syncSageToggleUI(state);
  wireSageToggle(state);

  syncNobleToggleUI(state);
  wireNobleToggle(state);

  fetchWeather(state.weatherCity);
  setInterval(() => fetchWeather(state.weatherCity), 20 * 60 * 1000);

  tickClock();
  setInterval(tickClock, 1000);

  loadMarket(state);
  setInterval(() => loadMarket(state), 60000);

  renderDate();
  setInterval(renderDate, 60 * 1000);

  renderQuote(state);
  renderThemeCards(state);
  wireDrawers(state);

  wireSettings(state);
  wireWeatherSettings(state);
  wireCryptoSettings(state);

  applySearchEngine(state.searchEngine || "google", state);

  $("#searchInput")?.focus();
})();