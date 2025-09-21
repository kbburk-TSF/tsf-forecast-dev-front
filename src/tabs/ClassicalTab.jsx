import React, { useState } from "react";
import { API_BASE } from "../env.js";

/**
 * Simple Classical Export tab:
 * - No prefetch (avoids 404s from unknown endpoints)
 * - User enters Parameter and State manually
 * - Form POSTs to /forms/classical/run (backend handles validation)
 */
export default function ClassicalTab(){
  const [param, setParam] = useState("");
  const [state, setState] = useState("");
  const disabled = !param || !state;
  function onSubmit(){ /* let browser handle the download */ }
  const action = (API_BASE || "") + "/forms/classical/run";
  return (
    <div>
      <h2 style={{marginTop:0}}>Export Raw CSV</h2>
      <p className="muted" style={{marginTop:-6, marginBottom:12}}>
        The file will contain: <strong>forecast_id, forecast_name, date, value</strong>.
      </p>
      <form method="post" action={action} onSubmit={onSubmit}>
        <div className="row">
          <div style={{flex:1, minWidth:260}}>
            <label>Parameter Name</label>
            <input className="input" name="parameter" value={param} onChange={e=>setParam(e.target.value)} required placeholder="e.g., SO2" />
          </div>
          <div style={{flex:1, minWidth:260}}>
            <label>State Name</label>
            <input className="input" name="state" value={state} onChange={e=>setState(e.target.value)} required placeholder="e.g., Texas" />
          </div>
        </div>
        <div className="row" style={{marginTop:12}}>
          <button className="btn" type="submit" disabled={disabled}>Download CSV</button>
        </div>
      </form>
    </div>
  );
}
