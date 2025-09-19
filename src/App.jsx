import React, { useEffect, useState } from "react";
import { API_BASE, api } from "./lib.api";

// Explicit DB / schema / table required by backend
const DB = "air_quality_demo_data";
const SCHEMA = "data";
const SOURCE_TABLE = "air_quality_raw";

const DBS = [{ value: DB, label: "Air Quality (Demo)" }];

export default function App(){
  const [db, setDb] = useState(DBS[0].value);
  const [targets, setTargets] = useState([]);
  const [target, setTarget] = useState("");
  const [stateName, setStateName] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [cbsa, setCbsa] = useState("");
  const [agg, setAgg] = useState("mean");

  const [states, setStates] = useState([]);
  const [counties, setCounties] = useState([]);
  const [cities, setCities] = useState([]);
  const [cbsas, setCbsas] = useState([]);

  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [ready, setReady] = useState(false);

  function qs(obj){
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k,v])=>{ if(v!==undefined && v!=="") p.set(k,String(v)); });
    return "?" + p.toString();
  }

  async function loadTargets() {
    setErr("");
    try {
      const url = `/data/${encodeURIComponent(db)}/targets` + qs({ schema: SCHEMA, table: SOURCE_TABLE });
      const t = await api(url);
      const list = Array.isArray(t) ? t : (t?.targets ?? []);
      setTargets(list);
      if (!list.includes(target)) setTarget("");
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  async function loadFilters() {
    setErr("");
    try {
      const url = `/data/${encodeURIComponent(db)}/filters` + qs({ schema: SCHEMA, table: SOURCE_TABLE, target });
      const f = await api(url);
      setStates(f?.state ?? f?.states ?? []);
      setCounties(f?.county ?? f?.counties ?? []);
      setCities(f?.city ?? f?.cities ?? []);
      setCbsas(f?.cbsa ?? f?.cbsas ?? []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { loadTargets(); loadFilters(); }, [db]);
  useEffect(() => { loadFilters(); }, [target]);

  async function runClassical(){
    setErr("");
    setStatus("Starting…");
    setReady(false);
    setJobId("");
    try {
      const payload = {
        db,
        schema: SCHEMA,
        table: SOURCE_TABLE,
        target,
        aggregation: agg,
        filters: { state: stateName, county, city, cbsa }
      };
      const res = await api("/classical/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const jid = res?.job_id || res?.jobId || res?.id || "";
      setJobId(jid);
      setStatus(jid ? "Running…" : "Submitted");
      if (jid) {
        const poll = async () => {
          try {
            const s = await api(`/classical/status?job_id=${encodeURIComponent(jid)}`);
            if (s?.ready || s?.status === "done") { setStatus("Done"); setReady(true); return; }
          } catch {}
          setTimeout(poll, 1500);
        };
        poll();
      }
    } catch (e) {
      setErr(String(e?.message || e));
      setStatus("");
    }
  }

  const downloadClassical = () => {
    if (!jobId) return;
    window.location.href = `${API_BASE}/classical/download?job_id=${encodeURIComponent(jobId)}`;
  };

  return (
    <div style={{ padding: 20, fontFamily: "Inter, system-ui, sans-serif", color:"#e5e7eb", background:"#0b1220", minHeight:"100vh" }}>
      <h1 style={{ marginTop:0 }}>TSF Frontend <span style={{ fontWeight:700, fontSize:12, padding:"2px 8px", background:"#93c5fd", color:"#001", borderRadius:999, marginLeft:8 }}>v2.1</span></h1>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>
        <div style={{ background:"#0f172a", border:"1px solid #374151", borderRadius:10, padding:12 }}>
          <div style={{ marginBottom:8, fontSize:12, opacity:.8 }}>Data</div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr auto", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>Database</label>
            <select value={db} onChange={e=>setDb(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
              {DBS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={()=>{loadTargets();loadFilters();}} className="btn" style={{ padding:"8px 12px" }}>Reload</button>
          </div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>Target</label>
            <select value={target} onChange={e=>setTarget(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
              <option value="">Select a target…</option>
              {targets.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>State</label>
            {states.length ? (
              <select value={stateName} onChange={e=>setStateName(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
                <option value="">(Any)</option>
                {states.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            ) : (
              <input value={stateName} onChange={e=>setStateName(e.target.value)} placeholder="Optional" style={{ width:"100%", padding:8, borderRadius:8 }} />
            )}
          </div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>County Name</label>
            {counties.length ? (
              <select value={county} onChange={e=>setCounty(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
                <option value="">(Any)</option>
                {counties.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            ) : (
              <input value={county} onChange={e=>setCounty(e.target.value)} placeholder="Optional" style={{ width:"100%", padding:8, borderRadius:8 }} />
            )}
          </div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>City Name</label>
            {cities.length ? (
              <select value={city} onChange={e=>setCity(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
                <option value="">(Any)</option>
                {cities.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            ) : (
              <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Optional" style={{ width:"100%", padding:8, borderRadius:8 }} />
            )}
          </div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>CBSA Name</label>
            {cbsas.length ? (
              <select value={cbsa} onChange={e=>setCbsa(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
                <option value="">(Any)</option>
                {cbsas.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            ) : (
              <input value={cbsa} onChange={e=>setCbsa(e.target.value)} placeholder="Optional" style={{ width:"100%", padding:8, borderRadius:8 }} />
            )}
          </div>

          <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
            <label>Aggregation</label>
            <select value={agg} onChange={e=>setAgg(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
              <option value="mean">Mean (daily)</option>
              <option value="sum">Sum (daily)</option>
              <option value="median">Median (daily)</option>
              <option value="max">Max (daily)</option>
              <option value="min">Min (daily)</option>
            </select>
          </div>
        </div>

        <div style={{ background:"#0f172a", border:"1px solid #374151", borderRadius:10, padding:12 }}>
          <div className="muted" style={{ marginBottom:8, opacity:.8 }}>Selected (v2.1)</div>
          <pre style={{ background:"#111827", borderRadius:8, padding:12, color:"#e5e7eb" }}>{JSON.stringify({ db, schema: SCHEMA, table: SOURCE_TABLE, target, state: stateName, county, city, cbsa, aggregation: agg }, null, 2)}</pre>
        </div>
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={runClassical} style={{ padding:"10px 14px", borderRadius:8, background:"#3b82f6", color:"#fff", border:"1px solid #1d4ed8" }}>
          Run Forecast
        </button>
        {ready && (
          <button onClick={downloadClassical} style={{ padding:"10px 14px", borderRadius:8, background:"#f59e0b", color:"#001", border:"1px solid #b45309" }}>
            Download Classical CSV
          </button>
        )}
        <span style={{ fontSize:12, opacity:.8 }}>Backend: {API_BASE}</span>
      </div>

      {status && <div style={{ marginTop:8, color:"#93c5fd" }}>{status}</div>}
      {err && <div style={{ marginTop:12, color:"#ef4444" }}>Error: {err}</div>}
    </div>
  );
}
