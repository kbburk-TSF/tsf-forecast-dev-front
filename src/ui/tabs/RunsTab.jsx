import React, { useState } from "react";
import { endpoints } from "../../api";

export default function RunsTab(){
  const [forecastId, setForecastId] = useState("");
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  async function start(){
    setError("");
    try{
      const r = await endpoints.pipelineRun(forecastId);
      setRunId(r.run_id);
    }catch(e){ setError(String(e.message || e)); }
  }

  async function poll(){
    setError("");
    try{
      const s = await endpoints.pipelineStatus(runId);
      setStatus(s);
    }catch(e){ setError(String(e.message || e)); }
  }

  async function retry(ph){
    setError("");
    try{
      await endpoints.pipelineRetry(runId, ph);
      await poll();
    }catch(e){ setError(String(e.message || e)); }
  }

  return (
    <div className="split">
      <div>
        <div className="row">
          <input className="input" placeholder="forecast_id (UUID)" value={forecastId} onChange={e=>setForecastId(e.target.value)} />
          <button className="btn" onClick={start}>Start Run</button>
        </div>
        <div className="row">
          <input className="input" placeholder="run_id" value={runId} onChange={e=>setRunId(e.target.value)} />
          <button className="btn secondary" onClick={poll}>Poll Status</button>
        </div>
      </div>
      <div>
        {error && <pre>{error}</pre>}
        {status && (
          <div>
            <pre>{JSON.stringify(status.run, null, 2)}</pre>
            <pre>{JSON.stringify(status.phases, null, 2)}</pre>
            <div className="row">
              {["sr_s","sr_sq","sr_sqm","fc_ms","fc_msq","fc_msqm"].map(p => (
                <button key={p} className="btn" onClick={()=>retry(p)}>Retry {p}</button>
              ))}
            </div>
          </div>
        )}
        {!error && !status && <div className="muted">Use this tab to interact with the sequential pipeline endpoints.</div>}
      </div>
    </div>
  );
}
