import React, { useRef, useState } from "react";
import { API_BASE } from "../env.js";

export default function UploadTab(){
  const fileRef = useRef(null);
  const [job, setJob] = useState("");
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");

  async function startUpload(e){
    e.preventDefault();
    setLog("");
    setJob("");
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
  }

  return (
    <div>
      <h2 style={{marginTop:0}}>Upload Historical CSV → engine.staging_historical</h2>
      <form onSubmit={startUpload}>
        <div className="row">
          <input type="file" ref={fileRef} accept=".csv" className="input" />
          <button className="btn" type="submit">Upload</button>
        </div>
      </form>

      {status && (
        <div
          className="mono"
          style={{marginTop:8, padding:"6px 10px", borderRadius:6, border:"1px solid #ddd", display:"inline-block"}}
        >
          status: {status}
        </div>
      )}

      {job && <div className="mono" style={{marginTop:8}}>job: {job}</div>}
      {log && <pre style={{marginTop:12}}>{log}</pre>}
    </div>
  );
}