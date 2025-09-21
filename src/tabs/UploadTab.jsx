import React, { useRef, useState } from "react";
import { API_BASE } from "../env.js";

export default function UploadTab(){
  const fileRef = useRef(null);
  const [job, setJob] = useState("");
  const [log, setLog] = useState("");
<<<<<<< HEAD
=======
  const [status, setStatus] = useState("");
>>>>>>> PIPELINE

  async function startUpload(e){
    e.preventDefault();
    setLog("");
    setJob("");
<<<<<<< HEAD
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
=======
    setStatus("");

    const f = fileRef.current?.files?.[0];
    if(!f){ setStatus("Select a CSV first."); return; }

    let r;
    try {
      // Begin upload
      setStatus("Uploading…");
      const form = new FormData();
      form.append("file", f);

      r = await fetch((API_BASE||"") + "/forms/upload-historical", { method: "POST", body: form });
    } catch (err){
      setStatus("Upload failed (network)");
      return;
    }

    if(!r || !r.ok){
      setStatus("Upload failed (HTTP " + (r ? r.status : "—") + ")");
      return;
    }

    // POST succeeded — confirm upload regardless of response body format
    setStatus("Upload complete — processing…");

    // Try to extract a job id from JSON or text; tolerate plain text responses
    let job_id = "";
    const ctype = (r.headers.get("content-type") || "").toLowerCase();
    try {
      if (ctype.includes("application/json")) {
        const data = await r.json();
        job_id = data?.job_id || "";
      } else {
        const txt = await r.text();
        const m = txt && txt.match(/[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}/);
        job_id = m ? m[0] : "";
      }
    } catch {
      // Keep the success status; we just might not have a job id
    }

    if(!job_id){
      // No job id to stream — we still indicate success of the upload
      setStatus("Upload complete");
      return;
    }

    setJob(job_id);

    // Stream processing logs/status
    const es = new EventSource((API_BASE||"") + "/forms/upload-historical/stream/" + job_id);
    es.onmessage = (ev) => {
      const msg = ev.data || "";
      setLog(msg);

      if (msg.includes("state=done")) {
        setStatus("Processing done");
        es.close();
      } else if (msg.includes("state=error")) {
        setStatus("Processing failed");
        es.close();
      }
    };
    es.onerror = () => {
      // Don't override a success status; just note the stream issue
      setStatus((s) => s ? s + " (stream disconnected)" : "Stream disconnected");
      es.close();
    };
>>>>>>> PIPELINE
  }

  return (
    <div>
      <h2 style={{marginTop:0}}>Upload Historical CSV → engine.staging_historical</h2>
<<<<<<< HEAD
      <p className="muted">Database: <strong>air_quality_engine_research</strong></p>
=======
>>>>>>> PIPELINE
      <form onSubmit={startUpload}>
        <div className="row">
          <input type="file" ref={fileRef} accept=".csv" className="input" />
          <button className="btn" type="submit">Upload</button>
        </div>
      </form>
<<<<<<< HEAD
=======

      {status && (
        <div
          className="mono"
          style={{marginTop:8, padding:"6px 10px", borderRadius:6, border:"1px solid #ddd", display:"inline-block"}}
        >
          status: {status}
        </div>
      )}

>>>>>>> PIPELINE
      {job && <div className="mono" style={{marginTop:8}}>job: {job}</div>}
      {log && <pre style={{marginTop:12}}>{log}</pre>}
    </div>
  );
}
