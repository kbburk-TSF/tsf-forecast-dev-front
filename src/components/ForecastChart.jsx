import React from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ForecastChart({ data, title }){
  if (!data || (!data.history && !data.forecast)) return null;
  const combined = [
    ...(data.history || []).map(d => ({ ...d, type: "History" })),
    ...(data.forecast || []).map(d => ({ ...d, type: "Forecast" })),
  ];
  return (
    <div style={{ background:"#0f172a", padding:16, borderRadius:12 }}>
      <h2 style={{ marginTop:0 }}>{title || "Forecast"}</h2>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={combined}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" name="History" stroke="#16a34a" dot={false} strokeDasharray="0" />
          <Line type="monotone" dataKey="value" name="Forecast" stroke="#f59e0b" dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
