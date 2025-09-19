import React, { useEffect, useState } from "react";
import { API_BASE, api } from "./lib.api";


// Hardened fetch helpers: retry + dedupe + cache (session)
const __cache = new Map(); // key -> array data
const __inflight = new Map(); // key -> {promise, ts}

async function fetchWithRetry(url, { attempts = 3, timeoutMs = 5000 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const jitter = Math.floor(timeoutMs * (0.8 + Math.random()*0.4));
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), jitter);
    try{
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      return await res.json();
    }catch(e){
      lastErr = e;
      clearTimeout(t);
      if (i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, 300 + Math.random()*400));
    }
  }
  throw lastErr;
}

async function cachedJson(key, url) {
  const inflight = __inflight.get(key);
  if (inflight) return inflight.promise;
  if (__cache.has(key)) {
    const p = fetchWithRetry(url).then(json => { __cache.set(key, json); __inflight.delete(key); return json; })
                                 .catch(()=>{ __inflight.delete(key); return __cache.get(key); });
    __inflight.set(key, { promise: p, ts: Date.now() });
    return __cache.get(key);
  }
  const p = fetchWithRetry(url).then(json => { __cache.set(key, json); __inflight.delete(key); return json; })
                               .catch(err => { __inflight.delete(key); throw err; });
  __inflight.set(key, { promise: p, ts: Date.now() });
  return p;
}

// Fixed connection
const DB = "air_quality_demo_data";
const SOURCE_TABLE = "air_quality_raw";

// EXACT column names per your screenshot
const COLS = {
  target: "Parameter Name",
  state:  "State Name",
  county: "County Name",
  city:   "City Name",
  cbsa:   "CBSA Name",
};

const DBS = [{ value: DB, label: "Air Quality (Demo)" }];

function qs(params){
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && String(v).length) p.set(k, String(v));
  });
  return "?" + p.toString();
}

export default function App(){
  const [db, setDb] = useState(DBS[0].value);

  // values
  const [target, setTarget]     = useState("");
  const [stateName, setStateName] = useState("");const [agg, setAgg]           = useState("mean");

  // lists
  const [targets, setTargets]   = useState([]);
  const [states, setStates]     = useState([]);const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [ready, setReady] = useState(false);

  async function loadTargets(){
  setErr("");
  setStatus("Loading targets...");
  try{
    const url = `/data/${encodeURIComponent(db)}/targets?` + new URLSearchParams({ table: SOURCE_TABLE, target_col: COLS.target }).toString();
    const key = `targets:${db}`;
    const t = await cachedJson(key, url);
    const list = Array.isArray(t) ? t : (t?.targets ?? []);
    setTargets(list);
    setStatus(`Loaded ${list.length} targets`);
  }catch(e){
    setErr(String(e?.message || e));
    setStatus("");
    setTargets([]);
  }
}/targets` + qs({ table: SOURCE_TABLE, target_col: COLS.target
      });
      const res = await api(url);
      const list = Array.isArray(res) ? res : (res?.targets ?? []);
      setTargets(list);
      if (!list.includes(target)) setTarget("");
      setStatus(list.length ? `Loaded ${list.length} targets` : "No targets");
    }catch(e){
      setErr(String(e?.message || e));
      setStatus("");
      setTargets([]);
      setTarget("");
    }
  }

  /filters` + qs({ table: SOURCE_TABLE, target,
        target_col: COLS.target, state_col: COLS.state, county_col: COLS.county, city_col: COLS.city, cbsa_col: COLS.cbsa
      });
      const f = await api(url);
      setStates(f?.state ?? f?.states ?? []);setStatus("Filters loaded");
    }catch(e){
      setErr(String(e?.message || e));
      setStatus("");
      setStates([]);}
  }

  useEffect(() => { loadTargets(); loadStateList(); }, [db]);
  useEffect(() => { /* no-op for lists on target change */ }, [target]);

  async function runClassical(){
    setErr(""); setStatus("Starting…"); setReady(false); setJobId("");
    try {
      const payload = {
        db, table: SOURCE_TABLE, target,
        target_col: COLS.target, state_col: COLS.state, county_col: COLS.county, city_col: COLS.city, cbsa_col: COLS.cbsa,
        aggregation: agg, filters: { state: stateName }
      };
      const res = await api("/classical/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const jid = res?.job_id || res?.jobId || res?.id || "";
      setJobId(jid); setStatus(jid ? "Running…" : "Submitted");
      if (jid) {
        const poll = async () => {
          try { const s = await api(`/classical/status?job_id=${encodeURIComponent(jid)}`); if (s?.ready || s?.status === "done") { setStatus("Done"); setReady(true); return; } } catch {}
          setTimeout(poll, 1500);
        };
        poll();
      }
    } catch (e) { setErr(String(e?.message || e)); setStatus(""); }
  }

  const downloadClassical = () => { if (!jobId) return; window.location.href = `${API_BASE}/classical/download?job_id=${encodeURIComponent(jobId)}`; };

  const Select = ({label, value, onChange, options, placeholder="(Any)"} ) => (
    <div className="row" style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
      <label>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:8, borderRadius:8 }}>
        <option value="">{placeholder}</option>
        {options.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );

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
            <button onClick={()=>{loadTargets(); if (target) loadFilters();}} className="btn" style={{ padding:"8px 12px" }}>Reload</button>
          </div>

          {/* TARGET (always a dropdown) */}
          <Select label="Target" value={target} onChange={setTarget} options={targets} placeholder="Select a target…" />

          {/* FILTERS — always dropdowns */}
          <Select label="State"       value={stateName} onChange={setStateName} options={states} placeholder="(Optional)"/>

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
          <pre style={{ background:"#111827", borderRadius:8, padding:12, color:"#e5e7eb" }}>{JSON.stringify({ db, table: SOURCE_TABLE, cols: COLS, target, state: stateName, aggregation: agg }, null, 2)}</pre>
          {status && <div style={{ marginTop:8, color:"#93c5fd" }}>{status}</div>}
          {err && <div style={{ marginTop:8, color:"#ef4444" }}>{String(err)}</div>}
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
    </div>
  );
}
