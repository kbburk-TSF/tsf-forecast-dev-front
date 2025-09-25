import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

/**
 * ChartsTab — full-width responsive chart for engine.tsf_vw_full
 * - Select forecast (forecast_name), start month, months to show (1–3)
 * - Queries the same backend payload as the table view
 * - Renders SVG: shaded band between low/high, fv line, actuals value line, and a vertical marker at first forecast row
 */

const COLS = ["date","value","model_name","fv_l","fv","fv_u","fv_mean_mape","fv_mean_mape_c","fv_interval_odds","fv_interval_sig","fv_variance","fv_variance_mean","low","high"];

function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, d.getDate()); }
function minusDays(d, n){ const t = new Date(d); t.setDate(t.getDate()-n); return t; }

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
      try{
        const data = await listForecastIds({ scope: "global", model: "", series: "" });
        const norm = (Array.isArray(data) ? data : []).map(x => (
          typeof x === "string" ? { id: x, name: x } : { id: String(x.id ?? x.value ?? x), name: String(x.name ?? x.label ?? x.id ?? x) }
        ));
        setIds(norm);
        if (norm.length) setForecastId(norm[0].id);
      }catch(e){
        setStatus("Could not load forecasts: " + String(e.message || e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!forecastId) return;
    (async () => {
      try{
        setStatus("Scanning dates…");
        const { rows } = await queryView({ scope:"global", model:"", series:"", forecast_id: forecastId, date_from:null, date_to:null, page:1, page_size:10000 });
        const dates = Array.from(new Set((rows||[]).map(r => r?.date).filter(Boolean))).sort();
        setAllDates(dates);
        if (dates.length){
          const d0 = new Date(dates[0]);
          setStartMonth(ymd(firstOfMonth(d0)));
        } else setStartMonth("");
        setStatus("");
      }catch(e){
        setStatus("Failed to scan dates: " + String(e.message || e));
      }
    })();
  }, [forecastId]);

  const monthOptions = useMemo(() => {
    const uniq = Array.from(new Set(allDates.map(s => s.slice(0,7)))).sort();
    return uniq.map(m => ({ value: m + "-01", label: m }));
  }, [allDates]);

  async function load(){
    try{
      if (!forecastId || !startMonth) return;
      setStatus("Loading…");
      const start = new Date(startMonth);
      const end = lastOfMonth(addMonths(start, monthsCount - 1));
      const histFrom = minusDays(firstOfMonth(start), 7);
      const { rows } = await queryView({
        scope:"global", model:"", series:"",
        forecast_id: forecastId,
        date_from: ymd(histFrom),
        date_to: ymd(end),
        page:1, page_size: 8000
      });
      setRows(rows || []);
      setStatus("");
    }catch(e){
      setStatus(String(e.message || e));
    }
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

      <Chart rows={rows} />
    </div>
  );
}

function Chart({ rows }){
  const pad = { top: 24, right: 24, bottom: 30, left: 48 };
  const W = Math.max(1200, (typeof window!=="undefined" ? window.innerWidth - 48 : 1200)); // full width
  const H = 420;

  // Build domain
  const xs = rows.map(r => new Date(r.date));
  const minX = xs.length ? new Date(Math.min(...xs)) : new Date();
  const maxX = xs.length ? new Date(Math.max(...xs)) : new Date();
  const values = rows.flatMap(r => [r.value, r.low, r.high, r.fv_l, r.fv_u, r.fv].map(v => (v==null?null:Number(v)))).filter(v => v!=null && isFinite(v));
  const minY = values.length ? Math.min(...values) : 0;
  const maxY = values.length ? Math.max(...values) : 1;
  const yPad = (maxY - minY) * 0.08 || 1;
  const Y0 = minY - yPad, Y1 = maxY + yPad;

  function xScale(d){
    const t0 = minX.getTime(), t1 = maxX.getTime();
    const t = d.getTime();
    return pad.left + (t - t0) * (W - pad.left - pad.right) / Math.max(1, (t1 - t0));
  }
  function yScale(v){
    return pad.top + (H - pad.top - pad.bottom) * (1 - ( (v - Y0) / Math.max(1e-9, (Y1 - Y0)) ));
  }

  // Paths
  function linePath(points){
    if (!points.length) return "";
    return points.map((p,i) => (i? "L":"M") + xScale(p.x) + " " + yScale(p.y)).join(" ");
  }

  const ptsFv = rows.filter(r => r.fv!=null).map(r => ({ x:new Date(r.date), y:Number(r.fv) }));
  const ptsVal = rows.filter(r => r.value!=null).map(r => ({ x:new Date(r.date), y:Number(r.value) }));

  // Intervals: shade low..high
  const bands = rows.filter(r => r.low!=null && r.high!=null).map(r => ({
    x: xScale(new Date(r.date)),
    y1: yScale(Number(r.low)),
    y2: yScale(Number(r.high))
  }));

  // Forecast start marker (first row with fv present)
  const firstForecast = rows.find(r => r.fv!=null);
  const xMarker = firstForecast ? xScale(new Date(firstForecast.date)) : null;

  // X ticks (monthly)
  const ticks = [];
  if (xs.length){
    const d = new Date(minX.getFullYear(), minX.getMonth(), 1);
    while (d <= maxX){
      ticks.push(new Date(d));
      d.setMonth(d.getMonth()+1);
    }
  }

  return (
    <svg width={W} height={H} style={{display:"block", width:"100%"}}>
      {/* axes */}
      <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="#999"/>
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="#999"/>

      {/* x ticks */}
      {ticks.map((d,i) => (
        <g key={i}>
          <line x1={xScale(d)} y1={H-pad.bottom} x2={xScale(d)} y2={H-pad.bottom+6} stroke="#999"/>
          <text x={xScale(d)+4} y={H-pad.bottom+18} fontSize="12" fill="#666">{d.toISOString().slice(0,7)}</text>
        </g>
      ))}

      {/* shaded bands for low..high */}
      {bands.map((b,i) => (
        <line key={i} x1={b.x} x2={b.x} y1={b.y1} y2={b.y2} stroke="rgba(0,0,0,0.08)" strokeWidth="4"/>
      ))}

      {/* fv line */}
      <path d={linePath(ptsFv)} fill="none" stroke="#1f77b4" strokeWidth="2.2"/>

      {/* actuals */}
      <path d={linePath(ptsVal)} fill="none" stroke="#333" strokeWidth="1.6"/>

      {/* forecast start marker */}
      {xMarker && <line x1={xMarker} x2={xMarker} y1={pad.top} y2={H-pad.bottom} stroke="#b07" strokeDasharray="4,4" />}
    </svg>
  );
}
