// src/tabs/FourChartsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

/**
 * FourChartsTab
 * - Selector logic is IDENTICAL to ViewsTab: uses listForecastIds + queryView (FULL table)
 * - Forecast Name dropdown -> from listForecastIds({scope:"global", model:"", series:""})
 * - Start Month dropdown   -> from queryView({forecast_id}) rows (YYYY-MM), no fabricated dates
 * - Load -> sends same forecast_id and [month-7d, month-end] to /arima, /hwes, /ses
 *          and calls queryView() with that window for the FULL chart.
 * - Charts show exact dates returned; 7-day pre-roll shaded; forecast line hidden during pre-roll.
 */

// ----- UTC-safe helpers (same style as ViewsTab)
function utcDateFromYmd(ymd){ const [y,m,d] = ymd.split("-").map(Number); return new Date(Date.UTC(y, m-1, d)); }
function ymdUTC(d){ return d.toISOString().slice(0,10); }
function firstOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function lastOfMonthUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)); }
function addDaysUTC(d, n){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()+n)); }
function minusDaysUTC(d, n){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()-n)); }

function uniq(arr){ return [...new Set(arr)]; }
function toYYYYMM(iso){ return iso ? String(iso).slice(0,7) : null; }

async function postJson(url, body){
  const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  if(!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// ----- Minimal SVG Line Chart (no libs)
function LineChart({ data, width=520, height=220, monthStartISO }){
  const padding = { top: 10, right: 12, bottom: 80, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const dates = useMemo(() => [...new Set(data.map(r => r.date))].sort(), [data]);
  const nums = data.flatMap(r => [r.value, r.fv]).filter(v => typeof v==="number" && isFinite(v));
  const yMin = nums.length ? Math.min(...nums) : 0;
  const yMax = nums.length ? Math.max(...nums) : 1;
  const yPad = (yMax - yMin) * 0.05 || 1;

  const xScale = (d) => {
    const i = dates.indexOf(d);
    return padding.left + (i/Math.max(1, dates.length-1))*innerW;
  };
  const yScale = (v) => padding.top + innerH - ((v - (yMin - yPad)) / ((yMax + yPad) - (yMin - yPad))) * innerH;

  const toPath = (pts) => pts.length ? "M " + pts.map(p => `${p[0]},${p[1]}`).join(" L ") : "";

  const valuePts = data.filter(r => r.value!=null && isFinite(r.value)).map(r => [xScale(r.date), yScale(r.value)]);
  const fvPts    = data.filter(r => r.fv   !=null && isFinite(r.fv   )).map(r => [xScale(r.date), yScale(r.fv   )]);

  const prerollStart = ymdUTC(minusDaysUTC(new Date(monthStartISO+"T00:00:00Z"), 7));
  const prerollDates = dates.filter(d => d >= prerollStart && d < monthStartISO);
  const x0 = prerollDates.length ? xScale(prerollDates[0]) : xScale(monthStartISO);
  const x1 = prerollDates.length ? xScale(prerollDates[prerollDates.length-1]) : xScale(monthStartISO);
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

      {/* Pre-roll shading */}
      <rect x={Math.min(x0,x1)} y={padding.top} width={Math.abs(x1-x0)} height={innerH} fill="#f6f7fb" />

      {/* Actuals as dotted line */}
      <path d={toPath(valuePts)} fill="none" stroke="#111" strokeWidth="1.5" strokeDasharray="3,4" />

      {/* Forecast only after monthStart */}
      <clipPath id={clipId}>
        <rect x={xScale(monthStartISO)} y={padding.top} width={innerW} height={innerH} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={toPath(fvPts)} fill="none" stroke="#2b7cff" strokeWidth="1.6" />
      </g>

      {/* X axis with rotated date labels */}
      <line x1={padding.left} x2={padding.left+innerW} y1={padding.top+innerH} y2={padding.top+innerH} stroke="#ccc" />
      {dates.map((d) => {
        const x = xScale(d);
        return (
          <g key={d}>
            <line x1={x} x2={x} y1={padding.top+innerH} y2={padding.top+innerH+4} stroke="#ccc" />
            <text x={x} y={padding.top+innerH+8} transform={`rotate(90 ${x} ${padding.top+innerH+8})`} fontSize="9" textAnchor="start">{d}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function FourChartsTab(){
  // Dropdowns from FULL table (same as ViewsTab flow)
  const [ids, setIds] = useState([]); // [{id,name}]
  const [forecastId, setForecastId] = useState("");
  const [allDates, setAllDates] = useState([]); // ["YYYY-MM-DD"]
  const [startMonth, setStartMonth] = useState(""); // "YYYY-MM-01"

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [arimaRows, setArimaRows] = useState([]);
  const [hwesRows, setHwesRows] = useState([]);
  const [sesRows, setSesRows] = useState([]);
  const [fullRows, setFullRows] = useState([]);

  // Load forecast list from FULL
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
        setErr("Failed ids for /views");
      }
    })();
  }, []);

  // When forecast changes, pull all dates from FULL and derive months list
  useEffect(() => {
    if (!forecastId) return;
    (async () => {
      try{
        const { rows } = await queryView({
          scope:"global", model:"", series:"",
          forecast_id: forecastId,
          date_from: null, date_to: null,
          page: 1, page_size: 10000
        });
        const dates = Array.from(new Set((rows||[]).map(r => r?.date).filter(Boolean))).sort();
        setAllDates(dates);
        if (dates.length){
          const d0 = utcDateFromYmd(dates[0]);
          setStartMonth( ymdUTC(firstOfMonthUTC(d0)) );
        } else {
          setStartMonth("");
        }
      }catch(e){
        setErr("Failed query for /views");
      }
    })();
  }, [forecastId]);

  const monthOptions = useMemo(() => {
    const uniqMonths = Array.from(new Set(allDates.map(s => s.slice(0,7)))).sort();
    return uniqMonths.map(m => ({ value: m + "-01", label: m }));
  }, [allDates]);

  const monthStartISO = useMemo(() => startMonth || "", [startMonth]);
  const dateFrom = useMemo(() => monthStartISO ? ymdUTC(minusDaysUTC(utcDateFromYmd(monthStartISO), 7)) : "", [monthStartISO]);
  const dateTo = useMemo(() => monthStartISO ? ymdUTC(lastOfMonthUTC(utcDateFromYmd(monthStartISO))) : "", [monthStartISO]);

  async function loadAll(){
    if (!forecastId || !monthStartISO) return;
    setErr(""); setLoading(true);
    try{
      // FULL (for bottom chart)
      const { rows: full } = await queryView({
        scope:"global", model:"", series:"",
        forecast_id: forecastId,
        date_from: dateFrom, date_to: dateTo,
        page: 1, page_size: 10000
      });

      // ARIMA / HWES / SES independent routes
      const payload = { forecast_id: forecastId, date_from: dateFrom, date_to: dateTo, page: 1, page_size: 10000 };
      const [arima, hwes, ses] = await Promise.all([
        postJson("/arima/query", payload),
        postJson("/hwes/query",  payload),
        postJson("/ses/query",   payload),
      ]);

      const norm = (rows) => (Array.isArray(rows) ? rows : (rows?.rows || [])).map(r => ({
        date: r.date || r.dt || r.ds || r.day,
        value: (typeof r.value === "number" ? r.value : (r.actual ?? r.y ?? null)),
        fv: (typeof r.fv === "number" ? r.fv : (r.forecast ?? r.yhat ?? null)),
      })).filter(x => x.date);

      setFullRows(norm(full));
      setArimaRows(norm(arima));
      setHwesRows(norm(hwes));
      setSesRows(norm(ses));
    }catch(e){
      setErr(String(e.message || e));
    }finally{
      setLoading(false);
    }
  }

  return (
    <div style={{padding:"12px 8px"}}>
      {/* Selector bar sourced from FULL table */}
      <div style={{display:"flex", gap:12, alignItems:"end", flexWrap:"wrap", marginBottom:12}}>
        <div>
          <label style={{display:"block", fontSize:12, marginBottom:4}}>Forecast (forecast_name)</label>
          <select value={forecastId} onChange={e=>setForecastId(e.target.value)}
            style={{padding:"8px 10px", border:"1px solid #dfe3ea", borderRadius:8, minWidth:320}} disabled={!ids.length}>
            {!ids.length && <option>(none)</option>}
            {ids.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{display:"block", fontSize:12, marginBottom:4}}>Start Month</label>
          <select value={startMonth} onChange={e=>setStartMonth(e.target.value)}
            style={{padding:"8px 10px", border:"1px solid #dfe3ea", borderRadius:8, minWidth:160}} disabled={!monthOptions.length}>
            {!monthOptions.length && <option>(none)</option>}
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <button onClick={loadAll} disabled={loading || !forecastId || !startMonth}
            style={{padding:"10px 14px", background:"#111", color:"#fff", border:"1px solid #111", borderRadius:8, cursor:"pointer"}}>
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        {err && <div style={{color:"#b00020", fontSize:12}}>{err}</div>}
      </div>

      {/* Charts Grid */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, alignItems:"start"}}>
        <div>
          <div style={{marginBottom:6, fontWeight:600}}>ARIMA</div>
          <LineChart data={arimaRows} monthStartISO={startMonth} />
        </div>
        <div>
          <div style={{marginBottom:6, fontWeight:600}}>HWES</div>
          <LineChart data={hwesRows} monthStartISO={startMonth} />
        </div>
        <div>
          <div style={{marginBottom:6, fontWeight:600}}>SES</div>
          <LineChart data={sesRows} monthStartISO={startMonth} />
        </div>
      </div>

      <div style={{marginTop:14}}>
        <div style={{marginBottom:6, fontWeight:600}}>Full (tsf_vw_full)</div>
        <LineChart data={fullRows} width={1580} monthStartISO={startMonth} />
      </div>
    </div>
  );
}
