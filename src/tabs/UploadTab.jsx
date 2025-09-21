import React, { useState, useRef } from "react";

/**
 * Uses existing env/runtime vars ONLY.
 * - Vite: import.meta.env.VITE_API_BASE
 * - Next: import.meta.env.NEXT_PUBLIC_BACKEND_URL
 * - Runtime: window.API_BASE
 * - Else: same-origin ""
 */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? import.meta?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  (typeof window !== "undefined" && window.API_BASE) ||
  "";

export default function UploadTab() {
  const [status, setStatus] = useState("idle");  // idle | uploading | waiting | done | error
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  const onSubmit = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus("error");
      setMessage("No file selected.");
      return;
    }
    setStatus("uploading");
    setProgress(0);
    setMessage("Starting upload...");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/forms/upload-historical`, true);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setProgress(pct);
        setMessage(`Uploading… ${pct}%`);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus("done");
        setMessage(xhr.responseText || "Upload complete.");
        setProgress(100);
      } else {
        setStatus("error");
        setMessage(`HTTP ${xhr.status}: ${xhr.responseText || "Upload failed."}`);
      }
    };

    xhr.onerror = () => {
      setStatus("error");
      setMessage("Network error during upload.");
    };

    xhr.send(formData);
    setStatus("waiting");
  };

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Upload Historical CSV</h2>
      <form onSubmit={onSubmit} className="space-y-2">
        <input ref={fileRef} type="file" accept=".csv" required />
        <button type="submit" disabled={status === "uploading" || status === "waiting"}>
          {status === "uploading" || status === "waiting" ? "Uploading..." : "Upload"}
        </button>
      </form>
      {(status === "uploading" || status === "waiting" || status === "done" || status === "error") && (
        <div className="space-y-2">
          <div style={{height: 6, background: "#e5e7eb", borderRadius: 4}}>
            <div style={{
              height: 6,
              width: `${progress}%`,
              borderRadius: 4,
              background: status === "error" ? "#ef4444" : status === "done" ? "#10b981" : "#3b82f6",
              transition: "width 200ms linear"
            }}/>
          </div>
          <pre style={{whiteSpace: "pre-wrap"}}>{message}</pre>
        </div>
      )}
    </div>
  );
}
