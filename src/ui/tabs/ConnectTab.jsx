import React, { useState } from "react";
import { API_BASE, } from "../../env.js";
import { endpoints } from "../../api.js";

export default function ConnectTab(){
  const [out, setOut] = useState("");
  async function ping(){
    setOut("...");
    try { const h = await endpoints.health(); setOut(JSON.stringify(h,null,2)); }
    catch(e){ setOut(String(e.message || e)); }
  }
  return (
    <div>
      <div className="row">
        <div><strong>Backend URL</strong></div>
        <div className="mono">{API_BASE}</div>
        <button className="btn" onClick={ping}>Check Health</button>
      </div>
      {out && <pre>{out}</pre>}
      <p className="muted">White theme confirms this is the new app.</p>
    </div>
  );
}