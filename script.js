const WORKER_BASE_URL = "https://india-charts.8652527002arvind.workers.dev";

const chartContainer = document.getElementById('chart');
const chart = LightweightCharts.createChart(chartContainer, {
  width: chartContainer.clientWidth,
  height: 620,
  layout: { background: { color: '#02101a' }, textColor: '#bfe1ff' },
});
const candles = chart.addCandlestickSeries();
window.addEventListener("resize", () =>
  chart.applyOptions({ width: chartContainer.clientWidth })
);

let fullData = [];
let visibleIndex = 0;

// ------------------------------------------------------------
// Symbol Normalizer
// ------------------------------------------------------------
function normalize(symbol) {
  if (!symbol) return null;
  symbol = symbol.toUpperCase().trim();
  const map = {
    "NIFTY": "^NSEI",
    "NIFTY50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN"
  };
  if (map[symbol]) return map[symbol];
  if (symbol.startsWith("^")) return symbol;
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return symbol;
  return symbol.replace(/\s+/g, "") + ".NS";
}

// ------------------------------------------------------------
// Worker Fetch
// ------------------------------------------------------------
async function fetchFromWorker(url) {
  const res = await fetch(url);
  return await res.json();
}

// ------------------------------------------------------------
// Load Symbol (5-year data)
// ------------------------------------------------------------
async function loadSymbol(raw) {
  const sym = normalize(raw);
  if (!sym) return alert("Invalid symbol");

  const url = `${WORKER_BASE_URL}/?symbol=${sym}&range=5y&interval=1d`;
  const payload = await fetchFromWorker(url);

  if (!payload.data || !payload.data.length) {
    alert("No data available.");
    return;
  }

  fullData = payload.data;
  visibleIndex = fullData.length;

  candles.setData(fullData);

  document.getElementById("symbolInfo").style.display = "block";
  document.getElementById("symbolLine").textContent = `${sym}`;
  document.getElementById("dateLine").textContent =
    `${fullData[0].time} → ${fullData[fullData.length - 1].time}`;
}

// ------------------------------------------------------------
// Date Range Loader
// ------------------------------------------------------------
async function loadDateRange() {
  const raw = document.getElementById("symbolInput").value.trim();
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (!raw) return alert("Enter symbol first");
  if (!from || !to) return alert("Select both dates");

  const sym = normalize(raw);

  const url = `${WORKER_BASE_URL}/?symbol=${sym}&from=${from}&to=${to}`;
  const payload = await fetchFromWorker(url);

  if (!payload.data || !payload.data.length) {
    alert("No data in this date range.");
    return;
  }

  fullData = payload.data;
  visibleIndex = fullData.length;

  candles.setData(fullData);

  document.getElementById("symbolInfo").style.display = "block";
  document.getElementById("symbolLine").textContent = sym;
  document.getElementById("dateLine").textContent =
    `${from} → ${to}`;
}

// ------------------------------------------------------------
// Random Mix Loader
// ------------------------------------------------------------
const stocks = ["RELIANCE.NS","TCS.NS","INFY.NS","SBIN.NS","HDFCBANK.NS"];
const indexes = ["^NSEI","^NSEBANK","^BSESN"];
const mix = stocks.concat(indexes);

async function loadRandom() {
  const pick = mix[Math.floor(Math.random() * mix.length)];
  loadSymbol(pick);
}

// ------------------------------------------------------------
// Events
// ------------------------------------------------------------
document.getElementById("searchBtn").onclick = () => {
  loadSymbol(document.getElementById("symbolInput").value);
};

document.getElementById("indexSelect").onchange = (e) => {
  if (e.target.value) loadSymbol(e.target.value);
};

document.getElementById("rangeBtn").onclick = loadDateRange;

document.getElementById("btn-random").onclick = loadRandom;

