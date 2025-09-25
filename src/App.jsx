// src/App.jsx
import React, { useState } from "react";
import FourChartsTab from "./tabs/FourChartsTab.jsx";

const TABS = [{ key:"four", label:"4-Chart Display" }];

export default function App(){
  const [tab, setTab] = useState("four");
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
      {tab==="four" && <FourChartsTab />}
    </div>
  );
}
