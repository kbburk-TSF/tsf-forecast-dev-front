import React from "react";
import ForecastChart from "./components/ForecastChart";

export default function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>TSF Frontend v1.2</h1>
      <ForecastChart />
    </div>
  );
}
