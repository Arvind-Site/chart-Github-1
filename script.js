// =========================
// CONFIG
// =========================
const WORKER_BASE_URL = "https://india-charts.8652527002arvind.workers.dev";

// Supported Indian symbols
const INDIAN_SYMBOLS = [
  "NIFTY 50|^NSEI",
  "BANKNIFTY|^NSEBANK",
  "FINNIFTY|^CNXFIN",
  "RELIANCE|RELIANCE.NS",
  "TCS|TCS.NS",
  "INFY|INFY.NS",
  "HDFCBANK|HDFCBANK.NS",
  "ICICIBANK|ICICIBANK.NS",
  "KOTAKBANK|KOTAKBANK.NS",
  "SBIN|SBIN.NS",
  "LT|LT.NS",
  "BAJFINANCE|BAJFINANCE.NS",
  "BHARTIARTL|BHARTIARTL.NS"
];

// timeframes
const TIMEFRAMES = {
  "5m": "5m",
  "15m": "15m",
  "1h": "60m",
  "4h": "240m",
  "1d": "1d"
};

let chart, candleSeries;
let currentSymbol = null;
let currentInterval = "1d";
let fullSeries = [];
let randomSlice = [];
let sliceIndex = 0;

// =========================
// SAFE NORMALIZER (FIXES CRASH)
// =========================
function normalizeSeries(data) {
  return data
    .filter(d =>
      d &&
      d.time &&
      d.open != null &&
      d.high != null &&
      d.low != null &&
      d.close != null
    )
    .map(d => {
      const t =
        typeof d.time === "number"
          ? new Date(d.time * 1000).toISOString().split("T")[0]
          : d.time;

      return {
        time: t,
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
        volume: Number(d.volume || 0)
      };
    });
}

// =========================
// API CALL
// =========================
async function fetchCandles(symbol, interval = "1d", range = "180d") {
  const url = `${WORKER_BASE_URL}/?symbol=${symbol}&interval=${interval}&range=${range}`;
  console.log("FETCH:", url);

  const res = await fetch(url);
  const json = await res.json();

  if (!json.data || json.data.length === 0) {
    throw new Error("Empty or invalid data returned");
  }

  return normalizeSeries(json.data);
}

// =========================
// RANDOM SLICE
// =========================
function pickRandomSlice(data) {
  if (data.length < 60) return data;

  const sliceSize = Math.floor(Math.random() * (90 - 30)) + 30;
  const start = Math.floor(Math.random() * (data.length - sliceSize));

  return data.slice(start, start + sliceSize);
}

// =========================
// NEXT CANDLE
// =========================
function addNextCandle() {
  if (sliceIndex >= fullSeries.length - 1) return;

  sliceIndex++;
  const next = fullSeries[sliceIndex];

  randomSlice.push(next);
  candleSeries.update(next);
}

// =========================
// LOAD SYMBOL
// =========================
async function loadSymbol(symbol) {
  try {
    document.getElementById("loading").style.display = "block";

    currentSymbol = symbol;

    fullSeries = await fetchCandles(symbol, currentInterval, "360d");
    randomSlice = pickRandomSlice(fullSeries);
    sliceIndex = fullSeries.indexOf(randomSlice[randomSlice.length - 1]);

    candleSeries.setData(randomSlice);

    updateInfoBox(symbol, randomSlice);

  } catch (err) {
    alert("Failed to load symbol: " + err.message);
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

// =========================
// UPDATE INFO BOX
// =========================
function updateInfoBox(symbol, series) {
  const start = series[0].time;
  const end = series[series.length - 1].time;

  document.getElementById("info-symbol").textContent = symbol;
  document.getElementById("info-interval").textContent = currentInterval;
  document.getElementById("info-range").textContent = `${start} → ${end}`;
}

// =========================
// RANDOM BUTTON
// =========================
function loadRandom() {
  const pick = INDIAN_SYMBOLS[Math.floor(Math.random() * INDIAN_SYMBOLS.length)];
  const symbol = pick.split("|")[1];
  loadSymbol(symbol);
}

// =========================
// TIMEFRAME BUTTONS
// =========================
function changeTimeframe(tf) {
  currentInterval = TIMEFRAMES[tf];
  if (currentSymbol) loadSymbol(currentSymbol);
}

// =========================
// SEARCH
// =========================
function searchSymbol() {
  const input = document.getElementById("search").value.trim().toUpperCase();

  const found = INDIAN_SYMBOLS.find(s => s.startsWith(input));
  if (!found) {
    alert("Symbol not found");
    return;
  }

  const symbol = found.split("|")[1];
  loadSymbol(symbol);
}

// =========================
// INIT CHART
// =========================
function initChart() {
  chart = LightweightCharts.createChart(document.getElementById("chart"), {
    width: window.innerWidth - 40,
    height: 500,
    layout: { background: { color: "#ffffff" }, textColor: "#333" },
    grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } }
  });

  candleSeries = chart.addCandlestickSeries();
}

initChart();

// BUTTON EVENTS
document.getElementById("btn-random").onclick = loadRandom;
document.getElementById("btn-next").onclick = addNextCandle;
document.getElementById("btn-search").onclick = searchSymbol;

document.getElementById("tf-5m").onclick = () => changeTimeframe("5m");
document.getElementById("tf-15m").onclick = () => changeTimeframe("15m");
document.getElementById("tf-1h").onclick = () => changeTimeframe("1h");
document.getElementById("tf-4h").onclick = () => changeTimeframe("4h");
document.getElementById("tf-1d").onclick = () => changeTimeframe("1d");
