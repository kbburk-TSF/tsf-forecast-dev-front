// ChartsTab.jsx
// Version: v2 (polygon band, full-width, legend, strict spec)
import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

/**
 * Spec:
 * - X axis labels every date (MM/DD/YY)
 * - Shade (low..high) as a continuous pale-green polygon across the forecast window
 * - Plot low & high as lines
 * - Plot actuals (value) across entire range
 * - Plot forecast (fv) ONLY from forecast window (not in 7‑day historical pre-roll)
 * - Shade the 7‑day historical pre-roll
 * - Legend included
 * - Full-window-width SVG
 */

function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, d.getDate()); }
function minusDays(d, n){ const t = new Date(d); t.setDate(t.getDate()-n); return t; }
function fmtMDY(d){ const mm=d.getMonth()+1, dd=d.getDate(), yy=String(d.getFullYear()).slice(-2); return `${mm}/${dd}/${yy}`; }

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
        const data = await listForecastIds({ scope:"global", model:"", series:"" });
        const norm = (Array.isArray(data) ? data : []).map(x => (
          typeof x === "string" ? { id:x, name:x } : { id:String(x.id ?? x.value ?? x), name:String(x.name ?? x.label ?? x.id ?? x) }
        ));
        setIds(norm);
        if (norm.length) setForecastId(norm[0].id);
      } catch(e) { setStatus("Could not load forecasts: " + String(e.message||e)); }
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
      } catch(e) { setStatus("Failed to scan dates: " + String(e.message||e)); }
    })();
  }, [forecastId]);

  const monthOptions = useMemo(() => {
    const uniq = Array.from(new Set(allDates.map(s => s.slice(0,7)))).sort();
    return uniq.map(m => ({ value: m+"-01", label: m }));
  }, [allDates]);

  async function load(){ 
    try {
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
        page:1, page_size: 12000
      });
      const sorted = (res.rows||[]).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
      setRows(sorted);
      setStatus("");
    } catch(e) { setStatus(String(e.message||e)); }
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
          <button className="btn" onClick={load} disabled={!forecastId || !startMonth}>Run</button>
        </div>
        <div className="muted" style={{marginLeft:12}}>{status}</div>
      </div>

      <Chart rows={rows} startMonth={startMonth} />
    </div>
  );
}

// Chart
function Chart({ rows, startMonth }){ 
  if (!rows || !rows.length) return null;

  const W = Math.max(1400, (typeof window!=="undefined" ? window.innerWidth - 32 : 1400));
  const H = 500;
  const pad = { top: 32, right: 24, bottom: 70, left: 64 };

  const dates = rows.map(r => new Date(r.date));
  const minX = new Date(Math.min(...dates));
  const maxX = new Date(Math.max(...dates));
  const vals = rows.flatMap(r => [r.value, r.low, r.high, r.fv].map(v => v==null?null:Number(v))).filter(v => v!=null && isFinite(v));
  const minY = vals.length ? Math.min(...vals) : 0;
  const maxY = vals.length ? Math.max(...vals) : 1;
  const yPad = (maxY - minY) * 0.08 || 1;
  const Y0 = minY - yPad, Y1 = maxY + yPad;

  function xScale(d){
    const t0 = minX.getTime(), t1 = maxX.getTime(), t = d.getTime();
    return pad.left + (t - t0) * (W - pad.left - pad.right) / Math.max(1, (t1 - t0));
  }
  function yScale(v){
    return pad.top + (H - pad.top - pad.bottom) * (1 - ( (v - Y0) / Math.max(1e-9, (Y1 - Y0)) ));
  }

  const start = new Date(startMonth);
  const histStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const histFrom = new Date(histStart); histFrom.setDate(histStart.getDate()-7);
  const histTo = new Date(histStart); histTo.setDate(histStart.getDate()-1);

  const ptsVal  = rows.filter(r => r.value!=null).map(r => ({ x:new Date(r.date), y:Number(r.value) }));
  const ptsLow  = rows.filter(r => r.low!=null).map(r => ({ x:new Date(r.date), y:Number(r.low) }));
  const ptsHigh = rows.filter(r => r.high!=null).map(r => ({ x:new Date(r.date), y:Number(r.high) }));
  const ptsFv   = rows.filter(r => r.fv!=null && new Date(r.date) >= histStart).map(r => ({ x:new Date(r.date), y:Number(r.fv) }));

  // Continuous polygon for band
  const band = rows.filter(r => r.low!=null && r.high!=null).map(r => ({
    x: new Date(r.date), y1: Number(r.low), y2: Number(r.high)
  }));
  const bandPtsTop = band.map(p => [xScale(p.x), yScale(p.y2)]);
  const bandPtsBot = band.map(p => [xScale(p.x), yScale(p.y1)]).reverse();
  const polyPts = bandPtsTop.concat(bandPtsBot);
  const polyStr = polyPts.map(p => p[0].toFixed(2)+","+p[1].toFixed(2)).join(" ");

  function path(points){
    if (!points.length) return "";
    return points.map((p,i) => (i?"L":"M")+xScale(p.x)+" "+yScale(p.y)).join(" ");
  }

  const uniqueDays = rows.map(r => new Date(r.date)).sort((a,b)=>a-b);

  return (
    <svg width={W} height={H} style={{display:"block", width:"100%"}}>
      {/* axes */}
      <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>

      {/* historical 7d mask */}
      <rect x={xScale(histFrom)} y={pad.top} width={Math.max(0, xScale(histTo)-xScale(histFrom))} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>

      {/* interval polygon fill (pale green) */}
      {polyPts.length>2 && <polygon points={polyStr} fill="rgba(0,180,0,0.18)" stroke="none" />}

      {/* low/high lines */}
      <path d={path(ptsLow)}  fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
      <path d={path(ptsHigh)} fill="none" stroke="#2ca02c" strokeWidth={1.8} strokeDasharray="4,2"/>

      {/* forecast (fv) suppressed in historical block */}
      <path d={path(ptsFv)} fill="none" stroke="#1f77b4" strokeWidth={2.4}/>

      {/* actuals */}
      <path d={path(ptsVal)} fill="none" stroke="#333" strokeWidth={1.6}/>

      {/* every-date x ticks */}
      {uniqueDays.map((d,i) => (
        <g key={i}>
          <line x1={xScale(d)} y1={H-pad.bottom} x2={xScale(d)} y2={H-pad.bottom+5} stroke="#aaa"/>
          <text x={xScale(d)+2} y={H-pad.bottom+20} fontSize="11" fill="#666">{fmtMDY(d)}</text>
        </g>
      ))}

      {/* legend */}
      <Legend x={pad.left+10} y={pad.top+10} />
    </svg>
  );
}

function Legend({ x, y }){ 
  const items = [
    { type:"line", color:"#333",     label:"Actual (value)", width:1.6 },
    { type:"line", color:"#1f77b4", label:"Forecast (fv)",   width:2.4 },
    { type:"line", color:"#2ca02c", label:"Low (low)",       width:1.8 },
    { type:"line", color:"#2ca02c", label:"High (high)",     width:1.8, dash:"4,2" },
    { type:"fill", color:"rgba(0,180,0,0.18)", label:"Interval (low–high)" },
    { type:"fill", color:"rgba(0,0,0,0.08)", label:"Historical mask (7d)" },
  ];
  return (
    <g>
      {items.map((it,i) => (
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
