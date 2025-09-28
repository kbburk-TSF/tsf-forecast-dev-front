// pages/twocharts.jsx
import dynamic from "next/dynamic";

// Load without SSR if your tab relies on browser APIs; change to true/false as needed.
const TwoCharts = dynamic(() => import("../src/tabs/TwoCharts.jsx"), { ssr: false });

export default function TwoChartsPage(){
  return <div style={{padding:0, margin:0}}><TwoCharts /></div>;
}
