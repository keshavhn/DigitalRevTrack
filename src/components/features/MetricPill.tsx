interface Props {
  label: string;
  value: string;
  sub: string;
  pct?: number;
  color?: "amber" | "emerald" | "rose" | "blue";
}

const colorMap = {
  amber: "text-amber-600",
  emerald: "text-emerald-700",
  rose: "text-rose-600",
  blue: "text-violet-700",
};

const bgMap = {
  amber: "bg-amber-50 border-amber-200",
  emerald: "bg-emerald-50 border-emerald-200",
  rose: "bg-rose-50 border-rose-200",
  blue: "bg-violet-50 border-violet-200",
};

export default function MetricPill({ label, value, sub, pct, color = "amber" }: Props) {
  return (
    <div className={`rounded-xl border px-5 py-4 flex flex-col gap-1 bg-white shadow-sm ${bgMap[color]}`}>
      <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-gray-400">
        {sub}
        {pct !== undefined && (
          <span className={`ml-1 font-semibold ${colorMap[color]}`}>{pct}% att.</span>
        )}
      </div>
    </div>
  );
}
