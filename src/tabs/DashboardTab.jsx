// src/tabs/DashboardTab.jsx
// 4 copies of SpecChart from ChartsTab.jsx

import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

const MS_DAY = 86400000;
function parseYMD(s){ return new Date(s + "T00:00:00Z"); }
function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function lastOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)); }
function addMonthsUTC(d, n){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+n, d.getUTCDate())); }
function fmtMDY(s){ const d=parseYMD(s); const mm=d.getUTCMonth()+1, dd=d.getUTCDate(), yy=String(d.getUTCFullYear()).slice(-2); return `${mm}/${dd}/${yy}`; }
function daysBetweenUTC(a,b){ const out=[]; let t=a.getTime(); while (t<=b.getTime()+1e-3){ out.push(ymd(new Date(t))); t+=MS_DAY; } return out; }

export default function DashboardTab(){
  const [ids, setIds] = useState([]);
  const [forecastId, setForecastId] = useState("");
  const [allMonths, setAllMonths] = useState([]);
  const [startMonth, setStartMonth] = useState("");
  const [monthsCount, setMonthsCount] = useState(1);
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
      const start = firstOfMonthUTC(parseYMD(startMonth));
      const preRollStart = new Date(start.getTime() - 7*MS_DAY);
      const end = lastOfMonthUTC(addMonthsUTC(start, monthsCount-1));

      const res = await queryView({
        scope:"global", model:"", series:"",
        forecast_id: forecastId,
        date_from: ymd(preRollStart),
        date_to: ymd(end),
        page:1, page_size: 20000
      });

      const byDate = new Map();
      for (const r of (res.rows||[])){
        if (!r || !r.date) continue;
        byDate.set(r.date, r);
      }
      const days = daysBetweenUTC(preRollStart, end);
      const strict = days.map(d => {
        const r = byDate.get(d) || {};
        return { date: d, value: r.value ?? null, fv: r.fv ?? null, low: r.low ?? null, high: r.high ?? null };
      });
      setRows(strict);
      setStatus("");
    } catch(e){ setStatus(String(e.message||e)); }
  }

  return (
    <div style={{width:"100%"}}>
      <h2 style={{marginTop:0}}>Dashboard — 4 Charts</h2>
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

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginTop:12}}>
        <SpecChart rows={rows} />
        <SpecChart rows={rows} />
        <SpecChart rows={rows} />
      </div>

      <div style={{marginTop:16}}>
        <SpecChart rows={rows} />
      </div>
    </div>
  );
}

function SpecChart({ rows }){
  if (!rows || !rows.length) return null;

  const W = Math.max(1400, (typeof window!=="undefined" ? window.innerWidth - 32 : 1400));
  const H = 560;
  const pad = { top: 32, right: 24, bottom: 120, left: 80 };

  const N = rows.length;           // 7 pre-roll + month days
  const startIdx = 7;              // forecast begins after 7 pre-roll days

  const xScale = (i) => pad.left + (i) * (W - pad.left - pad.right) / Math.max(1, (N-1));
  const yVals = rows.flatMap(r => [r.value, r.low, r.high, r.fv]).filter(v => v!=null).map(Number);
  const yMin = yVals.length ? Math.min(...yVals) : 0;
  const yMax = yVals.length ? Math.max(...yVals) : 1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  const Y0 = yMin - yPad, Y1 = yMax + yPad;
  const yScale = v => pad.top + (H - pad.top - pad.bottom) * (1 - ((v - Y0) / Math.max(1e-9, (Y1 - Y0))));

  const path = pts => pts.length ? pts.map((p,i)=>(i?"L":"M")+xScale(p.i)+" "+yScale(p.y)).join(" ") : "";

  const histActualPts = rows.map((r,i) => (r.value!=null && i < startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const futActualPts  = rows.map((r,i) => (r.value!=null && i >= startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const fvPts         = rows.map((r,i) => (r.fv!=null    && i >= startIdx) ? { i, y:Number(r.fv) }    : null).filter(Boolean);
  const lowPts        = rows.map((r,i) => (r.low!=null   && i >= startIdx) ? { i, y:Number(r.low) }   : null).filter(Boolean);
  const highPts       = rows.map((r,i) => (r.high!=null  && i >= startIdx) ? { i, y:Number(r.high) }  : null).filter(Boolean);

  const bandTop = rows.map((r,i) => (r.low!=null && r.high!=null && i >= startIdx) ? [xScale(i), yScale(Number(r.high))] : null).filter(Boolean);
  const bandBot = rows.map((r,i) => (r.low!=null && r.high!=null && i >= startIdx) ? [xScale(i), yScale(Number(r.low))]  : null).filter(Boolean).reverse();
  const polyStr = [...bandTop, ...bandBot].map(([x,y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

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
      <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>

      {yTicks.map((v,i)=>(
        <g key={i}>
          <line x1={pad.left-5} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="#eee"/>
          <text x={pad.left-10} y={yScale(v)+4} fontSize="11" fill="#666" textAnchor="end">{v}</text>
        </g>
      ))}

      {/* pre-roll (exact 7 days) */}
      <rect x={xScale(0)} y={pad.top} width={Math.max(0, xScale(startIdx)-xScale(0))} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>

      {/* forecast interval polygon (light gold) */}
      {polyStr && <polygon points={polyStr} fill="rgba(255,215,0,0.22)" stroke="none" />}

      {/* series */}
      <path d={path(histActualPts)} fill="none" stroke="#000" strokeWidth={1.8}/>
      <path d={path(futActualPts)}  fill="none" stroke="#000" strokeWidth={2.4} strokeDasharray="4,6"/>
      <path d={path(fvPts)}         fill="none" stroke="#1f77b4" strokeWidth={2.4}/>
      <path d={path(lowPts)}        fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
      <path d={path(highPts)}       fill="none" stroke="#2ca02c" strokeWidth={1.8}/>

      {/* x ticks */}
      {rows.map((r,i)=>(
        <g key={i} transform={`translate(${xScale(i)}, ${H-pad.bottom})`}>
          <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa"/>
          <text x={10} y={0} fontSize="11" fill="#666" transform="rotate(90 10 0)" textAnchor="start">{fmtMDY(r.date)}</text>
        </g>
      ))}

      <Legend x={pad.left+10} y={pad.top+10} />
    </svg>
  );
}

// Updated legend: no Low/High entries; boxed over white background
function Legend({ x, y }){
  const items = [
    { type:"line", color:"#000",     label:"Historical Values", width:1.8, dash:null },
    { type:"line", color:"#000",     label:"Actuals (for comparison)", width:2.4, dash:"4,6" },
    { type:"line", color:"#1f77b4",  label:"Targeted Seasonal Forecast", width:2.4, dash:null },
    { type:"fill", color:"rgba(255,215,0,0.22)", label:"Forecast Interval" },
    { type:"fill", color:"rgba(0,0,0,0.08)",  label:"Historical" },
  ];
  const rowH = 18;
  const padBox = 10;
  const boxW = 280;
  const boxH = padBox*2 + items.length*rowH;
  return (
    <g>
      <rect x={x-12} y={y-16} width={boxW} height={boxH} fill="#fff" stroke="#ddd" />
      {items.map((it,i)=>(
        <g key={i} transform={`translate(${x}, ${y + i*rowH})`}>
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
