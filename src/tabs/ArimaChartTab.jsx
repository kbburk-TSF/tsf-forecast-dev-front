// src/tabs/ArimaChartTab.jsx
import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function ArimaChartTab() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Loading…");

  useEffect(() => {
    async function fetchData() {
      try {
        const resp = await fetch(`/api/query?view=engine.tsf_vw_daily_best_arima_a0`);
        const data = await resp.json();
        setRows(data.rows || []);
        setStatus("");
      } catch (e) {
        setStatus("Error loading data: " + e.message);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <h2 style={marginTop:0}>Arima Forecast Chart</h2>
      <div className="muted">{status || `${rows.length} rows`}</div>
      <div style={width:"100%", height:"70vh"}>
        <ResponsiveContainer>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={fontSize:12} />
            <YAxis tick={fontSize:12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#888" dot={false} name="Historical Values" />
            <Line type="monotone" dataKey="fv" stroke="#28a745" dot={false} name="Arima" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
