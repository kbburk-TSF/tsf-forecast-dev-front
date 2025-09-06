import React, { useEffect, useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API_BASE = "https://tsf-forecast-dev-backend.onrender.com";

export default function ForecastChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const res = await fetch(
          `${API_BASE}/forecast/state_daily?state=Colorado&parameter=NO2&h=30&method=seasonal_naive_dow`
        );
        const json = await res.json();
        if (json.history && json.forecast) {
          const combined = [
            ...json.history.map(d => ({ ...d, type: "history" })),
            ...json.forecast.map(d => ({ ...d, type: "forecast" }))
          ];
          setData(combined);
        }
      } catch (err) {
        console.error("Error fetching forecast:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, []);

  if (loading) return <p>Loading forecast...</p>;

  return (
    <div>
      <h2>Forecast: Colorado NO₂</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#82ca9d" dot={false} name="History" strokeDasharray="0" />
          <Line type="monotone" dataKey="value" stroke="#ff7300" dot={false} name="Forecast" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
