import React, { useEffect, useState } from "react";
import { API_BASE } from "../env.js";
import { loadClassicalOptions } from "../api.js";

export default function ClassicalTab(){
  const [params, setParams] = useState([]);
  const [states, setStates] = useState([]);
  const [param, setParam] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState("");

  useEffect(()=>{
    (async () => {
      try{
        setError("");
        const { params, states } = await loadClassicalOptions();
        setParams(params); setStates(states);
        setParam(params[0] || ""); setState(states[0] || "");
      }catch(e){
        setError(String(e.message||e));
      }
    })();
  }, []);

  // FIX: align with backend form handler (POST /forms/classical/run)
  const action = (API_BASE || "") + "/forms/classical/run";

  return (
    <div>
      <h2 style={{marginTop:0}}>Export Raw CSV</h2>
      <p className="muted" style={{marginTop:-6, marginBottom:12}}>
        The file will contain: <strong>forecast_id, forecast_name, date, value</strong>.
      </p>
      {error && <pre>{error}</pre>}
      <form method="post" action={action}>
        <fieldset className="row">
          <div style={{flex:1, minWidth:260}}>
            <label htmlFor="param">Parameter Name</label>
            <select id="param" name="parameter" required className="input" value={param} onChange={e=>setParam(e.target.value)}>
              {params.length===0 && <option value="">(loading…)</option>}
              {params.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{flex:1, minWidth:260}}>
            <label htmlFor="state">State Name</label>
            <select id="state" name="state" required className="input" value={state} onChange={e=>setState(e.target.value)}>
              {states.length===0 && <option value="">(loading…)</option>}
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </fieldset>
        <div className="row" style={{marginTop:12}}>
          <button className="btn" type="submit" disabled={!param || !state}>Download CSV</button>
        </div>
      </form>
    </div>
  );
}
