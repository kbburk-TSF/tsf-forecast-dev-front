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
import DashboardTab from "./tabs/DashboardTab.jsx";
import DashboardTab2 from "./tabs/DashboardTab2.jsx";
import TwoCharts from "./tabs/TwoCharts.jsx";

export default function App(){
  // Direct URL bypass: if path is /twocharts, render that page with no nav or tabs.
  const isTwoCharts = typeof window !== "undefined" && window.location && window.location.pathname.endsWith("/twocharts");
  if (isTwoCharts) {
    return <TwoCharts />;
  }

  const TABS = [
    { key:"connect",   label:"Connect" },
    { key:"classical", label:"Classical Export" },
    { key:"upload",    label:"Upload Historical" },
    { key:"views",     label:"Views" },
    { key:"charts",    label:"Charts" },
    { key:"arima",     label:"ARIMA Chart" },
    { key:"hwes",      label:"HWES Chart" },
    { key:"ses",       label:"SES Chart" },
    { key:"dashboard", label:"Dashboard" },
    { key:"dashboard2", label:"Dashboard 2" },
  ];

  const [tab, setTab] = useState("dashboard");
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
      {tab==="dashboard" && <DashboardTab />}
      {tab==="dashboard2" && <DashboardTab2 />}
    </div>
  );
}
