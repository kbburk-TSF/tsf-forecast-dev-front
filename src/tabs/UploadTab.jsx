
import React, { useState, useRef } from "react";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? import.meta?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  (typeof window !== "undefined" && (window.API_BASE || window.BACKEND_URL)) ||
  "";

export default function UploadTab() {
  const [status, setStatus] = useState("idle");
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
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Upload Historical CSV</h2>
      <p className="text-sm opacity-80">
        Posting to <code>{API_BASE || "(same origin)"}/forms/upload-historical</code>
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input ref={fileRef} type="file" accept=".csv" className="block" required />
        <button type="submit" className="px-3 py-2 rounded-md shadow border" disabled={status === "uploading" || status === "waiting"}>
          {status === "uploading" || status === "waiting" ? "Uploading..." : "Upload"}
        </button>
      </form>
      {(status === "uploading" || status === "waiting" || status === "done" || status === "error") && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="h-2 rounded"
              style={{ width: `${progress}%`, background: status === "error" ? "#ef4444" : status === "done" ? "#10b981" : "#3b82f6", transition: "width 200ms linear" }}
            />
          </div>
          <pre className="text-xs bg-gray-50 p-2 rounded border whitespace-pre-wrap">{message}</pre>
        </div>
      )}
    </div>
  );
}
