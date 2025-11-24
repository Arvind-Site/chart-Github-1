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

let fullData = [];
let currentSlice = [];

// --------------------------------------------------
// Normalize symbols to NSE/BSE/Yahoo format
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
// Fetch LIVE fresh real data (1-minute candles)
// --------------------------------------------------
async function fetchFullData(symbol) {
  const url =
    `${WORKER_BASE_URL}/?symbol=${symbol}&range=1d&interval=1m&t=${Date.now()}`;

  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

// --------------------------------------------------
// Display full live data (NO RANDOM SLICES)
// --------------------------------------------------
async function loadSymbol(rawSymbol) {
  const symbol = normalize(rawSymbol);
  if (!symbol) return alert("Enter a valid symbol");

  document.getElementById("symbolLine").textContent = symbol;

  const data = await fetchFullData(symbol);
  if (!data.length) {
    alert("No data returned from Worker for: " + symbol);
    return;
  }

  fullData = data;
  currentSlice = data;

  candles.setData(currentSlice);

  const t0 = currentSlice[0].time;
  const t1 = currentSlice[currentSlice.length - 1].time;
  document.getElementById("dateLine").textContent = `${t0} → ${t1}`;

  document.getElementById("dataCount").textContent = fullData.length;
  document.getElementById("visibleCount").textContent = currentSlice.length;

  document.getElementById("symbolInfo").style.display = "block";
}

// --------------------------------------------------
// Random Stock Loader (fresh real data each time)
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
// UI Event Listeners
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

// Hide info toggle
document.getElementById("hide-info").onchange = (e) => {
  document.getElementById("symbolInfo").style.display = e.target.checked
    ? "none"
    : "block";
};

// --------------------------------------------------
// Load one fresh chart on startup
// --------------------------------------------------
loadRandomStock();
