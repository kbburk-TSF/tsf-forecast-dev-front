import React, { useEffect, useMemo, useState } from "react";
import { fetchViewsMeta, listForecastIds, queryView } from "./api.js";

/* View shapes from your View Builder:
   - Per-table: <model_key>_instance_forecast_[ms|msq|msqm]_vw_daily_best
   - Per-model: <model_key>_vw_daily_best
   - Global:    engine.tsf_vw_daily_best
*/

const PRESETS = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "365d", label: "Last 365 days", days: 365 },
  { key: "all", label: "All dates", days: null }
];

export default function ViewsTab(){
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [meta, setMeta] = useState({ scopes: ["per_table","per_model","global"], models: [], series: ["S","SQ","SQM"], most_recent: {} });
  const [scope, setScope] = useState("per_table");
  const [model, setModel] = useState("");
  const [series, setSeries] = useState("SQ");
  const [forecastId, setForecastId] = useState("");
  const [ids, setIds] = useState([]);
  const [preset, setPreset] = useState("90d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page] = useState(1);
  const [pageSize] = useState(2000);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try{
        const m = await fetchViewsMeta();
        setMeta(m || {});
        setModel((m?.models?.[0]) || "");
        setSeries((m?.series?.[0]) || "SQ");
      }catch(e){
        setStatus("Meta load failed: " + String(e.message || e));
      }finally{
        setLoadingMeta(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loadingMeta) return;
    if (scope !== "global" && !model) return;
    if (scope === "per_table" && !series) return;
    (async () => {
      try{
        setStatus("");
        setIds([]);
        setForecastId("");
        const data = await listForecastIds({ scope, model: (scope==="global" ? "" : model), series: (scope==="per_table" ? series : "") });
        setIds(data || []);
        const key = `${scope}|${scope==="global"?"":model}|${scope==="per_table"?series:""}`;
        const most = (meta?.most_recent && meta.most_recent[key]) || "";
        setForecastId(most || data?.[0] || "");
      }catch(e){
        setStatus("Could not load forecast ids: " + String(e.message || e));
      }
    })();
  }, [scope, model, series, loadingMeta]);

  const dateRange = useMemo(() => {
    if (preset === "all") return { from: "", to: "" };
    if (preset === "custom") return { from: customFrom, to: customTo };
    const d = new Date();
    const to = d.toISOString().slice(0,10);
    d.setDate(d.getDate() - (PRESETS.find(p => p.key === preset)?.days || 90));
    const from = d.toISOString().slice(0,10);
    return { from, to };
  }, [preset, customFrom, customTo]);

  async function load(){
    try{
      setStatus("Loading…");
      setRows([]); setTotal(0);
      const { rows, total } = await queryView({
        scope,
        model: scope==="global" ? "" : model,
        series: scope==="per_table" ? series : "",
        forecast_id: forecastId,
        date_from: dateRange.from || null,
        date_to: dateRange.to || null,
        page: 1,
        page_size: pageSize
      });
      setRows(rows || []); setTotal(total || (rows?.length || 0));
      setStatus("");
    }catch(e){
      setStatus(String(e.message || e));
    }
  }

  function downloadCsv(){
    const cols = ["date","value","fv_l","fv","fv_u","fv_mean_mae","fv_interval_odds","fv_interval_sig","fv_variance_mean","fv_mean_mae_c","model_name","series","season","fmsr_series"];
    const head = cols.join(",");
    const lines = rows.map(r => cols.map(k => r?.[k] ?? "").join(","));
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "view_slice.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  return (
    <div>
      <h2 style={{marginTop:0}}>Views</h2>
      <div className="row">
        <label><input type="radio" name="scope" checked={scope==="per_table"} onChange={()=>setScope("per_table")} /> Per-table</label>
        <label><input type="radio" name="scope" checked={scope==="per_model"} onChange={()=>setScope("per_model")} /> Per-model</label>
        <label><input type="radio" name="scope" checked={scope==="global"} onChange={()=>setScope("global")} /> Global</label>
      </div>

      <div className="row">
        {scope!=="global" && (
          <div>
            <label>Model</label><br/>
            <select className="input" value={model} onChange={e=>setModel(e.target.value)}>
              {meta.models?.length ? meta.models.map(m => <option key={m} value={m}>{m}</option>) : <option>(none)</option>}
            </select>
          </div>
        )}
        {scope==="per_table" && (
          <div>
            <label>Series</label><br/>
            <select className="input" value={series} onChange={e=>setSeries(e.target.value)}>
              {(meta.series || ["S","SQ","SQM"]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div>
          <label>Forecast ID</label><br/>
          <select className="input" value={forecastId} onChange={e=>setForecastId(e.target.value)} disabled={!ids.length}>
            {!ids.length && <option>(none)</option>}
            {ids.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>

        <div>
          <label>Date Window</label><br/>
          <select className="input" value={preset} onChange={e=>setPreset(e.target.value)}>
            {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="custom">Custom…</option>
          </select>
        </div>

        {preset==="custom" && (
          <>
            <div>
              <label>From</label><br/>
              <input className="input" type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label>To</label><br/>
              <input className="input" type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} />
            </div>
          </>
        )}

        <div style={{alignSelf:"end"}}>
          <button className="btn" onClick={load} disabled={!forecastId}>Load</button>
        </div>
      </div>

      <div className="row" style={{justifyContent:"space-between"}}>
        <div className="muted">
          {status ? status : (rows.length ? `${rows.length} / ${total} rows` : "No data loaded yet")}
        </div>
        <div>
          <button className="btn" onClick={downloadCsv} disabled={!rows.length}>Export CSV</button>
        </div>
      </div>

      <div style={{overflow:"auto", maxHeight:"60vh", border:"1px solid var(--border)", borderRadius:8}}>
        <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0}}>
          <thead style={{position:"sticky", top:0, background:"var(--card)", zIndex:1}}>
            <tr>
              {["date","value","fv_l","fv","fv_u","fv_mean_mae","fv_interval_odds","fv_interval_sig","fv_variance_mean","fv_mean_mae_c","model_name","series","season","fmsr_series"].map(col =>
                <th key={col} style={{textAlign:"left", padding:"10px 12px", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap"}}>{col}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i}>
                <td style={cell}>{r.date ?? ""}</td>
                <td style={cell}>{r.value ?? ""}</td>
                <td style={cell}>{r.fv_l ?? ""}</td>
                <td style={cell}>{r.fv ?? ""}</td>
                <td style={cell}>{r.fv_u ?? ""}</td>
                <td style={cell}>{r.fv_mean_mae ?? ""}</td>
                <td style={cell}>{r.fv_interval_odds ?? ""}</td>
                <td style={cell}>{r.fv_interval_sig ?? ""}</td>
                <td style={cell}>{r.fv_variance_mean ?? ""}</td>
                <td style={cell}>{r.fv_mean_mae_c ?? ""}</td>
                <td style={cell}>{r.model_name ?? ""}</td>
                <td style={cell}>{r.series ?? ""}</td>
                <td style={cell}>{r.season ?? ""}</td>
                <td style={cell}>{r.fmsr_series ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cell = { padding:"8px 12px", borderBottom:"1px solid var(--border)", fontVariantNumeric:"tabular-nums" };
