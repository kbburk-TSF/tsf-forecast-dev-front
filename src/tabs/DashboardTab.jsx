// src/tabs/DashboardTab.jsx
// Clean rebuild (2025-09-27):
// - Uses <ChartSection> to avoid mismatched divs and add explicit side padding.
// - Three charts: Classical (top), TSF Gold Line (middle), TSF Gold + Green Zone (bottom).
// - Historical actuals drawn on ALL charts (solid pre-preroll, dashed post-preroll).
// - Bottom legend excludes 'High'/'Low' items (interval only).
// - Shared Y axis domain across all charts.
// - Shorter chart height for single-page fit.

import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { listForecastIds, queryView } from "../api.js";

// ==== helpers ====
const MS_DAY = 86400000;
function parseYMD(s){ return new Date(s + "T00:00:00Z"); }
function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function lastOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)); }
function addMonthsUTC(d, n){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+n, d.getUTCDate())); }
function fmtMDY(s){ const d=parseYMD(s); const mm=d.getUTCMonth()+1, dd=d.getUTCDate(), yy=String(d.getUTCFullYear()).slice(-2); return `${mm}/${dd}/${yy}`; }
function daysBetweenUTC(a,b){ const out=[]; let t=a.getTime(); while (t<=b.getTime()+1e-3){ out.push(ymd(new Date(t))); t+=MS_DAY; } return out; }

// Hook: measure container width (and re-render on resize)
function useContainerWidth(){
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(entries => {
      for (const e of entries){
        const box = e.contentBoxSize ? (Array.isArray(e.contentBoxSize) ? e.contentBoxSize[0] : e.contentBoxSize) : null;
        const width = box ? box.inlineSize : el.clientWidth || 0;
        setW(width);
      }
    });
    ro.observe(el);
    setW(el.clientWidth || 0);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Shared chart math
function useChartMath(rows){
  const [wrapRef, W] = useContainerWidth();
  const H = Math.max(220, Math.min(340, Math.round(W * 0.22))); // shorter responsive height
  const pad = { top: 28, right: 24, bottom: 72, left: 70 };
  const N = (rows||[]).length;
  const startIdx = 7; // preroll days

  const innerW = Math.max(1, W - pad.left - pad.right);
  const innerH = Math.max(1, H - pad.top - pad.bottom);

  const xScale = (i) => pad.left + (i) * (innerW) / Math.max(1, (N-1));
  function niceTicks(min, max, count=6){
    if (!isFinite(min) || !isFinite(max) || min===max) return [min||0, max||1];
    const span = max - min; const step = Math.pow(10, Math.floor(Math.log10(span / count)));
    const err = (count * step) / span; let m = 1;
    if (err <= 0.15) m = 10; else if (err <= 0.35) m = 5; else if (err <= 0.75) m = 2;
    const s = m * step, nmin = Math.floor(min/s)*s, nmax = Math.ceil(max/s)*s;
    const out = []; for (let v=nmin; v<=nmax+1e-9; v+=s) out.push(v); return out;
  }
  return { wrapRef, W, H, pad, xScale, innerW, innerH, startIdx, niceTicks };
}

// Legend component — boxed, centered, horizontal
function InlineLegend({ items }){
  if (!items || !items.length) return null;
  return (
    <div style={{display:"flex", justifyContent:"center", marginTop:12}}>
      <div style={{
        display:"inline-flex",
        flexWrap:"wrap",
        gap:"16px",
        alignItems:"center",
        padding:"12px 16px",
        border:"2pt solid #333",
        borderRadius:8,
        background:"#fff"
      }}>
        {items.map((it,idx)=>{
          if (it.type === "line"){
            return (
              <div key={idx} style={{display:"flex", alignItems:"center", gap:8}}>
                <svg width={46} height={12}><line x1={4} y1={6} x2={42} y2={6} stroke={it.stroke} strokeWidth={it.width} strokeDasharray={it.dash||null}/></svg>
                <span style={{fontSize:12}}>{it.label}</span>
              </div>
            );
          } else {
            return (
              <div key={idx} style={{display:"flex", alignItems:"center", gap:8}}>
                <svg width={46} height={12}><rect x={4} y={1} width={38} height={10} fill={it.fill} stroke={it.stroke||"#2ca02c"}/></svg>
                <span style={{fontSize:12}}>{it.label}</span>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

// ==== Multi-series classical chart ====
function MultiClassicalChart({ rows, yDomain }){
  if (!rows || !rows.length) return null;
  const { wrapRef, W, H, pad, xScale, innerW, innerH, startIdx, niceTicks } = useChartMath(rows);

  let Y0, Y1;
  if (yDomain && Number.isFinite(yDomain[0]) && Number.isFinite(yDomain[1])){
    [Y0, Y1] = yDomain;
  } else {
    const yVals = rows.flatMap(r => [r.value, r.ARIMA_M, r.SES_M, r.HWES_M]).filter(v => v!=null).map(Number);
    const yMin = yVals.length ? Math.min(...yVals) : 0;
    const yMax = yVals.length ? Math.max(...yVals) : 1;
    const yPad = (yMax - yMin) * 0.08 || 1;
    Y0 = yMin - yPad; Y1 = yMax + yPad;
  }
  const yScale = v => pad.top + innerH * (1 - ((v - Y0) / Math.max(1e-9, (Y1 - Y0))));
  const path = pts => pts.length ? pts.map((p,i)=>(i?"L":"M")+xScale(p.i)+" "+yScale(p.y)).join(" ") : "";

  const histActualPts = rows.map((r,i) => (r.value!=null && i < startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const futActualPts  = rows.map((r,i) => (r.value!=null && i >= startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const makePts = (field) => rows.map((r,i) => (r[field]!=null && i >= startIdx) ? { i, y:Number(r[field]) } : null).filter(Boolean);
  const arimaPts = makePts("ARIMA_M");
  const sesPts   = makePts("SES_M");
  const hwesPts  = makePts("HWES_M");

  const yTicks = niceTicks(Y0, Y1, 6);

  const C_ARIMA = "#d62728";
  const C_SES   = "#1f77b4";
  const C_HWES  = "#9467bd";

  const legendItems = [
    { label: "Historical Values", type: "line", stroke:"#000", dash:null, width:1.8 },
    { label: "Actuals (for comparison)", type: "line", stroke:"#000", dash:"4,6", width:2.4 },
    { label: "ARIMA_M", type: "line", stroke:C_ARIMA, dash:null, width:2.4 },
    { label: "SES_M",   type: "line", stroke:C_SES,   dash:null, width:2.4 },
    { label: "HWES_M",  type: "line", stroke:C_HWES,  dash:null, width:2.4 },
  ];

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={W} height={H} style={{ display:"block", width:"100%" }}>
        <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={pad.left-5} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="#eee"/>
            <text x={pad.left-10} y={yScale(v)+4} fontSize="11" fill="#666" textAnchor="end">{v}</text>
          </g>
        ))}
        <rect x={xScale(0)} y={pad.top} width={Math.max(0, xScale(7)-xScale(0))} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>
        <path d={path(histActualPts)} fill="none" stroke="#000" strokeWidth={1.8}/>
        <path d={path(futActualPts)}  fill="none" stroke="#000" strokeWidth={2.4} strokeDasharray="4,6"/>
        <path d={path(arimaPts)}      fill="none" stroke={C_ARIMA} strokeWidth={2.4}/>
        <path d={path(sesPts)}        fill="none" stroke={C_SES}   strokeWidth={2.4}/>
        <path d={path(hwesPts)}       fill="none" stroke={C_HWES}  strokeWidth={2.4}/>
        {rows.map((r,i)=>(
          <g key={i} transform={`translate(${xScale(i)}, ${H-pad.bottom})`}>
            <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa"/>
            <text x={10} y={0} fontSize="11" fill="#666" transform="rotate(90 10 0)" textAnchor="start">{fmtMDY(r.date)}</text>
          </g>
        ))}
      </svg>
      <InlineLegend items={legendItems} />
    </div>
  );
}

// ==== GOLD ONLY: historical actuals + gold TSF line ====
function GoldChart({ rows, yDomain }){
  if (!rows || !rows.length) return null;
  const { wrapRef, W, H, pad, xScale, innerW, innerH, startIdx, niceTicks } = useChartMath(rows);

  let Y0, Y1;
  if (yDomain && Number.isFinite(yDomain[0]) && Number.isFinite(yDomain[1])){
    [Y0, Y1] = yDomain;
  } else {
    const yVals = rows.flatMap(r => [r.value, r.fv]).filter(v => v!=null).map(Number);
    const yMin = yVals.length ? Math.min(...yVals) : 0;
    const yMax = yVals.length ? Math.max(...yVals) : 1;
    const yPad = (yMax - yMin) * 0.08 || 1;
    Y0 = yMin - yPad; Y1 = yMax + yPad;
  }
  const yScale = v => pad.top + innerH * (1 - ((v - Y0) / Math.max(1e-9, (Y1 - Y0))));
  const path = pts => pts.length ? pts.map((p,i)=>(i?"L":"M")+xScale(p.i)+" "+yScale(p.y)).join(" ") : "";

  const histActualPts = rows.map((r,i) => (r.value!=null && i < startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const futActualPts  = rows.map((r,i) => (r.value!=null && i >= startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const fvPts         = rows.map((r,i) => (r.fv!=null    && i >= startIdx) ? { i, y:Number(r.fv) }    : null).filter(Boolean);
  const yTicks = niceTicks(Y0, Y1, 6);
  const fvColor = "#FFD700";

  const legendItems = [
    { label: "Historical Values", type: "line", stroke:"#000", dash:null, width:1.8 },
    { label: "Actuals (for comparison)", type: "line", stroke:"#000", dash:"4,6", width:2.4 },
    { label: "Targeted Seasonal Forecast", type: "line", stroke:fvColor, dash:null, width:2.4 },
  ];

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={W} height={H} style={{ display:"block", width:"100%" }}>
        <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={pad.left-5} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="#eee"/>
            <text x={pad.left-10} y={yScale(v)+4} fontSize="11" fill="#666" textAnchor="end">{v}</text>
          </g>
        ))}
        <rect x={xScale(0)} y={pad.top} width={Math.max(0, xScale(7)-xScale(0))} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>
        <path d={path(histActualPts)} fill="none" stroke="#000" strokeWidth={1.8}/>
        <path d={path(futActualPts)}  fill="none" stroke="#000" strokeWidth={2.4} strokeDasharray="4,6"/>
        <path d={path(fvPts)}         fill="none" stroke={fvColor} strokeWidth={2.4}/>
        {rows.map((r,i)=>(
          <g key={i} transform={`translate(${xScale(i)}, ${H-pad.bottom})`}>
            <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa"/>
            <text x={10} y={0} fontSize="11" fill="#666" transform="rotate(90 10 0)" textAnchor="start">{fmtMDY(r.date)}</text>
          </g>
        ))}
      </svg>
      <InlineLegend items={legendItems} />
    </div>
  );
}

// ==== GOLD + GREEN ZONE: historical actuals + gold TSF + low/high + polygon ====
function GoldAndGreenZoneChart({ rows, yDomain }){
  if (!rows || !rows.length) return null;
  const { wrapRef, W, H, pad, xScale, innerW, innerH, startIdx, niceTicks } = useChartMath(rows);

  let Y0, Y1;
  if (yDomain && Number.isFinite(yDomain[0]) && Number.isFinite(yDomain[1])){
    [Y0, Y1] = yDomain;
  } else {
    const yVals = rows.flatMap(r => [r.value, r.low, r.high, r.fv]).filter(v => v!=null).map(Number);
    const yMin = yVals.length ? Math.min(...yVals) : 0;
    const yMax = yVals.length ? Math.max(...yVals) : 1;
    const yPad = (yMax - yMin) * 0.08 || 1;
    Y0 = yMin - yPad; Y1 = yMax + yPad;
  }
  const yScale = v => pad.top + innerH * (1 - ((v - Y0) / Math.max(1e-9, (Y1 - Y0))));
  const path = pts => pts.length ? pts.map((p,i)=>(i?"L":"M")+xScale(p.i)+" "+yScale(p.y)).join(" ") : "";

  const histActualPts = rows.map((r,i) => (r.value!=null && i < startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const futActualPts  = rows.map((r,i) => (r.value!=null && i >= startIdx) ? { i, y:Number(r.value) } : null).filter(Boolean);
  const fvPts         = rows.map((r,i) => (r.fv!=null    && i >= startIdx) ? { i, y:Number(r.fv) }    : null).filter(Boolean);
  const lowPts        = rows.map((r,i) => (r.low!=null   && i >= startIdx) ? { i, y:Number(r.low) }   : null).filter(Boolean);
  const highPts       = rows.map((r,i) => (r.high!=null  && i >= startIdx) ? { i, y:Number(r.high) }  : null).filter(Boolean);

  const bandTop = rows.map((r,i) => (r.low!=null && r.high!=null && i >= startIdx) ? [xScale(i), yScale(Number(r.high))] : null).filter(Boolean);
  const bandBot = rows.map((r,i) => (r.low!=null && r.high!=null && i >= startIdx) ? [xScale(i), yScale(Number(r.low))]  : null).filter(Boolean).reverse();
  const polyStr = [...bandTop, ...bandBot].map(([x,y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const yTicks = niceTicks(Y0, Y1, 6);

  const intervalFill = "rgba(144,238,144,0.22)";
  const fvColor = "#FFD700";

  const legendItems = [
    { label: "Historical Values", type: "line", stroke:"#000", dash:null, width:1.8 },
    { label: "Actuals (for comparison)", type: "line", stroke:"#000", dash:"4,6", width:2.4 },
    { label: "Targeted Seasonal Forecast", type: "line", stroke:fvColor, dash:null, width:2.4 },
    { label: "Green Zone Forecast Interval", type: "box", fill:intervalFill, stroke:"#2ca02c" },
  ];

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={W} height={H} style={{ display:"block", width:"100%" }}>
        <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={pad.left-5} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="#eee"/>
            <text x={pad.left-10} y={yScale(v)+4} fontSize="11" fill="#666" textAnchor="end">{v}</text>
          </g>
        ))}
        <rect x={xScale(0)} y={pad.top} width={Math.max(0, xScale(7)-xScale(0))} height={H-pad.top-pad.bottom} fill="rgba(0,0,0,0.08)"/>
        {polyStr && <polygon points={polyStr} fill={intervalFill} stroke="none" />}
        <path d={path(histActualPts)} fill="none" stroke="#000" strokeWidth={1.8}/>
        <path d={path(futActualPts)}  fill="none" stroke="#000" strokeWidth={2.4} strokeDasharray="4,6"/>
        <path d={path(fvPts)}         fill="none" stroke={fvColor} strokeWidth={2.4}/>
        <path d={path(lowPts)}        fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
        <path d={path(highPts)}       fill="none" stroke="#2ca02c" strokeWidth={1.8}/>
        {rows.map((r,i)=>(
          <g key={i} transform={`translate(${xScale(i)}, ${H-pad.bottom})`}>
            <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa"/>
            <text x={10} y={0} fontSize="11" fill="#666" transform="rotate(90 10 0)" textAnchor="start">{fmtMDY(r.date)}</text>
          </g>
        ))}
      </svg>
      <InlineLegend items={legendItems} />
    </div>
  );
}

// Section wrapper with explicit side padding
function ChartSection({ title, children, mt=16 }){
  return (
    <section style={{ marginTop: mt, paddingLeft: 32, paddingRight: 32 }}>
      <h2 style={{margin:"6px 0 10px"}}>{title}</h2>
      {children}
    </section>
  );
}

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
        forecast_id: String(forecastId),
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
        return {
          date: d,
          value: r.value ?? null,
          fv: r.fv ?? null,
          low: r.low ?? null,
          high: r.high ?? null,
          ARIMA_M: r.ARIMA_M ?? null,
          HWES_M:  r.HWES_M  ?? null,
          SES_M:   r.SES_M   ?? null
        };
      });
      setRows(strict);
      setStatus("");
    } catch(e){ setStatus(String(e.message||e)); }
  }

  const sharedYDomain = useMemo(()=>{
    if (!rows || !rows.length) return null;
    const vals = rows.flatMap(r => [r.value, r.low, r.high, r.fv]).filter(v => v!=null).map(Number);
    if (!vals.length) return null;
    const minv = Math.min(...vals), maxv = Math.max(...vals);
    const pad = (maxv - minv) * 0.08 || 1;
    return [minv - pad, maxv + pad];
  }, [rows]);

  return (
    <div style={{width:"100%"}}>
      <h2 style={{marginTop:0}}>Dashboard — Classical + Targeted Seasonal</h2>

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

      <ChartSection title="Classical Forecasts (ARIMA, SES, HWES)" mt={16}>
        <MultiClassicalChart rows={rows} yDomain={sharedYDomain} />
      </ChartSection>

      <ChartSection title="Targeted Seasonal Forecast (Gold Line)" mt={24}>
        <GoldChart rows={rows} yDomain={sharedYDomain} />
      </ChartSection>

      <ChartSection title="Targeted Seasonal Forecast (Gold Line & Green Zone)" mt={24}>
        <GoldAndGreenZoneChart rows={rows} yDomain={sharedYDomain} />
      </ChartSection>
    </div>
  );
}
