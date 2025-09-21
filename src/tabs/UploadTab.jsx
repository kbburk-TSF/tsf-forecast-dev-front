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

    try {
      // Begin upload
      setStatus("Uploading…");
      const form = new FormData();
      form.append("file", f);

      const r = await fetch((API_BASE||"") + "/forms/upload-historical", { method: "POST", body: form });
      if(!r.ok){ setStatus("Upload failed (HTTP " + r.status + ")"); return; }

      // *** Minimal change: immediately confirm the upload itself succeeded ***
      const { job_id } = await r.json();
      setJob(job_id);
      setStatus("Upload complete — processing…");

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
        // Keep whatever we had, but note the stream issue
        setStatus((s) => s ? s + " (stream disconnected)" : "Stream disconnected");
        es.close();
      };
    } catch (err){
      setStatus("Upload failed");
    }
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
