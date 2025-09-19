import React, { useEffect, useState } from "react";
import { API_BASE, api } from "./lib.api";

const DBS = [{ value: "air_quality_demo_data", label: "Air Quality (Demo)" }];

export default function App(){
  const [db, setDb] = useState(DBS[0].value);
  const [targets, setTargets] = useState([]);
  const [target, setTarget] = useState("");
  const [filters, setFilters] = useState({});
  const [stateName, setStateName] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [cbsa, setCbsa] = useState("");
  const [agg, setAgg] = useState("mean");
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTarget(""); setFilters({}); setStateName(""); setCounty(""); setCity(""); setCbsa(""); setErr(""); setStatus(""); setReady(false); setJobId(""); setPercent(0);
    api(`/data/${db}/targets`).then(j => setTargets(j.targets || [])).catch(e => setErr(String(e)));
  }, [db]);

  useEffect(() => {
    if (!target) { setFilters({}); setStateName(""); setCounty(""); setCity(""); setCbsa(""); setReady(false); setJobId(""); setPercent(0); return; }
    api(`/data/${db}/filters?target=${encodeURIComponent(target)}`)
      .then(j => setFilters(j.filters || {}))
      .catch(e => setErr(String(e)));
  }, [db, target]);

  const runClassical = async () => {
    setErr(""); setStatus(""); setReady(false); setJobId(""); setPercent(0);
    try {
      if (!db) throw new Error("Select a database");
      if (!target) throw new Error("Select a target variable");
      if (!stateName) throw new Error("Select a State Name");

      setStatus("Preparing… (checking data)");
      const qsProbe = new URLSearchParams({ db, target_value: target, state: stateName, agg }).toString();
      const info = await api(`/classical/probe?${qsProbe}`);
      setStatus(`Found ${info.rows} rows from ${info.start_date} to ${info.end_date}. Est. ${info.est_months} months / ${info.est_quarters} quarters.`);

      setStatus("Starting background job…");
      const qsStart = new URLSearchParams({ db, target_value: target, state: stateName, agg, forecast_type: "F" }).toString();
      const start = await api(`/classical/start?${qsStart}`, { method: "POST" });
      const id = start.job_id;
      setJobId(id);

      // Poll
      const t = setInterval(async () => {
        try {
          const s = await api(`/classical/status?job_id=${id}`);
          const pct = s.total > 0 ? Math.min(100, Math.floor((s.done / s.total) * 100)) : 0;
          setPercent(pct);
          setStatus(`${s.message} (${pct}%)`);
          if (s.state === "ready") {
            clearInterval(t);
            setReady(true);
            setStatus("Ready to download.");
          }
          if (s.state === "error") {
            clearInterval(t);
            setErr(s.message || "Job failed");
          }
        } catch (e) {
          clearInterval(t);
          setErr(String(e));
        }
      }, 1000);
    } catch (e) {
      setErr(String(e));
      setStatus("");
    }
  };

  const downloadClassical = () => {
    if (!jobId) return;
    window.location.href = `${API_BASE}/classical/download?job_id=${jobId}`;
  };

  return (
    <div style={{ padding: 20, fontFamily: "Inter, system-ui, sans-serif", color:"#e5e7eb", background:"#0b1220", minHeight:"100vh" }}>
      <h1 style={{ marginTop:0 }}>TSF Frontend <span style={{ fontSize:14, padding:"2px 8px", background:"#22c55e", color:"#001", borderRadius:999, marginLeft:8 }}>v2.0.2</span></h1>

      {(status || jobId) && (
        <div style={{ margin:"10px 0", padding:"8px 12px", background:"#111827", border:"1px solid #374151", borderRadius:10, fontSize:14 }}>
          <div>{status}</div>
          {!!jobId && (
            <div style={{ marginTop:8, width:"100%", background:"#1f2937", borderRadius:8, overflow:"hidden" }}>
              <div style={{ width:`${percent}%`, height:10, background:"#3b82f6", transition:"width .3s" }}></div>
            </div>
          )}
        </div>
      )}

      <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div style={{ background:"#0f172a", padding:16, borderRadius:12 }}>
          <h3>1) Database</h3>
          <select value={db} onChange={e=>setDb(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
            {DBS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div style={{ background:"#0f172a", padding:16, borderRadius:12 }}>
          <h3>2) Target Variable</h3>
          <select value={target} onChange={e=>setTarget(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
            <option value="">Select target…</option>
            {targets.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ fontSize:12, opacity:.8, marginTop:6 }}>Maps to DB column “Parameter Name”.</div>
        </div>

        <div style={{ background:"#0f172a", padding:16, borderRadius:12 }}>
          <h3>3) Filters</h3>
          <label>State Name</label>
          <select value={stateName} onChange={e=>setStateName(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }}>
            <option value="">Select state…</option>
            {(filters["State Name"] || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <label style={{ display:"block", marginTop:10 }}>County Name</label>
          <input list="countyOptions" value={county} onChange={e=>setCounty(e.target.value)} placeholder="(optional)" style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }} />
          <datalist id="countyOptions">{(filters["County Name"] || []).map(v => <option key={v} value={v} />)}</datalist>

          <label style={{ display:"block", marginTop:10 }}>City Name</label>
          <input list="cityOptions" value={city} onChange={e=>setCity(e.target.value)} placeholder="(optional)" style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }} />
          <datalist id="cityOptions">{(filters["City Name"] || []).map(v => <option key={v} value={v} />)}</datalist>

          <label style={{ display:"block", marginTop:10 }}>CBSA Name</label>
          <input list="cbsaOptions" value={cbsa} onChange={e=>setCbsa(e.target.value)} placeholder="(optional)" style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }} />
          <datalist id="cbsaOptions">{(filters["CBSA Name"] || []).map(v => <option key={v} value={v} />)}</datalist>
        </div>

        <div style={{ background:"#0f172a", padding:16, borderRadius:12 }}>
          <h3>4) Aggregation</h3>
          <select value={agg} onChange={e=>setAgg(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
            <option value="mean">Mean (daily)</option>
            <option value="sum">Sum (daily)</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={runClassical} style={{ padding:"10px 14px", borderRadius:10, fontWeight:700, cursor:"pointer", background:"#3b82f6", color:"#fff", border:"1px solid #1d4ed8" }}>
          Run Forecast
        </button>
        {ready && (
          <button onClick={downloadClassical} style={{ padding:"10px 14px", borderRadius:10, fontWeight:700, cursor:"pointer", background:"#f59e0b", color:"#001", border:"1px solid #b45309" }}>
            Download Classical CSV
          </button>
        )}
        <span style={{ fontSize:12, opacity:.8 }}>Backend: {API_BASE}</span>
      </div>

      {err && <div style={{ marginTop:12, color:"#ef4444" }}>Error: {err}</div>}
    </div>
  );
}
