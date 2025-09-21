import React, { useState } from "react";

export default function UploadTab({ apiBase, targetFQN = "engine.staging_historical" }) {
  const [file, setFile] = useState(null);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("idle");

  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setLog("");
    setStatus("idle");
  };

  async function handleUpload() {
    if (!file) {
      setLog("Choose a CSV first.");
      return;
    }
    setStatus("uploading");
    setLog("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = `${apiBase}/forms/upload-historical`;

      const resp = await fetch(url, { method: "POST", body: fd });
      // Backend returns text like: state=ok inserted=... OR JSON on some routes.
      const bodyText = await resp.text();
      let display = bodyText;
      // Best-effort pretty if JSON
      const trimmed = bodyText.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          display = JSON.stringify(JSON.parse(trimmed), null, 2);
        } catch (_) {
          // keep raw text
        }
      }
      setLog((prev) => (prev ? prev + "\n" : "") + (resp.ok ? "Upload complete.\n" : "Upload failed.\n") + display);
      setStatus(resp.ok ? "done" : "error");
    } catch (err) {
      setLog(`Upload failed: ${String(err)}`);
      setStatus("error");
    }
  }

  return (
    <div className="card">
      <div className="card-header">Upload Historical CSV → {targetFQN}</div>
      <div className="card-body space-y-3">
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" onChange={onFileChange} />
          <button onClick={handleUpload} disabled={!file || status === "uploading"}>
            {status === "uploading" ? "Uploading..." : "Upload"}
          </button>
        </div>

        <pre className="log">{log || "No logs yet."}</pre>
        <div>status: {status}</div>
      </div>
    </div>
  );
}
