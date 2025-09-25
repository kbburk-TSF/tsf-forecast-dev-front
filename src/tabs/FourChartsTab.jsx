// src/tabs/FourChartsTab.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Ground rules followed:
 * - Four independent charts, each calls its own backend route set.
 * - A single selector bar (forecast_name and start month) drives all four calls.
 * - No cross-table joins or inference; each chart queries only its own route.
 * - We DO NOT fabricate dates; we render exactly what the API returns.
 * - We request a date range that starts 7 days before the selected month
 *   and ends at the end of that month, so the pre-roll is included.
 * - Pre-roll area is shaded; pre-roll shows only "value" (historical) line.
 * - Forecast line ("fv") is hidden for the pre-roll span.
 * - X-axis shows actual dates (rotated 90°); Y-axis is the numeric values.
 *
 * Assumed backend routes (already provided by user):
 *   ARIMA: GET /arima/ids, POST /arima/query
 *   HWES : GET /hwes/ids,  POST /hwes/query
 *   SES  : GET /ses/ids,   POST /ses/query
 *   FULL : GET /views/ids, POST /views/query  (tsf_vw_full)
 *
 * Each POST body includes: { forecast_id, date_from, date_to }
 */

// ---------- tiny helpers
function fmtDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  // yyyy-mm-dd
  return dt.toISOString().slice(0,10);
}
function startOfMonthISO(yyyyMM) {
  const [y,m] = yyyyMM.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, 1));
  return fmtDate(dt);
}
function endOfMonthISO(yyyyMM) {
  const [y,m] = yyyyMM.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of month
  return fmtDate(dt);
}
function minusDaysISO(iso, days) {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - days);
  return fmtDate(dt);
}
async function getIds(route) {
  const res = await fetch(`${route}/ids`);
  if (!res.ok) throw new Error(`Failed ids for ${route}`);
  return res.json();
}
async function postQuery(route, body) {
  const res = await fetch(`${route}/query`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Query failed for ${route}`);
  return res.json();
}

// ---------- minimal SVG line chart (no dependencies)
function LineChart({ data, width=520, height=220, prerollDays=7, monthStartISO }){
  // data: array of rows with {date, value, fv}
  const padding = { top: 10, right: 12, bottom: 80, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // x domain as sorted unique dates
  const dates = useMemo(() => {
    const arr = [...new Set(data.map(r => r.date))].sort();
    return arr;
  }, [data]);

  const values = data.flatMap(r => [r.value, r.fv]).filter(v => typeof v === "number" && isFinite(v));
  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const yPad = (yMax - yMin) * 0.05 || 1;

  function xScale(d){
    const i = dates.indexOf(d);
    return padding.left + (i / Math.max(1, dates.length - 1)) * innerW;
  }
  function yScale(v){
    // invert
    return padding.top + innerH - ((v - (yMin - yPad)) / ((yMax + yPad) - (yMin - yPad))) * innerH;
  }

  // paths
  const valuePoints = data.filter(r => r.value != null && isFinite(r.value)).map(r => [xScale(r.date), yScale(r.value)]);
  const fvPoints    = data.filter(r => r.fv    != null && isFinite(r.fv)).map(r => [xScale(r.date), yScale(r.fv   )]);

  function toPath(points){
    if (!points.length) return "";
    return "M " + points.map(p => `${p[0]},${p[1]}`).join(" L ");
  }

  // preroll shading: from (monthStart - 7) .. (monthStart - 1)
  const prerollStart = minusDaysISO(monthStartISO, prerollDays);
  const prerollDates = dates.filter(d => d >= prerollStart && d < monthStartISO);
  const x0 = prerollDates.length ? xScale(prerollDates[0]) : xScale(monthStartISO);
  const x1 = prerollDates.length ? xScale(prerollDates[prerollDates.length - 1]) : xScale(monthStartISO);

  // Hide forecast line during pre-roll by clipping
  // We'll draw fv path but overlay a white rectangle over pre-roll fv area.
  const clipId = `clip-${Math.random().toString(36).slice(2)}`;

  return (
    <svg width={width} height={height} style={{border:"1px solid #e8e8ef", borderRadius:8, background:"#fff"}}>
      {/* axes */}
      {/* y ticks */}
      {[0,0.25,0.5,0.75,1].map(t => {
        const y = padding.top + innerH - t*innerH;
        const val = (yMin - yPad) + t*((yMax + yPad) - (yMin - yPad));
        return (
          <g key={t}>
            <line x1={padding.left} x2={padding.left+innerW} y1={y} y2={y} stroke="#f0f0f5" />
            <text x={padding.left-6} y={y} textAnchor="end" alignmentBaseline="middle" fontSize="10">{val.toFixed(2)}</text>
          </g>
        );
      })}

      {/* pre-roll shading */}
      <rect x={Math.min(x0,x1)} y={padding.top} width={Math.abs(x1-x0)} height={innerH} fill="#f6f7fb" />

      {/* value line: dotted? The spec says: historical solid; actual values dotted.
          We'll render "value" as dotted (actuals) and that's the full dataset; */}
      <path d={toPath(valuePoints)} fill="none" stroke="#111" strokeWidth="1.5" strokeDasharray="3,4" />

      {/* forecast line after pre-roll: use clipping to hide pre-roll portion */}
      <clipPath id={clipId}>
        <rect x={xScale(monthStartISO)} y={padding.top} width={innerW} height={innerH} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={toPath(fvPoints)} fill="none" stroke="#2b7cff" strokeWidth="1.6" />
      </g>

      {/* x-axis with rotated labels */}
      <line x1={padding.left} x2={padding.left+innerW} y1={padding.top+innerH} y2={padding.top+innerH} stroke="#ccc" />
      {dates.map((d,i) => {
        const x = xScale(d);
        return (
          <g key={d}>
            <line x1={x} x2={x} y1={padding.top+innerH} y2={padding.top+innerH+4} stroke="#ccc" />
            <text x={x} y={padding.top+innerH+8} transform={`rotate(90 ${x} ${padding.top+innerH+8})`} fontSize="9" textAnchor="start">
              {d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- main tab
export default function FourChartsTab(){
  const [forecastName, setForecastName] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [arimaRows, setArimaRows] = useState([]);
  const [hwesRows, setHwesRows] = useState([]);
  const [sesRows, setSesRows] = useState([]);
  const [fullRows, setFullRows] = useState([]);

  const monthStartISO = useMemo(() => startOfMonthISO(month), [month]);
  const dateFrom = useMemo(() => minusDaysISO(monthStartISO, 7), [monthStartISO]);
  const dateTo = useMemo(() => endOfMonthISO(month), [month]);

  async function resolveIdByName(route, name){
    const list = await getIds(route); // expect [{forecast_id, forecast_name}, ...]
    const item = list.find(x => x.forecast_name === name) || list.find(x => String(x.forecast_name).toLowerCase() === String(name).toLowerCase());
    return item ? item.forecast_id : null;
  }

  async function loadAll(){
    setErr("");
    setLoading(true);
    try{
      const [arimaId, hwesId, sesId, fullId] = await Promise.all([
        resolveIdByName("/arima", forecastName),
        resolveIdByName("/hwes",  forecastName),
        resolveIdByName("/ses",   forecastName),
        resolveIdByName("/views", forecastName),
      ]);

      const bodyFor = (forecast_id) => ({ forecast_id, date_from: dateFrom, date_to: dateTo });

      const [arima, hwes, ses, full] = await Promise.all([
        arimaId ? postQuery("/arima", bodyFor(arimaId)) : Promise.resolve([]),
        hwesId  ? postQuery("/hwes",  bodyFor(hwesId )) : Promise.resolve([]),
        sesId   ? postQuery("/ses",   bodyFor(sesId  )) : Promise.resolve([]),
        fullId  ? postQuery("/views", bodyFor(fullId )) : Promise.resolve([]),
      ]);

      // Normalize to {date, value, fv}
      const mapRows = (rows) => rows.map(r => ({
        date: r.date || r.dt || r.day || r.ds,
        value: (typeof r.value === "number" ? r.value : (r.actual ?? r.y ?? null)),
        fv: (typeof r.fv === "number" ? r.fv : (r.forecast ?? r.yhat ?? null)),
      })).filter(x => x.date);

      setArimaRows(mapRows(arima));
      setHwesRows(mapRows(hwes));
      setSesRows(mapRows(ses));
      setFullRows(mapRows(full));
    }catch(e){
      console.error(e);
      setErr(String(e.message || e));
    }finally{
      setLoading(false);
    }
  }

  // Optional: automatically load when user changes inputs after initial select
  // We won't auto-load to avoid surprise calls. User clicks Load.

  return (
    <div style={{padding:"12px 8px"}}>
      {/* Selector Bar */}
      <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:12}}>
        <label style={{display:"flex", flexDirection:"column", fontSize:12}}>
          <span>Forecast Name</span>
          <input
            type="text"
            value={forecastName}
            onChange={e => setForecastName(e.target.value)}
            placeholder="Enter exact forecast_name"
            style={{padding:"8px 10px", border:"1px solid #dfe3ea", borderRadius:8, minWidth:280}}
          />
        </label>
        <label style={{display:"flex", flexDirection:"column", fontSize:12}}>
          <span>Start Month</span>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{padding:"8px 10px", border:"1px solid #dfe3ea", borderRadius:8}}
          />
        </label>
        <button onClick={loadAll} disabled={loading || !forecastName}
          style={{padding:"10px 14px", background:"#111", color:"#fff", border:"1px solid #111", borderRadius:8, cursor:"pointer"}}>
          {loading ? "Loading…" : "Load"}
        </button>
        {err && <span style={{color:"#b00020", fontSize:12}}>{err}</span>}
      </div>

      {/* Charts Grid */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, alignItems:"start"}}>
        <div>
          <div style={{marginBottom:6, fontWeight:600}}>ARIMA</div>
          <LineChart data={arimaRows} monthStartISO={monthStartISO} />
        </div>
        <div>
          <div style={{marginBottom:6, fontWeight:600}}>HWES</div>
          <LineChart data={hwesRows} monthStartISO={monthStartISO} />
        </div>
        <div>
          <div style={{marginBottom:6, fontWeight:600}}>SES</div>
          <LineChart data={sesRows} monthStartISO={monthStartISO} />
        </div>
      </div>

      <div style={{marginTop:14}}>
        <div style={{marginBottom:6, fontWeight:600}}>Full (tsf_vw_full)</div>
        <LineChart data={fullRows} width={1580} monthStartISO={monthStartISO} />
      </div>
    </div>
  );
}
