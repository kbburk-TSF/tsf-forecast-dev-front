import React, { useState, useRef } from "react";

/**
 * BACKEND URL resolution (runtime-first to avoid false same-origin posts):
 * 1) window.API_BASE (set at runtime without rebuild)
 * 2) import.meta.env.VITE_API_BASE (Vite)
 * 3) import.meta.env.NEXT_PUBLIC_BACKEND_URL (Vite/Next)
 * 4) process.env.NEXT_PUBLIC_BACKEND_URL (Next at build-time)
 * If none found, we refuse to upload to avoid hitting the front-end origin by mistake.
 */
const RUNTIME_URL = (typeof window !== "undefined" && window.API_BASE) || "";
const BUILD_URL_VITE = (typeof import !== "undefined" && import.meta && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.NEXT_PUBLIC_BACKEND_URL)) || "";
// process.env is inlined by Next at build; optional-chaining to avoid ReferenceError in browsers
const BUILD_URL_NEXT = (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_BACKEND_URL) || "";
const API_BASE = RUNTIME_URL || BUILD_URL_VITE || BUILD_URL_NEXT || "";

/** Simple helper to guard against SPA index.html fallbacks returning 200 */
function looksLikeBackendResponse(text) {
  return typeof text === "string" && text.startsWith("state=");
}

export default function UploadTab() {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!API_BASE) {
      setStatus("error");
      setMessage("Backend URL not set. Define window.API_BASE or NEXT_PUBLIC_BACKEND_URL / VITE_API_BASE.");
      return;
    }

    // Optional ping to ensure we're talking to the backend host
    try {
      const ping = await fetch(`${API_BASE}/forms/debug/engine-db`, { method: "GET" });
      if (!ping.ok) {
        setStatus("error");
        setMessage(`Backend health check failed: HTTP ${ping.status}`);
        return;
      }
    } catch (err) {
      setStatus("error");
      setMessage(`Backend not reachable: ${String(err)}`);
      return;
    }

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
      const okRange = xhr.status >= 200 && xhr.status < 300;
      if (okRange && looksLikeBackendResponse(xhr.responseText)) {
        setStatus("done");
        setMessage(xhr.responseText || "Upload complete.");
        setProgress(100);
      } else {
        setStatus("error");
        const snippet = (xhr.responseText || "").slice(0, 200);
        setMessage(`Unexpected response (not from backend or error). HTTP ${xhr.status}. ${snippet ? "Body: " + snippet : ""}`);
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
      <div className="text-xs opacity-70">
        Using backend: <code>{API_BASE || "(unset)"} </code>
      </div>
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
