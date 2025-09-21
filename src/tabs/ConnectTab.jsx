import React, { useState } from "react";
import { API_BASE } from "../env.js";
import { health } from "../api.js";

export default function ConnectTab(){
  const [out, setOut] = useState("");
  async function ping(){
    try{ setOut("..."); const j = await health(); setOut(JSON.stringify(j,null,2)); }
    catch(e){ setOut(String(e.message||e)); }
  }
  return (<div>
    <div className="row">
      <div><strong>Backend URL</strong></div>
      <div className="mono">{API_BASE || "(same origin)"}</div>
      <button className="btn" onClick={ping}>Check Health</button>
    </div>
    {out && <pre>{out}</pre>}
  </div>);
}
