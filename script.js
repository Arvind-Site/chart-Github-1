/* Option A script: random real-slice + next-candle + timeframe (T3 custom ranges)
   TIMEFRAME_RANGES (T3): set your custom ranges here
*/
const WORKER_BASE_URL = "https://india-charts.8652527002arvind.workers.dev";

// ---------- T3 custom ranges (you can edit) ----------
const TIMEFRAME_RANGES = {
  "5m":  "7d",
  "15m": "30d",
  "60m": "90d",
  "240m":"180d",
  "1d":  "5y"
};
// map displayed buttons to interval key
const INTERVAL_KEYS = {
  "5m": "5m",
  "15m": "15m",
  "60m": "60m",
  "240m":"240m",
  "1d": "1d"
};

// ---------- Chart setup ----------
const chartEl = document.getElementById("chart");
const chart = LightweightCharts.createChart(chartEl, {
  width: chartEl.clientWidth,
  height: 640,
  layout: { background: { color: "#02101a" }, textColor: "#bfe1ff" },
  grid: { vertLines: { color: "#071827" }, horzLines: { color: "#071827" } }
});
const candles = chart.addCandlestickSeries();
window.addEventListener("resize", ()=>chart.applyOptions({ width: chartEl.clientWidth }));

// ---------- State ----------
let fullData = [];          // entire returned dataset (real)
let sliceStart = 0;         // index in fullData for slice start
let sliceSize = 0;          // number of candles in current slice
let visibleData = [];       // currently displayed slice
let currentSymbol = null;
let currentInterval = "60m"; // default 1h

// ---------- Helpers ----------
function normSymbol(input){
  if(!input) return null;
  let s = input.toUpperCase().trim();
  const map = { "NIFTY":"^NSEI","NIFTY50":"^NSEI","BANKNIFTY":"^NSEBANK","BANK NIFTY":"^NSEBANK","SENSEX":"^BSESN" };
  if(map[s]) return map[s];
  if(s.startsWith("^")) return s;
  if(s.endsWith(".NS")||s.endsWith(".BO")||s.endsWith(".BSE")) return s;
  return s.replace(/\s+/g,'') + ".NS";
}

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

// Create random slice (real data only)
function makeRandomSlice(data){
  const total = data.length;
  if(total <= 60) return { start:0, size: total, slice: data.slice(0) };

  // random window size between 80 and 350 (adjust if data shorter)
  const minW = 80, maxW = 350;
  const w = Math.min(maxW, Math.max(minW, randInt(minW, Math.min(maxW, Math.floor(total*0.6)))));
  const maxStart = Math.max(0, total - w - 1);
  const start = randInt(0, maxStart);
  return { start, size: w, slice: data.slice(start, start + w) };
}

// convert worker data (time as 'YYYY-MM-DD' or number) to lightweight format if needed (assumes worker returns {time,open,high,low,close,volume})
function normalizeSeries(data){
  // If data.time is unix seconds, convert to yyyy-mm-dd
  return data.map(d => {
    // if time already string like '2024-01-02' keep it
    const t = (typeof d.time === 'number') ? (new Date(d.time * 1000).toISOString().split('T')[0]) : d.time;
    return { time: t, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume };
  });
}

// ---------- Fetch full data from Worker ----------
async function fetchFull(symbol, interval, range){
  const url = `${WORKER_BASE_URL}/?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Worker fetch failed: '+res.status);
  const json = await res.json();
  return json.data || [];
}

// ---------- Load symbol and show random slice ----------
async function loadSymbol(raw){
  const sym = normSymbol(raw);
  if(!sym) { alert("Enter symbol"); return; }
  currentSymbol = sym;
  document.getElementById('symbolLine').textContent = sym;
  // convert interval key to timeframe-range mapping
  const range = TIMEFRAME_RANGES[currentInterval] || "5y";

  try{
    const data = await fetchFull(sym, currentInterval, range);
    if(!data || !data.length){
      alert("No data returned for " + sym + " (interval " + currentInterval + "). Try different timeframe.");
      return;
    }

    fullData = normalizeSeries(data);

    // Build random slice (real)
    const rs = makeRandomSlice(fullData);
    sliceStart = rs.start;
    sliceSize = rs.size;
    visibleData = rs.slice;

    candles.setData(visibleData);
    updateMeta();

  }catch(err){
    console.error(err);
    alert("Error fetching data: " + err.message);
  }
}

// ---------- Random Chart (pick a random index/stock then loadSymbol) ----------
const popularStocks = ["RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","ICICIBANK.NS"];
const popularIndexes = ["^NSEI","^NSEBANK","^BSESN"];
const mixPool = popularStocks.concat(popularIndexes);
function randomPick(){
  return mixPool[Math.floor(Math.random()*mixPool.length)];
}
async function loadRandom(){
  const pick = randomPick();
  document.getElementById('symbolInput').value = pick;
  await loadSymbol(pick);
}

// ---------- Next Candle logic (replay) ----------
function nextCandle(){
  if(!fullData.length){ alert("No data loaded"); return; }
  const nextIndex = sliceStart + sliceSize;
  if(nextIndex >= fullData.length){
    alert("Reached the end of available history for this slice. Loading a new random slice.");
    // get a fresh slice from same fullData (or reload new if you prefer)
    const rs = makeRandomSlice(fullData);
    sliceStart = rs.start;
    sliceSize = rs.size;
    visibleData = rs.slice;
    candles.setData(visibleData);
    updateMeta();
    return;
  }
  // append next candle from real fullData
  visibleData.push(fullData[nextIndex]);
  sliceSize++;
  candles.setData(visibleData);
  updateMeta();
}

// ---------- UI and events ----------
function updateMeta(){
  document.getElementById('dateLine').textContent = visibleData.length ? `${visibleData[0].time} → ${visibleData[visibleData.length-1].time}` : '';
  document.getElementById('dataCount').textContent = fullData.length;
  document.getElementById('visibleCount').textContent = visibleData.length;
  document.getElementById('symbolInfo').style.display = currentSymbol ? 'block' : 'none';
}

// timeframe buttons
document.querySelectorAll('.tf').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    document.querySelectorAll('.tf').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    // interval key mapping: button data-interval use "5m","15m","60m","240m","1d"
    currentInterval = btn.dataset.interval;
    // if a symbol is already in input, reload it with new timeframe
    const s = document.getElementById('symbolInput').value.trim();
    if(s) await loadSymbol(s);
  });
});

// search
document.getElementById('searchBtn')?.addEventListener('click', ()=> loadSymbol(document.getElementById('symbolInput').value));
document.getElementById('symbolInput').addEventListener('keyup', (e)=>{ if(e.key==='Enter') loadSymbol(e.target.value); });

// Random and Next
document.getElementById('randomBtn').addEventListener('click', loadRandom);
document.getElementById('nextBtn').addEventListener('click', nextCandle);

// initial load: one random chart
loadRandom();
