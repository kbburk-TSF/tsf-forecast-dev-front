// src/tabs/FourChartsTab.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Fix: /views endpoints REQUIRE query/body fields (scope, model, series).
 * We use scope="global", model="", series="" exactly as backend expects.
 * All selector options (forecast_name and months) come from the FULL table only.
 */

const VIEWS_SCOPE = "global";
const VIEWS_MODEL = "";
const VIEWS_SERIES = "";

// ---------- helpers
function fmtDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toISOString().slice(0,10);
}
function startOfMonthISO(yyyyMM) {
  const [y,m] = yyyyMM.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, 1));
  return fmtDate(dt);
}
function endOfMonthISO(yyyyMM) {
  const [y,m] = yyyyMM.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0));
  return fmtDate(dt);
}
function minusDaysISO(iso, days) {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - days);
  return fmtDate(dt);
}
async function getViewsIds(scope, model, series, limit=1000) {
  const q = new URLSearchParams({ scope, model, series, limit: String(limit) });
  const res = await fetch(`/views/ids?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed /views/ids ${res.status}`);
  return res.json(); // [{id,name}]
}
async function postViewsQuery(body) {
  const res = await fetch(`/views/query`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Failed /views/query ${res.status}`);
  return res.json();
}
async function postQuery(route, body) {
  const res = await fetch(`${route}/query`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Failed ${route}/query ${res.status}`);
  return res.json();
}
function uniq(arr){ return [...new Set(arr)]; }
function toYYYYMM(iso){ return iso ? String(iso).slice(0,7) : null; }

// ---------- chart
function LineChart({ data, width=520, height=220, prerollDays=7, monthStartISO }){
  const padding = { top: 10, right: 12, bottom: 80, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const dates = React.useMemo(() => {
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
    return padding.top + innerH - ((v - (yMin - yPad)) / ((yMax + yPad) - (yMin - yPad))) * innerH;
  }
  const valuePoints = data.filter(r => r.value != null && isFinite(r.value)).map(r => [xScale(r.date), yScale(r.value)]);
  const fvPoints    = data.filter(r => r.fv    != null && isFinite(r.fv)).map(r => [xScale(r.date), yScale(r.fv   )]);

  function toPath(points){
    if (!points.length) return "";
    return "M " + points.map(p => `${p[0]},${p[1]}`).join(" L ");
  }

  const prerollStart = minusDaysISO(monthStartISO, prerollDays);
  const prerollDates = dates.filter(d => d >= prerollStart && d < monthStartISO);
  const x0 = prerollDates.length ? xScale(prerollDates[0]) : xScale(monthStartISO);
  const x1 = prerollDates.length ? xScale(prerollDates[prerollDates.length - 1]) : xScale(monthStartISO);
  const clipId = `clip-${Math.random().toString(36).slice(2)}`;

  return (
    <svg width={width} height={height} style={{border:"1px solid #e8e8ef", borderRadius:8, background:"#fff"}}>
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

      <rect x={Math.min(x0,x1)} y={padding.top} width={Math.abs(x1-x0)} height={innerH} fill="#f6f7fb" />
      <path d={toPath(valuePoints)} fill="none" stroke="#111" strokeWidth="1.5" strokeDasharray="3,4" />
      <clipPath id={clipId}>
        <rect x={xScale(monthStartISO)} y={padding.top} width={innerW} height={innerH} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={toPath(fvPoints)} fill="none" stroke="#2b7cff" strokeWidth="1.6" />
      </g>

      <line x1={padding.left} x2={padding.left+innerW} y1={padding.top+innerH} y2={padding.top+innerH} stroke="#ccc" />
      {dates.map((d) => {
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

export default function FourChartsTab(){
  const [names, setNames] = useState([]);          // from /views/ids
  const [forecastName, setForecastName] = useState("");
  const [forecastId, setForecastId] = useState(null);

  const [months, setMonths] = useState([]);        // derived from /views/query for selected id
  const [month, setMonth] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [arimaRows, setArimaRows] = useState([]);
  const [hwesRows, setHwesRows] = useState([]);
  const [sesRows, setSesRows] = useState([]);
  const [fullRows, setFullRows] = useState([]);

  // Load forecast_name options from FULL table
  useEffect(() => {
    (async () => {
      try{
        const list = await getViewsIds(VIEWS_SCOPE, VIEWS_MODEL, VIEWS_SERIES, 2000); // [{id,name}]
        setNames(list.map(x => ({id: String(x.id), name: x.name})));
      }catch(e){
        console.error(e);
        setErr(String(e.message || e));
      }
    })();
  }, []);

  // When forecastName changes, resolve id and load available months from FULL
  useEffect(() => {
    (async () => {
      setErr("");
      setForecastId(null);
      setMonths([]);
      setMonth("");

      if (!forecastName) return;
      try{
        const list = await getViewsIds(VIEWS_SCOPE, VIEWS_MODEL, VIEWS_SERIES, 2000);
        const item = list.find(x => x.name === forecastName);
        const id = item ? String(item.id) : null;
        setForecastId(id);

        if (id){
          const rows = await postViewsQuery({
            scope: VIEWS_SCOPE, model: VIEWS_MODEL, series: VIEWS_SERIES,
            forecast_id: id, page_size: 10000
          });
          const ym = uniq(rows.map(r => toYYYYMM(r.date || r.dt || r.day || r.ds)).filter(Boolean)).sort();
          setMonths(ym);
          if (ym.length) setMonth(ym[0]);
        }
      }catch(e){
        console.error(e);
        setErr(String(e.message || e));
      }
    })();
  }, [forecastName]);

  const monthStartISO = useMemo(() => month ? startOfMonthISO(month) : "", [month]);
  const dateFrom = useMemo(() => month ? minusDaysISO(monthStartISO, 7) : "", [monthStartISO]);
  const dateTo = useMemo(() => month ? endOfMonthISO(month) : "", [month]);

  async function loadAll(){
    if (!forecastId || !month) return;
    setErr("");
    setLoading(true);
    try{
      const fullBody = {
        scope: VIEWS_SCOPE, model: VIEWS_MODEL, series: VIEWS_SERIES,
        forecast_id: forecastId, date_from: dateFrom, date_to: dateTo, page_size: 10000
      };
      const shortBody = { forecast_id: forecastId, date_from: dateFrom, date_to: dateTo, page_size: 10000 };

      const [arima, hwes, ses, full] = await Promise.all([
        postQuery("/arima", shortBody),
        postQuery("/hwes",  shortBody),
        postQuery("/ses",   shortBody),
        postViewsQuery(fullBody),
      ]);

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

  return (
    <div style={{padding:"12px 8px"}}>
      {/* Selector Bar (from FULL table only) */}
      <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:12}}>
        <label style={{display:"flex", flexDirection:"column", fontSize:12}}>
          <span>Forecast Name</span>
          <select value={forecastName} onChange={e => setForecastName(e.target.value)}
            style={{padding:"8px 10px", border:"1px solid #dfe3ea", borderRadius:8, minWidth:320}}>
            <option value="">Select forecast_name</option>
            {names.map(n => (
              <option key={n.id} value={n.name}>{n.name}</option>
            ))}
          </select>
        </label>

        <label style={{display:"flex", flexDirection:"column", fontSize:12}}>
          <span>Start Month</span>
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{padding:"8px 10px", border:"1px solid #dfe3ea", borderRadius:8, minWidth:160}} disabled={!months.length}>
            <option value="">{months.length ? "Select month" : "—"}</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <button onClick={loadAll} disabled={loading || !forecastId || !month}
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
