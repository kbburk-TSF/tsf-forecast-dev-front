import React, { useEffect, useState } from "react";
import { endpoints } from "../../api.js";

const DBS = [
  { value: "air_quality_demo_data", label: "Air Quality (Demo)" },
];

export default function DataTab(){
  const [db, setDb] = useState(DBS[0].value);
  const [targets, setTargets] = useState([]);
  const [target, setTarget] = useState("");
  const [states, setStates] = useState([]);
  const [state, setState] = useState("");
  const [err, setErr] = useState("");

  async function loadTargets(){
    setErr("");
    try{
      const r = await endpoints.targets(db);
      const arr = Array.isArray(r?.targets) ? r.targets : (Array.isArray(r) ? r : []);
      setTargets(arr);
      setTarget(arr[0] || "");
    }catch(e){ setErr(String(e.message || e)); }
  }
  async function loadStates(){
    setErr("");
    try{
      if(!target) return;
      const r = await endpoints.filters(db, target);
      const arr = r?.filters?.states || r?.states || [];
      setStates(arr);
      setState(arr[0] || "");
    }catch(e){ setErr(String(e.message || e)); }
  }

  useEffect(()=>{ loadTargets(); }, [db]);
  useEffect(()=>{ loadStates(); }, [target]);

  return (
    <div className="split">
      <div>
        <div className="row">
          <label>Database</label>
          <select className="input" value={db} onChange={e=>setDb(e.target.value)}>
            {DBS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button className="btn" onClick={loadTargets}>Reload Targets</button>
        </div>
        <div className="row">
          <label>Target</label>
          <select className="input" value={target} onChange={e=>setTarget(e.target.value)}>
            {targets.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="row">
          <label>State</label>
          <select className="input" value={state} onChange={e=>setState(e.target.value)}>
            {states.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <div>
        {err && <pre>{err}</pre>}
        {!err && <div className="muted">Targets/states pulled from /data endpoints.</div>}
      </div>
    </div>
  );
}