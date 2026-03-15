import { FY26_DATA } from "@/constants/mockData";
import { formatCurrency } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg text-xs">
        <div className="text-gray-800 font-semibold mb-2">{label}</div>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="text-gray-800 font-medium">{formatCurrency(entry.value, true)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart() {
  const data = QUARTERS.map((q, i) => {
    const t = FY26_DATA.targets[i];
    const a = FY26_DATA.actuals[i];
    return {
      quarter: q,
      "Target Total": t.renewal + t.expansion + t.netNew,
      "Actual Total": a.renewal + a.expansion + a.netNew,
      isProjected: a.isProjected,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-800 font-bold text-base">FY26 Revenue vs. Target</h3>
          <p className="text-gray-400 text-xs mt-0.5">Renewal + Expansion + Net New, by quarter</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-violet-400" />
            <span className="text-gray-500">Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-cyan-500" />
            <span className="text-gray-500">Actual</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="quarter"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, true)}
            tick={{ fill: "#d1d5db", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
          <Bar dataKey="Target Total" fill="rgba(139,92,246,0.35)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Actual Total" fill="rgba(6,182,212,0.75)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
