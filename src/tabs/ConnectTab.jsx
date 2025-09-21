import React, { useState } from "react";
import { API_BASE } from "../env.js";

export default function ConnectTab(){
  const [out, setOut] = useState("");
  async function ping(){
    try{
      setOut("...");
      const r = await fetch(API_BASE + "/health");
      if(!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      setOut(JSON.stringify(j, null, 2));
    }catch(e){
      setOut(String(e.message||e));
    }
  }
  return (<div>
    <div>Backend: {API_BASE}</div>
    <button onClick={ping}>Check Health</button>
    {out && <pre>{out}</pre>}
  </div>);
}
