import React, { useRef, useState } from "react";
import { API_BASE } from "../env.js";

export default function UploadTab(){
  const fileRef = useRef(null);
  const [job, setJob] = useState("");
  const [log, setLog] = useState("");

  async function startUpload(e){
    e.preventDefault();
    setLog("");
    setJob("");
    const f = fileRef.current?.files?.[0];
    if(!f){ setLog("Select a CSV first."); return; }
    const form = new FormData();
    form.append("file", f);
    const r = await fetch((API_BASE||"") + "/forms/upload-historical", { method: "POST", body: form });
    if(!r.ok){ setLog("HTTP " + r.status); return; }
    const { job_id } = await r.json();
    setJob(job_id);
    const es = new EventSource((API_BASE||"") + "/forms/upload-historical/stream/" + job_id);
    es.onmessage = (ev) => { setLog(ev.data); if (ev.data.includes("state=done") || ev.data.includes("state=error")) es.close(); };
    es.onerror = () => { es.close(); };
  }

  return (
    <div>
      <h2 style={{marginTop:0}}>Upload Historical CSV → engine.staging_historical</h2>
      <p className="muted">Database: <strong>air_quality_engine_research</strong></p>
      <form onSubmit={startUpload}>
        <div className="row">
          <input type="file" ref={fileRef} accept=".csv" className="input" />
          <button className="btn" type="submit">Upload</button>
        </div>
      </form>
      {job && <div className="mono" style={{marginTop:8}}>job: {job}</div>}
      {log && <pre style={{marginTop:12}}>{log}</pre>}
    </div>
  );
}
