import React, { useState } from "react";
import { endpoints } from "../../api";

export default function ClassicalTab(){
  const [job, setJob] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  async function start(){
    setError(""); setStatus(null);
    try{
      const payload = { /* put your payload shape here if required */ };
      const r = await endpoints.classicalStart(payload);
      setJob(r);
    }catch(e){ setError(String(e.message || e)); }
  }

  async function poll(){
    setError("");
    if(!job?.job_id){ setError("No job_id"); return; }
    try{
      const s = await endpoints.classicalStatus(job.job_id);
      setStatus(s);
    }catch(e){ setError(String(e.message || e)); }
  }

  return (
    <div className="split">
      <div>
        <div className="row">
          <button className="btn" onClick={start}>Start Classical Forecast</button>
          <button className="btn secondary" onClick={poll}>Check Status</button>
          {job?.job_id && <a className="btn" href={endpoints.classicalDownload(job.job_id)}>Download CSV</a>}
        </div>
      </div>
      <div>
        {error && <pre>{error}</pre>}
        {job && <pre>{JSON.stringify(job, null, 2)}</pre>}
        {status && <pre>{JSON.stringify(status, null, 2)}</pre>}
        {!error && !status && <div className="muted">This tab hits /classical endpoints.</div>}
      </div>
    </div>
  );
}
