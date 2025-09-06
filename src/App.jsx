import React, { useEffect, useMemo, useState } from "react";
import ForecastChart from "./components/ForecastChart";
import { API_BASE, api } from "./lib.api";

const DBS = [{ value: "demo_air_quality", label: "Air Quality (Demo)" }];

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
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // load targets when db changes
  useEffect(() => {
    setTarget(""); setFilters({}); setStateName(""); setCounty(""); setCity(""); setCbsa(""); setResult(null); setErr("");
    api(`/data/${db}/targets`).then(j => setTargets(j.targets || [])).catch(e => setErr(String(e)));
  }, [db]);

  // load filters when target changes
  useEffect(() => {
    if (!target) { setFilters({}); setStateName(""); setCounty(""); setCity(""); setCbsa(""); return; }
    api(`/data/${db}/filters?target=${encodeURIComponent(target)}`)
      .then(j => setFilters(j.filters || {}))
      .catch(e => setErr(String(e)));
  }, [db, target]);

  const runForecast = async () => {
    setErr(""); setLoading(true); setResult(null);
    try {
      if (!db) throw new Error("Select a database");
      if (!target) throw new Error("Select a target variable");
      if (!stateName) throw new Error("Select a State Name");
      const qs = new URLSearchParams({
        state: stateName,
        parameter: target,
        agg,
        h: "30",
        method: "seasonal_naive_dow"
      }).toString();
      const res = await fetch(`${API_BASE}/forecast/state_daily?${qs}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  const onDownloadTarget = () => {
    if (!target) { setErr("Select a target variable"); return; }
    const qs = new URLSearchParams({
      db,
      target_value: target,
      state: stateName || "",
      county: county || "",
      city: city || "",
      cbsa: cbsa || "",
      agg,
      forecast_type: "F"
    }).toString();
    window.location.href = `${API_BASE}/classical/export_target?${qs}`;
  };

  const onDownloadClassical = () => {
    if (!target || !stateName) { setErr("Select a target and state"); return; }
    const qs = new URLSearchParams({
      db,
      target_value: target,
      state: stateName,
      agg,
      forecast_type: "F"
    }).toString();
    window.location.href = `${API_BASE}/classical/export_classical?${qs}`;
  };

  return (
    <div style={{ padding: 20, fontFamily: "Inter, system-ui, sans-serif", color:"#e5e7eb", background:"#0b1220", minHeight:"100vh" }}>
      <h1 style={{ marginTop:0 }}>TSF Frontend <span style={{ fontSize:14, padding:"2px 8px", background:"#22c55e", color:"#001", borderRadius:999, marginLeft:8 }}>v1.4</span></h1>
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
          <input list="countyOptions" value={county} onChange={e=>setCounty(e.target.value)} placeholder="(optional)"
                 style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }} />
          <datalist id="countyOptions">
            {(filters["County Name"] || []).map(v => <option key={v} value={v} />)}
          </datalist>

          <label style={{ display:"block", marginTop:10 }}>City Name</label>
          <input list="cityOptions" value={city} onChange={e=>setCity(e.target.value)} placeholder="(optional)"
                 style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }} />
          <datalist id="cityOptions">
            {(filters["City Name"] || []).map(v => <option key={v} value={v} />)}
          </datalist>

          <label style={{ display:"block", marginTop:10 }}>CBSA Name</label>
          <input list="cbsaOptions" value={cbsa} onChange={e=>setCbsa(e.target.value)} placeholder="(optional)"
                 style={{ width:"100%", padding:8, borderRadius:8, marginTop:4 }} />
          <datalist id="cbsaOptions">
            {(filters["CBSA Name"] || []).map(v => <option key={v} value={v} />)}
          </datalist>
        </div>

        <div style={{ background:"#0f172a", padding:16, borderRadius:12 }}>
          <h3>4) Aggregation</h3>
          <select value={agg} onChange={e=>setAgg(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
            <option value="mean">Mean (daily)</option>
            <option value="sum">Sum (daily)</option>
          </select>
          <div style={{ fontSize:12, opacity:.8, marginTop:6 }}>Horizon/method fixed for now.</div>
        </div>
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={runForecast} disabled={loading} style={{ padding:"10px 14px", borderRadius:10, fontWeight:700, cursor:"pointer", background:"#3b82f6", color:"#fff", border:"1px solid #1d4ed8" }}>
          {loading ? "Running…" : "Run Forecast"}
        </button>
        <button onClick={onDownloadTarget} style={{ padding:"10px 14px", borderRadius:10, fontWeight:700, cursor:"pointer", background:"#10b981", color:"#001", border:"1px solid #0b7664" }}>
          Download Target CSV
        </button>
        <button onClick={onDownloadClassical} style={{ padding:"10px 14px", borderRadius:10, fontWeight:700, cursor:"pointer", background:"#f59e0b", color:"#001", border:"1px solid #b45309" }}>
          Download Classical CSV
        </button>
        <span style={{ fontSize:12, opacity:.8 }}>Backend: {API_BASE}</span>
      </div>

      {err && <div style={{ marginTop:12, color:"#ef4444" }}>Error: {err}</div>}

      {result && (
        <div style={{ marginTop:16 }}>
          <ForecastChart data={result} title={`${stateName || "All"} — ${target} (${agg})`} />
        </div>
      )}
    </div>
  );
}
