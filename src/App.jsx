import React, { useState } from "react";
import ConnectTab from "./tabs/ConnectTab.jsx";

export default function App(){
  const [tab, setTab] = useState("connect");
  return (
    <div>
      <h1>TSF — Fixed Frontend</h1>
      <div>
        <button onClick={()=>setTab("connect")}>Connect</button>
      </div>
      <div>
        {tab==="connect" && <ConnectTab />}
      </div>
    </div>
  );
}
