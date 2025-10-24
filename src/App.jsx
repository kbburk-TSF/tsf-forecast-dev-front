// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
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
import DashboardTab3 from "./tabs/DashboardTab3.jsx";
import TwoCharts from "./tabs/TwoCharts.jsx";

const TABS = [
  { key: "connect",   label: "Connect" },
  { key: "classical", label: "Classical Export" },
  { key: "upload",    label: "Upload" },
  { key: "views",     label: "Views" },
  { key: "charts",    label: "Charts" },
  { key: "arima",     label: "ARIMA_M" },
  { key: "hwes",      label: "HWES_M" },
  { key: "ses",       label: "SES_M" },
  { key: "dashboard", label: "Dashboard" },
  { key: "dashboard2", label: "Dashboard 2" },
  { key: "dashboard3", label: "Dashboard 3" }
];

function getTabFromUrl() {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  const t = sp.get("tab");
  if (t) return t;
  const hash = (window.location.hash || "").replace(/^#\/?/, "");
  return hash || null;
}

function setTabInUrl(tabKey, { replace = true } = {}) {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams(window.location.search);
  sp.set("tab", tabKey);
  const newUrl = `${window.location.pathname}?${sp.toString()}`;
  if (replace) window.history.replaceState(null, "", newUrl);
  else window.history.pushState(null, "", newUrl);
}

export default function App() {
  const initial = getTabFromUrl() || "connect";
  const [tab, setTab] = useState(initial);

  // Clean mode if clean=1 OR when using the special 'twocharts' route
  const clean =
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("clean") === "1") ||
    tab === "twocharts";

  useEffect(() => {
    // back/forward support
    function onNav() {
      const t = getTabFromUrl();
      if (t && t !== tab) setTab(t);
    }
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, [tab]);

  useEffect(() => {
    // Sync current tab to the URL
    setTabInUrl(tab, { replace: true });
  }, [tab]);

  // Special direct view: /?tab=twocharts renders clean page (no nav)
  if (tab === "twocharts") {
    return <div style={{ padding: 0, margin: 0 }}><TwoCharts /></div>;
  }

  const valid = new Set(TABS.map(t => t.key));
  const active = valid.has(tab) ? tab : "connect";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      {!clean && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 12px",
                border: "1px solid #dfe3ea",
                borderRadius: 8,
                cursor: "pointer",
                background: active === t.key ? "#111" : "#f6f8fb",
                color: active === t.key ? "#fff" : "#111",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {active === "connect"   && <ConnectTab />}
      {active === "classical" && <ClassicalTab />}
      {active === "upload"    && <UploadTab />}
      {active === "views"     && <ViewsTab />}
      {active === "charts"    && <ChartsTab />}
      {active === "arima"     && <ArimaChartTab />}
      {active === "hwes"      && <HwesChartTab />}
      {active === "ses"       && <SesChartTab />}
      {active === "dashboard" && <DashboardTab />}
      {active === "dashboard2" && <DashboardTab2 />}
      {active === "dashboard3" && <DashboardTab3 />}
    </div>
  );
}
