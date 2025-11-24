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

// --------------------------------------------------
// Global State
// --------------------------------------------------
let fullData = [];
let lastSymbol = null;
let autoRefreshTimer = null;

// --------------------------------------------------
// TradingView Timeframe Mapping
// --------------------------------------------------
const TIMEFRAMES = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "5d" },
  "1h": { interval: "60m", range: "1mo" },
  "4h": { interval: "240m", range: "6mo" },
  "1d": { interval: "1d", range: "2y" },
  "1w": { interval: "1wk", range: "5y" },
  "1mo": { interval: "1mo", range: "10y" },
  "6mo": { interval: "1d", range: "6mo" },
  "1y": { interval: "1d", range: "1y" },
  "max": { interval: "1d", range: "max" },
};

let currentTF = "1m"; // Default timeframe

// --------------------------------------------------
// Normalize Symbols
// --------------------------------------------------
function normalize(symbol) {
  if (!symbol) return null;
  symbol = symbol.toUpperCase().trim();

  const indexMap = {
    "NIFTY": "^NSEI",
    "NIFTY50": "^NSEI",
    "NIFTY 50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "BANK NIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
  };
  if (indexMap[symbol]) return indexMap[symbol];
  if (symbol.startsWith("^")) return symbol;
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return symbol;

  return symbol.replace(/\s+/g, "") + ".NS";
}

// --------------------------------------------------
// Fetch Data From Worker
// --------------------------------------------------
async function fetchData(symbol, tfKey) {
  const { interval, range } = TIMEFRAMES[tfKey];

  const url =
    `${WORKER_BASE_URL}/?symbol=${symbol}` +
    `&range=${range}&interval=${interval}&t=${Date.now()}`;

  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

// --------------------------------------------------
// Render Chart
// --------------------------------------------------
async function loadSymbol(rawSymbol) {
  const symbol = normalize(rawSymbol);
  if (!symbol) return alert("Enter a valid symbol");

  lastSymbol = symbol;
  document.getElementById("symbolLine").textContent = symbol;

  const data = await fetchData(symbol, currentTF);
  if (!data.length) {
    alert("No data returned for: " + symbol);
    return;
  }

  fullData = data;
  candles.setData(fullData);

  const t0 = fullData[0].time;
  const t1 = fullData[fullData.length - 1].time;
  document.getElementById("dateLine").textContent = `${t0} → ${t1}`;

  document.getElementById("dataCount").textContent = fullData.length;
  document.getElementById("visibleCount").textContent = fullData.length;

  document.getElementById("symbolInfo").style.display = "block";

  setupAutoRefresh();
}

// --------------------------------------------------
// Auto-Refresh for 1m timeframe
// --------------------------------------------------
function setupAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);

  if (currentTF === "1m") {
    autoRefreshTimer = setInterval(() => {
      if (lastSymbol) loadSymbol(lastSymbol);
    }, 60000);
  }
}

// --------------------------------------------------
// Timeframe Button Logic (FIXED)
// --------------------------------------------------
document.querySelectorAll(".tf-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Highlight active button
    document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Read key from data attribute
    currentTF = btn.getAttribute("data-tf");

    // Reload chart
    if (lastSymbol) loadSymbol(lastSymbol);
  });
});

// --------------------------------------------------
// Random Symbol Loader
// --------------------------------------------------
const stocks = [
  "RELIANCE.NS", "TCS.NS", "INFY.NS",
  "SBIN.NS", "ICICIBANK.NS", "HDFCBANK.NS",
  "LT.NS", "HCLTECH.NS", "WIPRO.NS"
];

async function loadRandomStock() {
  const pick = stocks[Math.floor(Math.random() * stocks.length)];
  await loadSymbol(pick);
}

// --------------------------------------------------
// Event Listeners
// --------------------------------------------------
document.getElementById("searchBtn").onclick = () => {
  loadSymbol(document.getElementById("symbolInput").value);
};

document.getElementById("symbolInput").addEventListener("keyup", (e) => {
  if (e.key === "Enter") loadSymbol(e.target.value);
});

document.getElementById("indexSelect").onchange = (e) => {
  if (e.target.value) loadSymbol(e.target.value);
};

document.getElementById("btn-random").onclick = loadRandomStock;

document.getElementById("hide-info").onchange = (e) => {
  document.getElementById("symbolInfo").style.display = e.target.checked
    ? "none"
    : "block";
};

// --------------------------------------------------
// Startup
// --------------------------------------------------
loadRandomStock();
