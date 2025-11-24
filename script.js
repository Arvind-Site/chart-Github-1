const WORKER_BASE_URL = "https://india-charts.8652527002arvind.workers.dev";

const chartContainer = document.getElementById("chart");
const chart = LightweightCharts.createChart(chartContainer, {
  width: chartContainer.clientWidth,
  height: 620,
  layout: { background: { color: "#02101a" }, textColor: "#bfe1ff" },
});
const candles = chart.addCandlestickSeries();

window.addEventListener("resize", () =>
  chart.applyOptions({ width: chartContainer.clientWidth })
);

// -------------------------------------------------------------------
// GLOBAL STATE
// -------------------------------------------------------------------
let lastSymbol = null;
let autoRefreshTimer = null;

const TIMEFRAMES = {
  "1m":  { interval: "1m",   range: "1d" },
  "5m":  { interval: "5m",   range: "5d" },
  "15m": { interval: "15m",  range: "5d" },
  "1h":  { interval: "60m",  range: "1mo" },
  "4h":  { interval: "240m", range: "6mo" },
  "1d":  { interval: "1d",   range: "2y" },
  "1w":  { interval: "1wk",  range: "5y" },
  "1mo": { interval: "1mo",  range: "10y" },
  "6mo": { interval: "1d",   range: "6mo" },
  "1y":  { interval: "1d",   range: "1y" },
  "max": { interval: "1d",   range: "max" },
};

let currentTF = "1m";

// -------------------------------------------------------------------
// NORMALIZE SYMBOLS
// -------------------------------------------------------------------
function normalize(symbol) {
  symbol = symbol.trim().toUpperCase();

  const indexMap = {
    "NIFTY": "^NSEI",
    "NIFTY 50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "BANK NIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
  };

  if (indexMap[symbol]) return indexMap[symbol];
  if (symbol.startsWith("^")) return symbol;
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return symbol;

  return symbol + ".NS";
}

// -------------------------------------------------------------------
// FETCH DATA
// -------------------------------------------------------------------
async function fetchData(symbol, tfKey) {
  const { interval, range } = TIMEFRAMES[tfKey];

  const url =
    `${WORKER_BASE_URL}/?symbol=${symbol}` +
    `&range=${range}&interval=${interval}` +
    `&t=${Date.now()}`;

  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

// -------------------------------------------------------------------
// LOAD SYMBOL
// -------------------------------------------------------------------
async function loadSymbol(rawSymbol) {
  const symbol = normalize(rawSymbol);
  lastSymbol = symbol;
  document.getElementById("symbolLine").textContent = symbol;

  const data = await fetchData(symbol, currentTF);
  if (!data.length) {
    alert("No data available.");
    return;
  }

  candles.setData(data);

  const first = data[0].time;
  const last = data[data.length - 1].time;
  document.getElementById("dateLine").textContent = `${first} → ${last}`;
  document.getElementById("symbolInfo").style.display = "block";

  setupAutoRefresh();
}

// -------------------------------------------------------------------
// AUTO REFRESH FOR 1m TIMEFRAME
// -------------------------------------------------------------------
function setupAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);

  if (currentTF === "1m") {
    autoRefreshTimer = setInterval(() => {
      if (lastSymbol) loadSymbol(lastSymbol);
    }, 60000);
  }
}

// -------------------------------------------------------------------
// TIMEFRAME BUTTONS — FIXED
// -------------------------------------------------------------------
document.querySelectorAll(".tf-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentTF = btn.getAttribute("data-tf");

    if (lastSymbol) loadSymbol(lastSymbol);
  });
});

// -------------------------------------------------------------------
// SEARCH & RANDOM
// -------------------------------------------------------------------
document.getElementById("searchBtn").onclick = () => {
  loadSymbol(document.getElementById("symbolInput").value);
};

document.getElementById("symbolInput").addEventListener("keyup", (e) => {
  if (e.key === "Enter") loadSymbol(e.target.value);
});

document.getElementById("indexSelect").onchange = (e) => {
  if (e.target.value) loadSymbol(e.target.value);
};

document.getElementById("btn-random").onclick = () => {
  const list = ["RELIANCE.NS","TCS.NS","INFY.NS","SBIN.NS","ICICIBANK.NS"];
  loadSymbol(list[Math.floor(Math.random() * list.length)]);
};

document.getElementById("hide-info").onchange = (e) => {
  document.getElementById("symbolInfo").style.display =
    e.target.checked ? "none" : "block";
};

// -------------------------------------------------------------------
// STARTUP
// -------------------------------------------------------------------
loadSymbol("RELIANCE.NS");
