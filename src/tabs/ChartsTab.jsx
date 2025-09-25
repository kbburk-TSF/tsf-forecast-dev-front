// src/tabs/ChartsTab.jsx
// v10 — FROM SCRATCH. No guesses. Strict windowing and UTC dates. Exactly 7-day pre-roll, forecast area starts on selected month-01.

import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

// ----- Date helpers (UTC, no timezone drift) -----
const MS_DAY = 86400000;
function parseYMD(s){ return new Date(s + "T00:00:00Z"); }
function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function lastOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)); }
function addMonthsUTC(d, n){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+n, d.getUTCDate())); }
function fmtMDY(d){ const mm=d.getUTCMonth()+1, dd=d.getUTCDate(), yy=String(d.getUTCFullYear()).slice(-2); return `${mm}/${dd}/${yy}`; }

// Build full day list between two UTC dates (inclusive)
function daysBetweenUTC(a,b){
  const out=[]; let t=a.getTime();
  while (t<=b.getTime()+1e-3){ out.push(new Date(t)); t+=MS_DAY; }
  return out;
}

export default function ChartsTab(){
  const [ids, setIds] = useState([]);
  const [forecastId, setForecastId] = useState("");
  const [allMonths, setAllMonths] = useState([]);
  const [startMonth, setStartMonth] = useState("");
  const [monthsCount, setMonthsCount] = useState(1);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");

  // Load forecast list
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

  // Discover available months for selected forecast
  useEffect(() => {
    if (!forecastId) return;
    (async () => {
      try {
        setStatus("Scanning dates…");
        const res = await queryView({ scope:"global", model:"", series:"", forecast_id: forecastId, date_from:null, date_to:null, page:1, page_size:20000 });
        const dates = Array.from(new Set((res.rows||[]).map(r => r?.date).filter(Boolean))).sort();
        const months = Array.from(new Set(dates.map(s => s.slice(0,7)))).sort();
        setAllMonths(months);
        if (months.length) setStartMonth(months[0] + "-01");
        setStatus("");
      } catch(e){ setStatus("Failed to scan dates: " + String(e.message||e)); }
    })();
  }, [forecastId]);

  const monthOptions = useMemo(() => allMonths.map(m => ({ value: m+"-01", label: m })), [allMonths]);

  async function run(){
    if (!forecastId || !startMonth) return;
    try{
      setStatus("Loading…");

      const start = firstOfMonthUTC(parseYMD(startMonth));      // selected YYYY-MM-01 UTC
      const preRollStart = new Date(start.getTime() - 7*MS_DAY);
      const end = lastOfMonthUTC(addMonthsUTC(start, monthsCount-1));

      // Query ONLY the window we will render
      const res = await queryView({
        scope:"global", model:"", series:"",
        forecast_id: forecastId,
        date_from: ymd(preRollStart),
        date_to: ymd(end),
        page:1, page_size: 20000
      });

      // Index rows by date (UTC)
      const byDate = new Map();
      for (const r of (res.rows||[])){
        if (!r || !r.date) continue;
        byDate.set(ymd(parseYMD(r.date)), r);
      }

      // Build continuous day rows strictly within [preRollStart, end]
      const days = daysBetweenUTC(preRollStart, end);
      const strict = days.map(d => {
        const k = ymd(d);
        const r = byDate.get(k) || {};
        return { date: k, value: r.value ?? null, fv: r.fv ?? null, low: r.low ?? null, high: r.high ?? null };
      });

      setRows(strict);
      setStatus("");
    } catch(e){ setStatus(String(e.message||e)); }
  }

  return (
    <div style={{width:"100%"}}>
      <h2 style={{marginTop:0}}>Forecast Chart — engine.tsf_vw_full</h2>
      <div className="row" style={{alignItems:"end", flexWrap:"wrap"}}>
        <div>
          <label>Forecast (forecast_name)</label><br/>
          <select className="input" value={forecastId} onChange={e=>setForecastId(e.target.value)}>
            {ids.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div>
          <label>Start month</label><br/>
          <select className="input" value={startMonth} onChange={e=>setStartMonth(e.target.value)}>
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
          <button className="btn" onClick={run}>Run</button>
        </div>
        <div className="muted" style={{marginLeft:12}}>{status}</div>
      </div>
      <SpecChart rows={rows} startMonth={startMonth} monthsCount={monthsCount} />
    </div>
  );
}

// ----- Pure, deterministic chart -----
function SpecChart({ rows, startMonth, monthsCount }){
  if (!rows || !rows.length) return null;

  const W = Math.max(1400, (typeof window!=="undefined" ? window.innerWidth - 32 : 1400));
  const H = 560;
  const pad = { top: 32, right: 24, bottom: 120, left: 80 };

  const start = firstOfMonthUTC(parseYMD(startMonth));
  const preRollStart = new Date(start.getTime() - 7*MS_DAY);
  const preRollEnd = new Date(start.getTime() - MS_DAY);
  const end = lastOfMonthUTC(addMonthsUTC(start, monthsCount-1));

  const minX = preRollStart;
  const maxX = end;

  const xScale = d => {
    const t0=minX.getTime(), t1=maxX.getTime(), t=parseYMD(d).getTime();
    return pad.left + (t - t0) * (W - pad.left - pad.right) / Math.max(1, (t1 - t0));
  };
  const yVals = rows.flatMap(r => [r.value, r.low, r.high, r.fv]).filter(v => v!=null).map(Number);
  const yMin = yVals.length ? Math.min(...yVals) : 0;
  const yMax = yVals.length ? Math.max(...yVals) : 1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  const Y0 = yMin - yPad, Y1 = yMax + yPad;
  const yScale = v => pad.top + (H - pad.top - pad.bottom) * (1 - ((v - Y0) / Math.max(1e-9, (Y1 - Y0))));

  const path = pts => pts.length ? pts.map((p,i)=>(i?"L":"M")+xScale(p.x)+" "+yScale(p.y)).join(" ") : "";

  // Build series by rule (date-driven, not data-driven)
  const histActualPts = rows
    .filter(r => r.value!=null && parseYMD(r.date) <= preRollEnd)
    .map(r => ({ x:r.date, y:Number(r.value) }));

  const futActualPts = rows
    .filter(r => r.value!=null && parseYMD(r.date) >= start)
    .map(r => ({ x:r.date, y:Number(r.value) }));

  const fvPts = rows
    .filter(r => r.fv!=null && parseYMD(r.date) >= start)
    .map(r => ({ x:r.date, y:Number(r.fv) }));

  const lowPts = rows
    .filter(r => r.low!=null && parseYMD(r.date) >= start)
    .map(r => ({ x:r.date, y:Number(r.low) }));

  const highPts = rows
    .filter(r => r.high!=null && parseYMD(r.date) >= start)
    .map(r => ({ x:r.date, y:Number(r.high) }));

  const band = rows
    .filter(r => r.low!=null && r.high!=null && parseYMD(r.date) >= start)
    .map(r => ({ x:r.date, low:Number(r.low), high:Number(r.high) }));
  const bandTop = band.map(p => [xScale(p.x), yScale(p.high)]);
  const bandBot = band.slice().reverse().map(p => [xScale(p.x), yScale(p.low)]);
  const polyStr = [...bandTop, ...bandBot].map(([x,y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  // Y ticks
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
  const yTicks = niceTicks(Y0, Y1, 6);

  return (
    <svg width={W} height={H} style={{display:"block", width:"100%"}}>
      {/* axes */}
      <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>

      {/* y grid */}
      {yTicks.map((v,i)=>(
        <g key={i}>
          <line x1={pad.left-5} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="#eee"/>
          <text x={pad.left-10} y={yScale(v)+4} fontSize="11" fill="#666" textAnchor="end">{v}</text>
        </g>
      ))}

      {/* pre-roll (exact 7 days) */}
      {(() => {
        const xF = xScale(ymd(start));
        const xPR = xScale(ymd(preRollStart));
        return <rect x={xPR} y={pad.top} width={Math.max(0, xF-xPR)} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>;
      })()}

      {/* forecast interval polygon */}
      {band.length>1 && <polygon points={polyStr} fill="rgba(0,180,0,0.18)" stroke="none" />}

      {/* series */}
      <path d={path(histActualPts)} fill="none" stroke="#000" strokeWidth={1.8}/>
      <path d={path(futActualPts)}  fill="none" stroke="#000" strokeWidth={1.8} strokeDasharray="3,4"/>
      <path d={path(fvPts)}         fill="none" stroke="#1f77b4" strokeWidth={2.4}/>
      <path d={path(lowPts)}        fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
      <path d={path(highPts)}       fill="none" stroke="#2ca02c" strokeWidth={1.8}/>

      {/* x ticks for each day in our strict window */}
      {rows.map((r,i)=>(
        <g key={i} transform={`translate(${xScale(r.date)}, ${H-pad.bottom})`}>
          <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa"/>
          <text x={10} y={0} fontSize="11" fill="#666" transform="rotate(90 10 0)" textAnchor="start">{fmtMDY(parseYMD(r.date))}</text>
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
