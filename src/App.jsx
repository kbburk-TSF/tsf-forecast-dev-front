import React, { useState } from "react";
import { API_BASE } from "./env.js";
import ConnectTab from "./tabs/ConnectTab.jsx";
import ClassicalTab from "./tabs/ClassicalTab.jsx";
import UploadTab from "./tabs/UploadTab.jsx";
import ViewsTab from "./tabs/ViewsTab.jsx";

const TABS = [
  { key:"connect",  label:"Connect" },
  { key:"classical", label:"Classical Export" },
  { key:"upload",   label:"Upload Historical" },
  { key:"views",    label:"Views" }
];

export default function App(){
  const [tab, setTab] = useState("views");
  return (
    <div className="container">
      <h1 style={{margin:"0 0 8px"}}>TSF — Frontend <span className="badge">env/scrape + upload + views</span></h1>
      <div className="muted" style={{marginBottom:12}}>Backend: <span className="mono">{API_BASE || "(same origin)"}</span></div>
      <div className="tabs">
        {TABS.map(t => (
          <div
            key={t.key}
            className={"tab " + (t.key === tab ? "active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="card">
        {tab==="connect"   && <ConnectTab />}
        {tab==="classical" && <ClassicalTab />}
        {tab==="upload"    && <UploadTab />}
        {tab==="views"     && <ViewsTab />}
      </div>
    </div>
  );
}
