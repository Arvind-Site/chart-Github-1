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
// Fetch real historical data
// --------------------------------------------------
async function fetchFullData(symbol) {
  const url = `${WORKER_BASE_URL}/?symbol=${symbol}&range=5y&interval=1d`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

// --------------------------------------------------
// Create RANDOM real slice
// --------------------------------------------------
function createRandomSlice(data) {
  if (!data || data.length < 50) return data;

  const total = data.length;

  // random window size: 80 → 350 candles
  const min = 80;
  const max = 350;
  const windowSize = Math.floor(Math.random() * (max - min)) + min;

  // random start index
  const maxStart = total - windowSize - 1;
  const startIndex = Math.floor(Math.random() * maxStart);

  return data.slice(startIndex, startIndex + windowSize);
}

// --------------------------------------------------
// Load and Display symbol
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
  currentSlice = createRandomSlice(fullData);

  candles.setData(currentSlice);

  const t0 = currentSlice[0].time;
  const t1 = currentSlice[currentSlice.length - 1].time;
  document.getElementById("dateLine").textContent = `${t0} → ${t1}`;

  document.getElementById("dataCount").textContent = fullData.length;
  document.getElementById("visibleCount").textContent = currentSlice.length;

  document.getElementById("symbolInfo").style.display = "block";
}

// --------------------------------------------------
// Random Mix Loader (Stock + Index)
// --------------------------------------------------
const stocks = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "SBIN.NS", "HDFCBANK.NS"];
const indexes = ["^NSEI", "^NSEBANK", "^BSESN"];
const mix = stocks.concat(indexes);

async function loadRandomMix() {
  const pick = mix[Math.floor(Math.random() * mix.length)];
  await loadSymbol(pick);
}

// --------------------------------------------------
// Next Candle (Reveal next in current slice only)
// --------------------------------------------------
document.getElementById("btn-next").onclick = () => {
  alert("Since slices are random real data, NEXT CANDLE replay is disabled.\nEach search gives new data instead.");
};

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

document.getElementById("btn-random").onclick = loadRandomMix;
document.getElementById("btn-historical").onclick = loadRandomMix;

// Hide info toggle
document.getElementById("hide-info").onchange = (e) => {
  document.getElementById("symbolInfo").style.display = e.target.checked
    ? "none"
    : "block";
};

// --------------------------------------------------
// Load one random chart on startup
// --------------------------------------------------
loadRandomMix();
