import React, { useState } from "react";
import { API_BASE } from "../env";
import ConnectTab from "./tabs/ConnectTab.jsx";
import DataTab from "./tabs/DataTab.jsx";
import ClassicalTab from "./tabs/ClassicalTab.jsx";
import RunsTab from "./tabs/RunsTab.jsx";

const TABS = [
  { key:"connect", label:"Connect" },
  { key:"data", label:"Data" },
  { key:"classical", label:"Classical Forecast" },
  { key:"runs", label:"Runs" },
];

export default function App(){
  const [tab, setTab] = useState("classical");
  return (
    <div className="container">
      <h1 style={{margin:"0 0 8px"}}>TSF Frontend — FULL DATA FORM <span className="badge">v2.1</span></h1>
      <div className="muted" style={{marginBottom:12}}>Backend: <span className="mono">{API_BASE}</span></div>
      <div className="tabs">
        {TABS.map(t => <div key={t.key} className={"tab " + (t.key===tab?"active":"")} onClick={()=>setTab(t.key)}>{t.label}</div>)}
      </div>
      <div className="card">
        {tab==="connect" && <ConnectTab />}
        {tab==="data" && <DataTab />}
        {tab==="classical" && <ClassicalTab />}
        {tab==="runs" && <RunsTab />}
      </div>
    </div>
  );
}
