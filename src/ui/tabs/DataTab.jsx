import React, { useEffect, useMemo, useState } from "react";
import { endpoints } from "../../api.js";

/**
 * DataTab — full selector set, mirroring the original:
 * - Database (environment)
 * - Target variable (maps to "Parameter Name")
 * - Filters: State, County, City, CBSA
 * - Aggregation policy
 *
 * Notes:
 * - Only requires /data/{db}/targets and /data/{db}/filters?target=... .
 * - If the backend returns extra filter lists (counties/cities/cbsas), we use them.
 * - If not, the extra filters remain free-text (optional), so the UI still works.
 */

const DBS = [
  { value: "air_quality_demo_data", label: "Air Quality (Demo)" },
  // Add more environments when ready:
  // { value: "car_crash_demo_data", label: "Car Crash (Demo)" },
  // { value: "flights_demo_data", label: "Flights (Demo)" },
  // { value: "stocks_demo_data", label: "Stocks (Demo)" },
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

  // Optional filters — list-aware if backend supplies them; otherwise free text
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
      setTargets(arr);
      setTarget(arr[0] || "");
    }catch(e){
      setError(String(e.message || e));
      setTargets([]);
      setTarget("");
    }
  }

  async function loadFilters(t){
    setError("");
    if(!t){ setStates([]); setState(""); return; }
    try{
      const r = await endpoints.filters(db, t);
      // Flexible parsing: accept either nested {filters:{...}} or flat keys
      const f = r?.filters || r || {};
      const s = f.states || [];
      const cos = f.counties || [];
      const cis = f.cities || [];
      const cs = f.cbsas || f.cbsa || [];

      setStates(Array.isArray(s) ? s : []);
      setCounties(Array.isArray(cos) ? cos : []);
      setCities(Array.isArray(cis) ? cis : []);
      setCbsas(Array.isArray(cs) ? cs : []);

      setState((Array.isArray(s) && s[0]) || "");
      setCounty((Array.isArray(cos) && cos[0]) || "");
      setCity((Array.isArray(cis) && cis[0]) || "");
      setCbsa((Array.isArray(cs) && cs[0]) || "");
    }catch(e){
      setError(String(e.message || e));
      setStates([]); setState("");
      setCounties([]); setCounty("");
      setCities([]); setCity("");
      setCbsas([]); setCbsa("");
    }
  }

  useEffect(()=>{ loadTargets(); }, [db]);
  useEffect(()=>{ if(target) loadFilters(target); }, [target]);

  // Helpers to render select or text input depending on data availability
  const SelectOrInput = ({label, list, value, onChange, placeholder}) => {
    return (
      <div className="row">
        <label style={{minWidth: 100}}>{label}</label>
        {list && list.length > 0 ? (
          <select className="input" value={value} onChange={e=>onChange(e.target.value)}>
            {list.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        ) : (
          <input className="input" placeholder={placeholder || "(optional)"} value={value} onChange={e=>onChange(e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <div className="split">
      <div>
        <div className="row">
          <label style={{minWidth: 100}}>Database</label>
          <select className="input" value={db} onChange={e=>setDb(e.target.value)}>
            {DBS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button className="btn" onClick={loadTargets}>Reload Targets</button>
        </div>

        <div className="row">
          <label style={{minWidth: 100}}>Target</label>
          <select className="input" value={target} onChange={e=>setTarget(e.target.value)}>
            {targets.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        <SelectOrInput label="State" list={states} value={state} onChange={setState} placeholder="Select state..." />
        <SelectOrInput label="County Name" list={counties} value={county} onChange={setCounty} placeholder="(optional)" />
        <SelectOrInput label="City Name" list={cities} value={city} onChange={setCity} placeholder="(optional)" />
        <SelectOrInput label="CBSA Name" list={cbsas} value={cbsa} onChange={setCbsa} placeholder="(optional)" />

        <div className="row">
          <label style={{minWidth: 100}}>Aggregation</label>
          <select className="input" value={agg} onChange={e=>setAgg(e.target.value)}>
            {AGGREGATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        {error && <pre>{error}</pre>}
        {!error && (
          <div className="card" style={{background:"#fff"}}>
            <div className="muted" style={{marginBottom:8}}>Selected:</div>
            <pre>{JSON.stringify({ db, target, state, county, city, cbsa, aggregation: agg }, null, 2)}</pre>
            <div className="muted">These values will be sent to the classical forecast tab when you start a run.</div>
          </div>
        )}
      </div>
    </div>
  );
}
