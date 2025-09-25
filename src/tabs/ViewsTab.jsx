import React, { useEffect, useState } from "react";
import { listForecastIds, queryView } from "../api.js";

/**
 * ViewsTab (minimal)
 * Mirrors backend /views form:
 * - Single source view: engine.tsf_vw_full
 * - Dropdown shows forecast_name (value = forecast_id)
 * - Two date inputs (from/to)
 * - Load -> POST /views/query with {scope:"global", model:"", series:"", forecast_id, date_from, date_to}
 * - Renders table with columns matching V12_14 MAPE view
 */

const COLS = [
  "date","value","model_name","fv_l","fv","fv_u",
  "fv_mean_mape","fv_mean_mape_c",
  "fv_interval_odds","fv_interval_sig",
  "fv_variance","fv_variance_mean",
  "low","high"
];

export default function ViewsTab(){
  const [ids, setIds] = useState([]);            // [{id, name}]
  const [forecastId, setForecastId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try{
        setStatus("Loading forecasts…");
        const data = await listForecastIds({ scope: "global", model: "", series: "" });
        // listForecastIds previously returned array or objects; normalize to [{id,name}] if necessary
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

  async function load(){
    try{
      setStatus("Loading…");
      setRows([]); setTotal(0);
      const payload = {
        scope: "global",
        model: "",
        series: "",
        forecast_id: forecastId || null,   // backend expects string
        date_from: from || null,
        date_to: to || null,
        page: 1,
        page_size: 2000
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
          <label>From</label><br/>
          <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label>To</label><br/>
          <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <div>
          <button className="btn" onClick={load} disabled={!forecastId}>Run</button>
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
