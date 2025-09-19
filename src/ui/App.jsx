import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, endpoints } from "../api";
import ConnectTab from "./tabs/ConnectTab";
import DataTab from "./tabs/DataTab";
import ClassicalTab from "./tabs/ClassicalTab";
import RunsTab from "./tabs/RunsTab";

const TABS = [
  { key: "connect", label: "Connect" },
  { key: "data", label: "Data" },
  { key: "classical", label: "Classical Forecast" },
  { key: "runs", label: "Runs" },
];

export default function App(){
  const [tab, setTab] = useState("connect");
  return (
    <div className="container">
      <h1 style={{margin:"0 0 12px"}}>TSF Frontend (New)</h1>
      <div className="muted" style={{marginBottom:12}}>Backend: <span className="mono">{API_BASE}</span></div>
      <div className="tabs">
        {TABS.map(t => (
          <div key={t.key} className={"tab " + (tab===t.key ? "active": "")} onClick={() => setTab(t.key)}>{t.label}</div>
        ))}
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
