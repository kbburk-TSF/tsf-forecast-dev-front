// src/tabs/ChartsTab.jsx
// v8 — hard clamps domain/data to [preRollStart, endOfSelectedWindow]; eliminates any pre-month dead space even if backend leaks earlier rows.

import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, d.getDate()); }
function minusDays(d, n){ const t = new Date(d); t.setDate(t.getDate()-n); return t; }
function fmtMDY(d){ const mm=d.getMonth()+1, dd=d.getDate(), yy=String(d.getFullYear()).slice(-2); return `${mm}/${dd}/${yy}`; }
function niceTicks(min, max, count=6){
  if (!isFinite(min) || !isFinite(max) || min===max) return [min||0, max||1];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count * step) / span;
  let m = 1;
  if (err <= 0.15) m = 10;
  else if (err <= 0.35) m = 5;
  else if (err <= 0.75) m = 2;
  const s = m * step, nmin = Math.floor(min/s)*s, nmax = Math.ceil(max/s)*s;
  const out = []; for (let v=nmin; v<=nmax+1e-9; v+=s) out.push(v); return out;
}

export default function ChartsTab(){
  const [ids, setIds] = useState([]);
  const [forecastId, setForecastId] = useState("");
  const [allDates, setAllDates] = useState([]);
  const [startMonth, setStartMonth] = useState("");
  const [monthsCount, setMonthsCount] = useState(2);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await listForecastIds({ scope:"global", model:"", series:"" });
        const norm = (Array.isArray(list) ? list : []).map(x => (
          typeof x === "string" ? { id:x, name:x }
          : { id:String(x.id ?? x.value ?? x), name:String(x.name ?? x.label ?? x.id ?? x) }
        ));
        setIds(norm);
        if (norm.length) setForecastId(norm[0].id);
      } catch(e){ setStatus("Could not load forecasts: " + String(e.message||e)); }
    })();
  }, []);

  useEffect(() => {
    if (!forecastId) return;
    (async () => {
      try {
        setStatus("Scanning dates…");
        const res = await queryView({ scope:"global", model:"", series:"", forecast_id: forecastId, date_from:null, date_to:null, page:1, page_size:10000 });
        const dates = Array.from(new Set((res.rows||[]).map(r => r?.date).filter(Boolean))).sort();
        setAllDates(dates);
        setStartMonth(dates.length ? ymd(firstOfMonth(new Date(dates[0]))) : "");
        setStatus("");
      } catch(e){ setStatus("Failed to scan dates: " + String(e.message||e)); }
    })();
  }, [forecastId]);

  const monthOptions = useMemo(() => {
    const uniq = Array.from(new Set(allDates.map(s => s.slice(0,7)))).sort();
    return uniq.map(m => ({ value: m+"-01", label: m }));
  }, [allDates]);

  async function run(){
    try{
      if (!forecastId || !startMonth) return;
      setStatus("Loading…");
      const start = new Date(startMonth);
      const end = lastOfMonth(addMonths(start, monthsCount - 1));
      const histFrom = minusDays(firstOfMonth(start), 7);
      const res = await queryView({
        scope:"global", model:"", series:"",
        forecast_id: forecastId,
        date_from: ymd(histFrom),
        date_to: ymd(end),
        page:1, page_size: 20000
      });
      const sorted = (res.rows||[]).slice().sort((a,b)=> new Date(a.date) - new Date(b.date));
      setRows(sorted);
      setStatus("");
    } catch(e){ setStatus(String(e.message||e)); }
  }

  return (
    <div style={{width:"100%"}}>
      <h2 style={{marginTop:0}}>Forecast Chart — engine.tsf_vw_full</h2>

      <div className="row" style={{alignItems:"end", flexWrap:"wrap"}}>
        <div>
          <label>Forecast (forecast_name)</label><br/>
          <select className="input" value={forecastId} onChange={e=>setForecastId(e.target.value)} disabled={!ids.length}>
            {!ids.length && <option>(none)</option>}
            {ids.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div>
          <label>Start month</label><br/>
          <select className="input" value={startMonth} onChange={e=>setStartMonth(e.target.value)} disabled={!monthOptions.length}>
            {!monthOptions.length && <option>(none)</option>}
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label>Months to show</label><br/>
          <select className="input" value={monthsCount} onChange={e=>setMonthsCount(Number(e.target.value))}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div>
          <button className="btn" onClick={run} disabled={!forecastId || !startMonth}>Run</button>
        </div>
        <div className="muted" style={{marginLeft:12}}>{status}</div>
      </div>

      {/* Pass the explicit clamp window down */}
      <SpecChart rows={rows} startMonth={startMonth} monthsCount={monthsCount} />
    </div>
  );
}

function SpecChart({ rows, startMonth, monthsCount }){
  if (!rows || !rows.length) return null;

  const W = Math.max(1400, (typeof window!=="undefined" ? window.innerWidth - 32 : 1400));
  const H = 560;
  const pad = { top: 32, right: 24, bottom: 120, left: 80 };

  const forecastStart = new Date(startMonth);
  const histFrom = new Date(firstOfMonth(forecastStart)); histFrom.setDate(histFrom.getDate()-7);
  const end = lastOfMonth(addMonths(new Date(startMonth), monthsCount - 1));
  const histTo = new Date(forecastStart); histTo.setDate(forecastStart.getDate()-1);
  const MS_DAY = 24*60*60*1000;

  // 1) Normalize and drop rows with no data at all
  const anyData = r => r && r.date && (r.value!=null || r.fv!=null || r.low!=null || r.high!=null);
  // 2) Hard clamp to [histFrom, end] regardless of what backend returns
  const inWindow = r => {
    const d = new Date(r.date);
    return d >= histFrom && d <= end;
  };
  const usable = rows.filter(anyData).filter(inWindow).sort((a,b)=> new Date(a.date)-new Date(b.date));
  if (!usable.length) return null;

  // X-domain strictly equals the requested window
  const minX = histFrom;
  const maxX = end;

  const values = usable.flatMap(r => [r.value, r.low, r.high, r.fv]).filter(v => v!=null).map(Number);
  const yMin = values.length ? Math.min(...values) : 0;
  const yMax = values.length ? Math.max(...values) : 1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  const Y0 = yMin - yPad, Y1 = yMax + yPad;

  const xScale = d => {
    const t0 = minX.getTime(), t1 = maxX.getTime(), t = d.getTime();
    return pad.left + (t - t0) * (W - pad.left - pad.right) / Math.max(1, (t1 - t0));
  };
  const yScale = v => pad.top + (H - pad.top - pad.bottom) * (1 - ((v - Y0) / Math.max(1e-9, (Y1 - Y0))));

  const ptsValAll = usable.filter(r => r.value!=null).map(r => ({ x:new Date(r.date), y:Number(r.value) }));
  const ptsValHist = ptsValAll.filter(p => p.x >= histFrom && p.x <= histTo);     // solid
  const ptsValFut  = ptsValAll.filter(p => p.x >= forecastStart);                 // dotted

  const ptsLow  = usable.filter(r => r.low!=null  && new Date(r.date) >= forecastStart).map(r => ({ x:new Date(r.date), y:Number(r.low) }));
  const ptsHigh = usable.filter(r => r.high!=null && new Date(r.date) >= forecastStart).map(r => ({ x:new Date(r.date), y:Number(r.high) }));
  const ptsFv   = usable.filter(r => r.fv!=null   && new Date(r.date) >= forecastStart).map(r => ({ x:new Date(r.date), y:Number(r.fv) }));

  const band = usable
    .filter(r => r.low!=null && r.high!=null && new Date(r.date) >= forecastStart)
    .map(r => ({ x:new Date(r.date), low:Number(r.low), high:Number(r.high) }));
  const bandTop = band.map(p => [xScale(p.x), yScale(p.high)]);
  const bandBot = band.slice().reverse().map(p => [xScale(p.x), yScale(p.low)]);
  const polyPts = [...bandTop, ...bandBot];
  const polyStr = polyPts.map(([x,y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  const path = pts => pts.length ? pts.map((p,i)=>(i?"L":"M")+xScale(p.x)+" "+yScale(p.y)).join(" ") : "";

  // ticks for each date IN WINDOW only
  const xDays = usable.map(r => new Date(r.date));

  const yTicks = niceTicks(Y0, Y1, 6);

  return (
    <svg width={W} height={H} style={{display:"block", width:"100%"}}>
      <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>

      {yTicks.map((v,i)=>(
        <g key={i}>
          <line x1={pad.left-5} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="#eee"/>
          <text x={pad.left-10} y={yScale(v)+4} fontSize="11" fill="#666" textAnchor="end">{v}</text>
        </g>
      ))}

      {/* historical mask (exact 7d pre-roll) computed in pixels to avoid any date parsing/zone quirks */}
      {(() => { const span = Math.max(1, (maxX.getTime()-minX.getTime())); const pxPerMs = (W - pad.left - pad.right) / span; const xF = xScale(forecastStart); const w = pxPerMs * (7*MS_DAY); const x = Math.max(pad.left, xF - w); return (<rect x={x} y={pad.top} width={Math.max(0, xF - x)} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>); })()}

      {/* polygon (forecast window only) */}
      {polyPts.length>2 && <polygon points={polyStr} fill="rgba(0,180,0,0.18)" stroke="none" />}

      <path d={path(ptsLow)}  fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
      <path d={path(ptsHigh)} fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
      <path d={path(ptsFv)}   fill="none" stroke="#1f77b4" strokeWidth={2.4}/>
      <path d={path(ptsValHist)} fill="none" stroke="#000" strokeWidth={1.8}/>
      <path d={path(ptsValFut)}  fill="none" stroke="#000" strokeWidth={1.8} strokeDasharray="3,4"/>

      {xDays.map((d,i)=>(
        <g key={i} transform={`translate(${xScale(d)}, ${H-pad.bottom})`}>
          <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa"/>
          <text x={10} y={0} fontSize="11" fill="#666" transform="rotate(90 10 0)" textAnchor="start">{fmtMDY(d)}</text>
        </g>
      ))}

      <Legend x={pad.left+10} y={pad.top+10} />
    </svg>
  );
}

function Legend({ x, y }){
  const items = [
    { type:"line", color:"#000",     label:"Actual (historical)", width:1.8, dash:null },
    { type:"line", color:"#000",     label:"Actual (forecast)",   width:1.8, dash:"3,4" },
    { type:"line", color:"#1f77b4",  label:"Forecast (fv)",       width:2.4, dash:null },
    { type:"line", color:"#2ca02c",  label:"Low (low)",           width:1.8, dash:null },
    { type:"line", color:"#2ca02c",  label:"High (high)",         width:1.8, dash:null },
    { type:"fill", color:"rgba(0,180,0,0.18)", label:"Interval (low–high, forecast only)" },
    { type:"fill", color:"rgba(0,0,0,0.08)",  label:"Historical mask (7d)" },
  ];
  return (
    <g>
      {items.map((it,i)=>(
        <g key={i} transform={`translate(${x}, ${y + i*18})`}>
          {it.type==="line"
            ? <line x1={0} y1={0} x2={24} y2={0} stroke={it.color} strokeWidth={it.width} strokeDasharray={it.dash||"0"} />
            : <rect x={0} y={-7} width={24} height={14} fill={it.color} />
          }
          <text x={30} y={4} fontSize="12" fill="#333">{it.label}</text>
        </g>
      ))}
    </g>
  );
}
