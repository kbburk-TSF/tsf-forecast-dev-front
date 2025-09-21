import React, { useState } from "react";
import { API_BASE } from "./env.js";
import ConnectTab from "./tabs/ConnectTab.jsx";
import ClassicalTab from "./tabs/ClassicalTab.jsx";

const TABS = [
  { key:"connect", label:"Connect" },
  { key:"classical", label:"Classical Export" }
];

export default function App(){
  const [tab, setTab] = useState("classical");
  return (
    <div className="container">
      <h1 style={{margin:"0 0 8px"}}>TSF — Frontend <span className="badge">env/scrape</span></h1>
      <div className="muted" style={{marginBottom:12}}>Backend: <span className="mono">{API_BASE || "(same origin)"}</span></div>
      <div className="tabs">
        {TABS.map(t => <div key={t.key} className={"tab " + (t.key===tab?"active":"")} onClick={()=>setTab(t.key)}>{t.label}</div>)}
      </div>
      <div className="card">{tab==="connect"? <ConnectTab/> : <ClassicalTab/>}</div>
    </div>
  );
}
