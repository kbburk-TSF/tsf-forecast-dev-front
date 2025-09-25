// src/App.jsx
import React, { useState } from "react";
import ConnectTab from "./tabs/ConnectTab.jsx";
import ClassicalTab from "./tabs/ClassicalTab.jsx";
import UploadTab from "./tabs/UploadTab.jsx";
import ViewsTab from "./tabs/ViewsTab.jsx";
import ChartsTab from "./tabs/ChartsTab.jsx";
import ArimaChartTab from "./tabs/ArimaChartTab.jsx";
import HwesChartTab from "./tabs/HwesChartTab.jsx";
import SesChartTab from "./tabs/SesChartTab.jsx";

const TABS = [
  { key:"connect",   label:"Connect" },
  { key:"classical", label:"Classical Export" },
  { key:"upload",    label:"Upload Historical" },
  { key:"views",     label:"Views" },
  { key:"charts",    label:"Charts" },
  { key:"arima",     label:"ARIMA Chart" },
  { key:"hwes",      label:"HWES Chart" },
  { key:"ses",       label:"SES Chart" }
];

export default function App(){
  const [tab, setTab] = useState("charts");
  return (
    <div style={{padding:"12px 16px", width:"100vw"}}>
      <div style={{display:"flex", gap:8, marginBottom:12, flexWrap:"wrap"}}>
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            style={{padding:"8px 12px", border:"1px solid #dfe3ea", borderRadius:8, cursor:"pointer",
                    background: tab===t.key ? "#111" : "#f6f8fb", color: tab===t.key ? "#fff" : "#111"}}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==="connect"   && <ConnectTab />}
      {tab==="classical" && <ClassicalTab />}
      {tab==="upload"    && <UploadTab />}
      {tab==="views"     && <ViewsTab />}
      {tab==="charts"    && <ChartsTab />}
      {tab==="arima"     && <ArimaChartTab />}
      {tab==="hwes"      && <HwesChartTab />}
      {tab==="ses"       && <SesChartTab />}
    </div>
  );
}
