import React, { useEffect, useState } from "react";
import { endpoints } from "../api.js";
import { API_BASE } from "../env.js";

/**
 * Clean Classical Export tab:
 * - Loads Parameter and State options
 * - POSTs to /forms/classical/run so browser downloads CSV
 */
export default function ClassicalTab(){
  const [db] = useState("air_quality_demo");
  const [params, setParams] = useState([]);
  const [param, setParam] = useState("");
  const [states, setStates] = useState([]);
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadParams(){
    setError("");
    try{
      const r = await endpoints.targets(db);
      const arr = Array.isArray(r?.targets) ? r.targets : (Array.isArray(r) ? r : []);
      setParams(arr); setParam(arr[0] || "");
    }catch(e){ setError(String(e.message||e)); setParams([]); setParam(""); }
  }
  async function loadStates(){
    if(!param){ setStates([]); setState(""); return; }
    setError("");
    try{
      const r = await endpoints.filters(db, param);
      const f = r?.filters || r || {};
      const arr = Array.isArray(f.states) ? f.states : [];
      setStates(arr); setState(arr[0] || "");
    }catch(e){ setError(String(e.message||e)); setStates([]); setState(""); }
  }

  useEffect(()=>{ loadParams(); }, []);
  useEffect(()=>{ if(param) loadStates(); }, [param]);

  function onSubmit(){ setLoading(true); }

  return (
    <div>
      <h2 style={{marginTop:0}}>Export Raw CSV</h2>
      <p className="muted" style={{marginTop:-6, marginBottom:12}}>
        The file will contain: <strong>forecast_id, forecast_name, date, value</strong>.
      </p>

      {error && <pre>{error}</pre>}

      <form method="post" action={`${API_BASE}/forms/classical/run`} onSubmit={onSubmit} className="card">
        <div className="row">
          <div style={{flex:1, minWidth:260}}>
            <label>Parameter Name</label>
            <select name="parameter" required className="input" value={param} onChange={e=>setParam(e.target.value)}>
              {params.length===0 && <option value="">(loading…)</option>}
              {params.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{flex:1, minWidth:260}}>
            <label>State Name</label>
            <select name="state" required className="input" value={state} onChange={e=>setState(e.target.value)}>
              {states.length===0 && <option value="">(loading…)</option>}
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <button className="btn" type="submit" disabled={!param || !state || loading}>
            {loading ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      </form>
    </div>
  );
}
