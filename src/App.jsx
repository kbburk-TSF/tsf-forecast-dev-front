import React, { useState } from "react";
import UploadTab from "./tabs/UploadTab.jsx";

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 border-b-2 ${active ? "border-black font-semibold" : "border-transparent"}`}>
      {children}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("upload");
  return (
    <div className="max-w-3xl mx-auto">
      <header className="py-4">
        <h1 className="text-2xl font-bold">TSF Frontend</h1>
      </header>
      <nav className="flex gap-3 border-b">
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>Upload</TabButton>
      </nav>
      <main>{tab === "upload" && <UploadTab />}</main>
    </div>
  );
}
