import React, { useState } from "react";
import { endpoints } from "../../api.js";

export default function ClassicalTab(){
  const [job, setJob] = useState(null);
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");

  async function start(){
    setErr(""); setStatus(null);
    try { const r = await endpoints.classicalStart({}); setJob(r); }
    catch(e){ setErr(String(e.message || e)); }
  }
  async function poll(){
    setErr("");
    try { if(!job?.job_id) throw new Error("No job_id"); const s = await endpoints.classicalStatus(job.job_id); setStatus(s); }
    catch(e){ setErr(String(e.message || e)); }
  }

  return (
    <div className="split">
      <div className="row">
        <button className="btn" onClick={start}>Start Classical Forecast</button>
        <button className="btn secondary" onClick={poll}>Check Status</button>
        {job?.job_id && <a className="btn" href={endpoints.classicalDownloadUrl(job.job_id)}>Download CSV</a>}
      </div>
      <div>
        {err && <pre>{err}</pre>}
        {job && <pre>{JSON.stringify(job, null, 2)}</pre>}
        {status && <pre>{JSON.stringify(status, null, 2)}</pre>}
      </div>
    </div>
  );
}