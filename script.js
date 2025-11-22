/* --------------------------------------------
   FULL WORKING SCRIPT.JS (Option A + T3 ranges)
   -------------------------------------------- */

const WORKER_BASE_URL = "https://india-charts.8652527002arvind.workers.dev";

/* --------------------------------------------------
   T3 — Custom timeframe ranges (you selected T3)
   Change here anytime
-------------------------------------------------- */
const TIMEFRAME_RANGES = {
  "5m":  "7d",
  "15m": "30d",
  "60m": "90d",
  "240m":"180d",
  "1d":  "5y"
};

// Mapping for button → interval
const INTERVAL_KEYS = {
  "5m": "5m",
  "15m": "15m",
  "60m": "60m",
  "240m":"240m",
  "1d": "1d"
};

/* --------------------------------------------------
   Chart Initialization
-------------------------------------------------- */
const chartEl = document.getElementById("chart");
const chart = LightweightCharts.createChart(chartEl, {
  width: chartEl.clientWidth,
  height: 640,
  layout: { background: { color: "#02101a" }, textColor: "#bfe1ff" },
  grid: { vertLines: { color: "#071827" }, horzLines: { color: "#071827" } }
});
const candles = chart.addCandlestickSeries();

window.addEventListener("resize", () => {
  chart.applyOptions({ width: chartEl.clientWidth });
});

/* --------------------------------------------------
   Global State
-------------------------------------------------- */
let fullData = [];      // fetched complete dataset
let visibleData = [];   // current slice
let sliceStart = 0;
let sliceSize = 0;
let currentSymbol = null;
let currentInterval = "60m";  // default = 1h

/* --------------------------------------------------
   Symbol Normalizer (NSE/BSE/Indices support)
-------------------------------------------------- */
function normSymbol(raw) {
  if (!raw) return null;

  let s = raw.toUpperCase().trim();
  const map = {
    "NIFTY": "^NSEI",
    "NIFTY50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "BANK NIFTY": "^NSEBANK",
    "SENSEX": "^BSESN"
  };

  if (map[s]) return map[s];
  if (s.startsWith("^")) return s;
  if (s.endsWith(".NS") || s.endsWith(".BO")) return s;

  return s.replace(/\s+/g, "") + ".NS";
}

/* --------------------------------------------------
   Utils
-------------------------------------------------- */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeSeries(data) {
  return data.map(d => {
    const timeStr =
      typeof d.time === "number"
        ? new Date(d.time * 1000).toISOString().split("T")[0]
        : d.time;

    return {
      time: timeStr,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume
    };
  });
}

/* --------------------------------------------------
   Fetch Data from Cloudflare Worker
-------------------------------------------------- */
async function fetchFull(symbol, interval, range) {
  const url = `${WORKER_BASE_URL}/?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;

  console.log("FETCH URL:", url); // DEBUG

  const res = await fetch(url);
  if (!res.ok) throw new Error("Worker error: " + res.status);

  const json = await res.json();
  return json.data || [];
}

/* --------------------------------------------------
   Create Random Real Slice
-------------------------------------------------- */
function makeRandomSlice(data) {
  const total = data.length;

  if (total <= 80) {
    return { start: 0, size: total, slice: data.slice() };
  }

  const minW = 80;
  const maxW = 350;

  const w = Math.min(
    maxW,
    Math.max(minW, randInt(minW, Math.floor(total * 0.6)))
  );

  const maxStart = Math.max(0, total - w - 1);
  const start = randInt(0, maxStart);

  return {
    start,
    size: w,
    slice: data.slice(start, start + w)
  };
}

/* --------------------------------------------------
   Load Symbol (core function)
-------------------------------------------------- */
async function loadSymbol(rawSymbol) {
  const sym = normSymbol(rawSymbol);
  if (!sym) {
    alert("Enter a valid symbol");
    return;
  }

  currentSymbol = sym;
  document.getElementById("symbolLine").textContent = sym;

  // Get correct range for interval
  const range = TIMEFRAME_RANGES[currentInterval] || "5y";

  try {
    const data = await fetchFull(sym, currentInterval, range);

    if (!data.length) {
      alert("No data returned for " + sym);
      return;
    }

    fullData = normalizeSeries(data);

    const rs = makeRandomSlice(fullData);
    sliceStart = rs.start;
    sliceSize = rs.size;
    visibleData = rs.slice;

    candles.setData(visibleData);
    updateMeta();
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
}

/* --------------------------------------------------
   Random Chart Loader
-------------------------------------------------- */
const popularStocks = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS"
];
const popularIndexes = ["^NSEI", "^NSEBANK", "^BSESN"];

const mixPool = popularStocks.concat(popularIndexes);

function randomPick() {
  return mixPool[randInt(0, mixPool.length - 1)];
}

async function loadRandom() {
  const pick = randomPick();
  document.getElementById("symbolInput").value = pick;
  await loadSymbol(pick);
}

/* --------------------------------------------------
   Next Candle (Replay Mode)
-------------------------------------------------- */
function nextCandle() {
  if (!fullData.length) {
    alert("Load a chart first");
    return;
  }

  const nextIndex = sliceStart + sliceSize;

  if (nextIndex >= fullData.length) {
    alert("Reached end of slice. Loading new random slice...");
    const rs = makeRandomSlice(fullData);

    sliceStart = rs.start;
    sliceSize = rs.size;
    visibleData = rs.slice;

    candles.setData(visibleData);
    updateMeta();
    return;
  }

  visibleData.push(fullData[nextIndex]);
  sliceSize++;

  candles.setData(visibleData);
  updateMeta();
}

/* --------------------------------------------------
   Update Meta Display
-------------------------------------------------- */
function updateMeta() {
  if (visibleData.length) {
    const first = visibleData[0].time;
    const last = visibleData[visibleData.length - 1].time;
    document.getElementById("dateLine").textContent = `${first} → ${last}`;
  }

  document.getElementById("dataCount").textContent = fullData.length;
  document.getElementById("visibleCount").textContent =
    visibleData.length;

  document.getElementById("symbolInfo").style.display =
    currentSymbol ? "block" : "none";
}

/* --------------------------------------------------
   Event Listeners
-------------------------------------------------- */

// timeframes
document.querySelectorAll(".tf").forEach(btn => {
  btn.addEventListener("click", async () => {
    document
      .querySelectorAll(".tf")
      .forEach(x => x.classList.remove("active"));

    btn.classList.add("active");
    currentInterval = btn.dataset.interval;

    const s = document.getElementById("symbolInput").value.trim();
    if (s) loadSymbol(s);
  });
});

// search
document
  .getElementById("symbolInput")
  .addEventListener("keyup", e => {
    if (e.key === "Enter") loadSymbol(e.target.value);
  });

// random
document.getElementById("randomBtn").addEventListener("click", loadRandom);

// next candle
document.getElementById("nextBtn").addEventListener("click", nextCandle);

// initial random chart
loadRandom();
