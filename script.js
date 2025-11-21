// Script for frontend — connected to your Cloudflare Worker
const WORKER_BASE_URL = "https://india-charts.8652527002arvind.workers.dev";

// chart setup
const chartContainer = document.getElementById('chart');
const chart = LightweightCharts.createChart(chartContainer, {
  width: chartContainer.clientWidth,
  height: 620,
  layout: { background: { color: '#02101a' }, textColor: '#bfe1ff' },
  grid: { vertLines: { color: '#071827' }, horzLines: { color: '#071827' } }
});
const candles = chart.addCandlestickSeries();
window.addEventListener('resize', ()=>chart.applyOptions({ width: chartContainer.clientWidth }));

// helpers & state
const popularStocks = ["RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","ICICIBANK.NS","MARUTI.NS","SBIN.NS","BAJFINANCE.NS","LT.NS"];
const indianIndexes = ["^NSEI","^NSEBANK","^BSESN","^CNXIT","^CNXFIN","^NSEMIDCAP","^NSESMLCAP"];
const mixPool = popularStocks.concat(indianIndexes);

let fullData = [];
let visibleIndex = 0;

// normalize input -> Yahoo-style symbol
function normalizeToIndianSymbol(input){
  if(!input) return null;
  let s = input.toUpperCase().trim();
  // common names mapping
  const map = {
    "NIFTY":"^NSEI","NIFTY50":"^NSEI","BANKNIFTY":"^NSEBANK","BANK NIFTY":"^NSEBANK",
    "SENSEX":"^BSESN","NSEBANK":"^NSEBANK","NSEI":"^NSEI"
  };
  if(map[s]) return map[s];
  if(s.startsWith('^')) return s;
  if(s.endsWith('.NS')||s.endsWith('.BO')||s.endsWith('.BSE')||s.endsWith('.NSE')) return s;
  s = s.replace(/\s+/g,'');
  return s + '.NS';
}

// UI updates
function updateSymbolInfo(symbol,range,isRandom=false){
  const box=document.getElementById('symbolInfo');
  const sl=document.getElementById('symbolLine');
  const dl=document.getElementById('dateLine');
  if(!symbol || isRandom){
    box.style.display='block';
    sl.textContent='Random / Practice Chart';
    dl.textContent='';
    return;
  }
  const label = symbol.startsWith('^') ? 'Index' : 'Stock';
  sl.textContent = `${symbol} — ${label}`;
  if(Array.isArray(range) && range.length>0) dl.textContent = `${range[0]} → ${range[range.length-1]}`;
  else dl.textContent='';
  box.style.display='block';
}

// fetch via worker
async function fetchFromWorker(symbol,range='2y',interval='1d'){
  const url = `${WORKER_BASE_URL}/?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Worker fetch failed '+res.status);
  return await res.json(); // { symbol, data }
}

// load symbol (real)
async function loadSymbol(rawInput){
  const symbol = normalizeToIndianSymbol(rawInput);
  if(!symbol) return alert('Enter a symbol');
  updateSymbolInfo(symbol,null,false);
  try{
    const payload = await fetchFromWorker(symbol,'5y','1d');
    if(!payload || !payload.data || payload.data.length===0){
      alert('No data returned for ' + symbol + '. If index shows empty, random fallback will be used.');
      // fallback: generate random synthetic chart for practice
      fullData = generateRandomData(300, 100 + Math.random()*100);
      visibleIndex = Math.min(60, fullData.length);
      candles.setData(fullData.slice(0,visibleIndex));
      document.getElementById('dataCount').textContent = fullData.length;
      document.getElementById('visibleCount').textContent = visibleIndex;
      updateSymbolInfo(null,null,true);
      return;
    }
    fullData = payload.data;
    visibleIndex = Math.min(80, fullData.length);
    candles.setData(fullData.slice(0,visibleIndex));
    document.getElementById('dataCount').textContent = fullData.length;
    document.getElementById('visibleCount').textContent = visibleIndex;
    updateSymbolInfo(symbol, fullData.map(d=>d.time), false);
  }catch(err){
    console.error(err);
    alert('Error loading symbol: '+err.message);
  }
}

// Random generator fallback (keeps UI snappy)
function generateRandomData(count=200,start=100){
  const out=[]; let price=start;
  for(let i=0;i<count;i++){
    const open=+(price.toFixed(2));
    const change=(Math.random()-0.45)*(price*0.02);
    const close=+(Math.max(0.1, open + change).toFixed(2));
    const high=+(Math.max(open,close) + Math.random()* (price*0.008)).toFixed(2);
    const low=+(Math.min(open,close) - Math.random()* (price*0.008)).toFixed(2);
    out.push({ time: i+1, open, high, low, close });
    price = close;
  }
  return out;
}

// Random mix loader (C - mix indexes + stocks)
async function loadRandomMix(){
  const pick = mixPool[Math.floor(Math.random()*mixPool.length)];
  // pick may be index or stock; try real fetch
  try{
    await loadSymbol(pick);
  }catch(e){
    // if loadSymbol fails, fallback to synthetic
    fullData = generateRandomData(250, 100 + Math.random()*200);
    visibleIndex = Math.min(80, fullData.length);
    candles.setData(fullData.slice(0,visibleIndex));
    document.getElementById('dataCount').textContent = fullData.length;
    document.getElementById('visibleCount').textContent = visibleIndex;
    updateSymbolInfo(null,null,true);
  }
}

// Next candle reveal
document.getElementById('btn-next').addEventListener('click', ()=>{
  if(visibleIndex < fullData.length){
    visibleIndex++;
    candles.setData(fullData.slice(0,visibleIndex));
  } else {
    // append one more candle (either from real data or synthetic)
    const more = fullData.length ? [fullData[fullData.length-1]] : generateRandomData(1,100);
    fullData.push(...more);
    visibleIndex = fullData.length;
    candles.setData(fullData.slice(0,visibleIndex));
  }
  document.getElementById('visibleCount').textContent = visibleIndex;
});

// buttons
document.getElementById('btn-random').addEventListener('click', ()=>loadRandomMix());
document.getElementById('btn-historical').addEventListener('click', ()=>{
  // pick a random real symbol or fallback synthetic
  const pick = mixPool[Math.floor(Math.random()*mixPool.length)];
  loadSymbol(pick);
});

// search UI
document.getElementById('searchBtn').addEventListener('click', ()=>{
  const s = document.getElementById('symbolInput').value.trim();
  if(s) loadSymbol(s);
});
document.getElementById('symbolInput').addEventListener('keyup', (e)=>{ if(e.key==='Enter') document.getElementById('searchBtn').click(); });
document.getElementById('indexSelect').addEventListener('change', (e)=>{ if(e.target.value) loadSymbol(e.target.value); });

// hide info checkbox
document.getElementById('hide-info').addEventListener('change', (e)=>{
  document.getElementById('symbolInfo').style.display = e.target.checked ? 'none' : 'block';
});

// initial example load
(async ()=>{
  // show a random mix at start
  await loadRandomMix();
})();
