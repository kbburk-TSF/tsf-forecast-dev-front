import React, { useEffect, useState } from "react";
import { endpoints } from "../../api.js";

const DBS = [
  { value: "air_quality_demo_data", label: "Air Quality (Demo)" },
];

const AGGREGATIONS = [
  { value: "mean_daily", label: "Mean (daily)" },
  { value: "sum_daily", label: "Sum (daily)" },
  { value: "median_daily", label: "Median (daily)" },
  { value: "max_daily", label: "Max (daily)" },
  { value: "min_daily", label: "Min (daily)" },
];

export default function DataTab(){
  const [db, setDb] = useState(DBS[0].value);
  const [targets, setTargets] = useState([]);
  const [target, setTarget] = useState("");
  const [states, setStates] = useState([]);
  const [state, setState] = useState("");
  const [counties, setCounties] = useState([]);
  const [county, setCounty] = useState("");
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("");
  const [cbsas, setCbsas] = useState([]);
  const [cbsa, setCbsa] = useState("");
  const [agg, setAgg] = useState(AGGREGATIONS[0].value);
  const [error, setError] = useState("");

  async function loadTargets(){
    setError("");
    try{
      const r = await endpoints.targets(db);
      const arr = Array.isArray(r?.targets) ? r.targets : (Array.isArray(r) ? r : []);
      setTargets(arr); setTarget(arr[0] || "");
    }catch(e){ setError(String(e.message||e)); setTargets([]); setTarget(""); }
  }
  async function loadFilters(){
    setError("");
    try{
      if(!target) return;
      const r = await endpoints.filters(db, target);
      const f = r?.filters || r || {};
      setStates(Array.isArray(f.states)?f.states:[]);
      setCounties(Array.isArray(f.counties)?f.counties:[]);
      setCities(Array.isArray(f.cities)?f.cities:[]);
      setCbsas(Array.isArray(f.cbsas||f.cbsa)?(f.cbsas||f.cbsa):[]);
      setState((f.states&&f.states[0])||"");
      setCounty((f.counties&&f.counties[0])||"");
      setCity((f.cities&&f.cities[0])||"");
      setCbsa(((f.cbsas||f.cbsa)||[])[0]||"");
    }catch(e){ setError(String(e.message||e)); }
  }

  useEffect(()=>{ loadTargets(); }, [db]);
  useEffect(()=>{ if(target) loadFilters(); }, [target]);

  const SelectOrInput = ({label, list, value, onChange, placeholder}) => (
    <div className="row">
      <label style={{minWidth: 140}}>{label}</label>
      {list && list.length>0 ? (
        <select className="input" value={value} onChange={e=>onChange(e.target.value)}>
          {list.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      ) : (
        <input className="input" placeholder={placeholder||"(optional)"} value={value} onChange={e=>onChange(e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="split">
      <div>
        <div className="row">
          <label style={{minWidth:140}}>Database</label>
          <select className="input" value={db} onChange={e=>setDb(e.target.value)}>
            {DBS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button className="btn" onClick={loadTargets}>Reload Targets</button>
        </div>
        <div className="row">
          <label style={{minWidth:140}}>Target</label>
          <select className="input" value={target} onChange={e=>setTarget(e.target.value)}>
            {targets.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <SelectOrInput label="State" list={states} value={state} onChange={setState} placeholder="Select state..." />
        <SelectOrInput label="County Name" list={counties} value={county} onChange={setCounty} placeholder="(optional)" />
        <SelectOrInput label="City Name" list={cities} value={city} onChange={setCity} placeholder="(optional)" />
        <SelectOrInput label="CBSA Name" list={cbsas} value={cbsa} onChange={setCbsa} placeholder="(optional)" />
        <div className="row">
          <label style={{minWidth:140}}>Aggregation</label>
          <select className="input" value={agg} onChange={e=>setAgg(e.target.value)}>
            {AGGREGATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        {error && <pre>{error}</pre>}
        {!error && <div className="card" style={{background:"#fff"}}>
          <div className="muted" style={{marginBottom:8}}>Selected (v2.1):</div>
          <pre>{JSON.stringify({ db, target, state, county, city, cbsa, aggregation: agg }, null, 2)}</pre>
        </div>}
      </div>
    </div>
  );
}