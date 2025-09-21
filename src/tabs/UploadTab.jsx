import React, { useRef, useState } from "react";
import { API_BASE } from "../env.js";

export default function UploadTab(){
  const fileRef = useRef(null);
  const [log, setLog] = useState("");

  async function startUpload(e){
    e.preventDefault();
    setLog("");
    const f = fileRef.current?.files?.[0];
    if(!f){ setLog("Select a CSV first."); return; }

    try{
      const form = new FormData();
      form.append("file", f);

      const resp = await fetch((API_BASE||"") + "/forms/upload-historical", {
        method: "POST",
        body: form
      });

      const text = await resp.text();
      if (!resp.ok){
        setLog(`HTTP ${resp.status}\n${text || "upload failed"}`);
        return;
      }
      // Backend returns plain-text status lines (not JSON). Show it as-is.
      setLog(text || "ok");
    }catch(err){
      setLog("Upload error: " + (err?.message || String(err)));
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
      {log && <pre style={{marginTop:12}}>{log}</pre>}
    </div>
  );
}
