import React, { useEffect, useMemo, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

/**
 * ViewsTab — start-month + months-to-display
 * - Dropdown: forecast_name (value=forecast_id)
 * - Dropdown: start month (computed from available dates in the selected forecast)
 * - Dropdown: months to display (1,2,3)
 * - Loads rows for full forecast horizon within the selected window,
 *   plus 7 days of history prior to the first day of the selected month.
 * - Columns reflect MAPE view.
 * - NOTE: low/high are distinct from fv_l/fv_u.
 */

const COLS = [
  "date","value","model_name","fv_l","fv","fv_u",
  "fv_mean_mape","fv_mean_mape_c",
  "fv_interval_odds","fv_interval_sig",
  "fv_variance","fv_variance_mean",
  "low","high"
];

// Helpers
function ymd(d){ return d.toISOString().slice(0,10); }
function firstOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, d.getDate()); }
function minusDays(d, n){ const t = new Date(d); t.setDate(t.getDate()-n); return t; }

export default function ViewsTab(){
  const [ids, setIds] = useState([]);            // [{id, name}]
  const [forecastId, setForecastId] = useState("");
  const [allDates, setAllDates] = useState([]);  // ["YYYY-MM-DD"] for selected forecast (sampled)
  const [startMonth, setStartMonth] = useState(""); // "YYYY-MM-01"
  const [monthsCount, setMonthsCount] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  // Initial load of forecast list
  useEffect(() => {
    (async () => {
      try{
        setStatus("Loading forecasts…");
        const data = await listForecastIds({ scope: "global", model: "", series: "" });
        const norm = (Array.isArray(data) ? data : []).map(x => (
          typeof x === "string" ? { id: x, name: x } : { id: String(x.id ?? x.value ?? x), name: String(x.name ?? x.label ?? x.id ?? x) }
        ));
        setIds(norm);
        if (norm.length) setForecastId(norm[0].id);
        setStatus("");
      }catch(e){
        setStatus("Could not load forecasts: " + String(e.message || e));
      }
    })();
  }, []);

  // When forecast changes, fetch available dates (we use a wide page_size to avoid extra endpoint)
  useEffect(() => {
    if (!forecastId) return;
    (async () => {
      try{
        setStatus("Scanning dates…");
        const { rows } = await queryView({
          scope:"global", model:"", series:"",
          forecast_id: forecastId,
          date_from: null, date_to: null,
          page: 1, page_size: 10000
        });
        const dates = Array.from(new Set((rows||[]).map(r => r?.date).filter(Boolean))).sort();
        setAllDates(dates);
        // default start = first full month present (use first date's month)
        if (dates.length){
          const d0 = new Date(dates[0]);
          const start = firstOfMonth(d0);
          setStartMonth(ymd(start));
        } else {
          setStartMonth("");
        }
        setStatus("");
      }catch(e){
        setStatus("Failed to scan dates: " + String(e.message || e));
      }
    })();
  }, [forecastId]);

  const monthOptions = useMemo(() => {
    // derive unique YYYY-MM from available dates
    const uniq = Array.from(new Set(allDates.map(s => s.slice(0,7)))).sort();
    return uniq.map(m => ({ value: m + "-01", label: m }));
  }, [allDates]);

  async function load(){
    try{
      if (!forecastId || !startMonth) return;
      setStatus("Loading…"); setRows([]); setTotal(0);

      const start = new Date(startMonth);
      const end = lastOfMonth(addMonths(start, monthsCount - 1));
      const histFrom = minusDays(firstOfMonth(start), 7);

      const payload = {
        scope:"global", model:"", series:"",
        forecast_id: forecastId,
        date_from: ymd(histFrom),
        date_to: ymd(end),
        page: 1, page_size: 5000
      };
      const { rows, total } = await queryView(payload);
      setRows(rows || []);
      setTotal(total || (rows?.length || 0));
      setStatus("");
    }catch(e){
      setStatus(String(e.message || e));
    }
  }

  function downloadCsv(){
    if (!rows.length) return;
    const head = COLS.join(",");
    const lines = rows.map(r => COLS.map(k => (r?.[k] ?? "")).join(","));
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tsf_vw_full.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 250);
  }

  return (
    <div>
      <h2 style={{marginTop:0}}>engine.tsf_vw_full</h2>

      <div className="row" style={{alignItems:"end"}}>
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
        <div>
          <button className="btn" onClick={downloadCsv} disabled={!rows.length}>Download CSV</button>
        </div>
      </div>

      <div className="row" style={{justifyContent:"space-between"}}>
        <div className="muted">{status ? status : (rows.length ? `${rows.length} / ${total} rows` : "No data loaded yet")}</div>
      </div>

      <div style={{overflow:"auto", maxHeight:"60vh", border:"1px solid var(--border)", borderRadius:8}}>
        <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0}}>
          <thead style={{position:"sticky", top:0, background:"var(--card)", zIndex:1}}>
            <tr>
              {COLS.map(col =>
                <th key={col} style={{textAlign:"left", padding:"10px 12px", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap"}}>{col}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i}>
                {COLS.map(c => <td key={c} style={cell}>{r?.[c] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cell = { padding:"8px 12px", borderBottom:"1px solid var(--border)", fontVariantNumeric:"tabular-nums" };
