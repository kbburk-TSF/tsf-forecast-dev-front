import React, { useState } from "react";
import { API_BASE, endpoints } from "../../api";

export default function ConnectTab(){
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  async function ping(){
    setErr(""); setRes(null);
    try {
      const h = await endpoints.health();
      setRes(h);
    } catch(e){
      setErr(String(e.message || e));
    }
  }

  return (
    <div>
      <div className="row">
        <div><strong>Backend URL</strong></div>
        <div className="mono">{API_BASE}</div>
        <button className="btn" onClick={ping}>Check Health</button>
      </div>
      {err && <pre>{err}</pre>}
      {res && <pre>{JSON.stringify(res, null, 2)}</pre>}
      <p className="muted">This tab tests /health and shows the configured backend URL. Background is white to distinguish from old app.</p>
    </div>
  );
}
