import React, { useEffect, useState } from "react";
import { API_BASE, api } from "./lib.api";

const DBS = [{ value: "demo_air_quality", label: "Air Quality (Demo)" }];

export default function App(){

  const runClassical = async () => {
    setErr(""); setStatus(""); setReady(false); setJobId(""); setPercent(0);
    try {
      if (!db) throw new Error("Select a database");
      if (!target) throw new Error("Select a target variable");
      if (!stateName) throw new Error("Select a State Name");

      setStatus("Starting background job…");
      const start = await api(`/forecast/classical/run`, { method: "POST" });
      const id = start.job_id;
      setJobId(id);

      const t = setInterval(async () => {
        try {
          const s = await api(`/forecast/status/${id}`);
          const pct = typeof s.progress === "number" ? s.progress : 0;
          setPercent(pct);
          setStatus(`${s.status}${s.error ? " – " + s.error : ""} (${pct}%)`);
          if (s.status === "completed") {
            setReady(true);
            clearInterval(t);
          }
          if (s.status === "error") {
            clearInterval(t);
            setErr(s.error || "Unknown error");
          }
        } catch (e) {
          // ignore transient polling errors
        }
      }, 1000);
    } catch (e) {
      setErr(String(e));
    }
  };

  const downloadClassical = () => {
    if (!jobId) return;
    window.location.href = `${API_BASE}/forecast/download/${jobId}`;
  };

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
