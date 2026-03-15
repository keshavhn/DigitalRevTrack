import { QuarterTarget, QuarterActual } from "@/types/tracker";
import { formatCurrency, attainmentPct, attainmentColor, attainmentBg } from "@/lib/formatters";

interface Props {
  target: QuarterTarget;
  actual: QuarterActual;
  isCurrent: boolean;
  isFuture: boolean;
}

const categories = [
  { key: "renewal" as const, label: "Renewal" },
  { key: "expansion" as const, label: "Expansion" },
  { key: "netNew" as const, label: "Net New" },
  { key: "churn" as const, label: "Churn / Contraction", isNegative: true },
];

export default function QuarterCard({ target, actual, isCurrent, isFuture }: Props) {
  const nrrActual = actual.renewal + actual.expansion - actual.churn;
  const nrrTarget = target.renewal + target.expansion - target.churn;
  const nrrPct = attainmentPct(nrrActual, nrrTarget);

  return (
    <div
      className={`rounded-2xl border flex flex-col gap-0 overflow-hidden transition-all ${
        isCurrent
          ? "border-amber-500/60 shadow-lg shadow-amber-500/10"
          : isFuture
          ? "border-white/10 opacity-60"
          : "border-white/10"
      }`}
      style={{ background: "linear-gradient(160deg, #141d35 0%, #0f1629 100%)" }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 py-4 ${
          isCurrent ? "bg-amber-500/10 border-b border-amber-500/30" : "border-b border-white/8"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-tight">{target.quarter}</span>
          {isCurrent && (
            <span className="text-[10px] font-semibold bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live
            </span>
          )}
          {isFuture && (
            <span className="text-[10px] font-semibold bg-white/10 text-white/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Upcoming
            </span>
          )}
          {actual.isProjected && !isFuture && (
            <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Projected
            </span>
          )}
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${attainmentColor(nrrPct)}`}>
            {isFuture ? "—" : `${nrrPct}%`}
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">NRR Att.</div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-0 divide-y divide-white/5 px-5 py-2">
        {categories.map(({ key, label, isNegative }) => {
          const tgt = target[key];
          const act = actual[key];
          const pct = attainmentPct(act, tgt);
          const barWidth = Math.min(pct, 130);

          return (
            <div key={key} className="py-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-white/50 font-medium">{label}</span>
                {!isFuture && (
                  <span className={`text-xs font-bold ${isNegative ? (act <= tgt ? "text-emerald-400" : "text-rose-400") : attainmentColor(pct)}`}>
                    {isNegative ? (act <= tgt ? "Under" : "Over") : `${pct}%`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  {!isFuture && (
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isNegative
                          ? act <= tgt
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                          : attainmentBg(pct)
                      }`}
                      style={{ width: `${Math.min(barWidth, 100)}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-white/30">
                  Target: {formatCurrency(tgt, true)}
                </span>
                <span className="text-[11px] text-white/60 font-medium">
                  {isFuture ? "—" : `Actual: ${formatCurrency(act, true)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="px-5 py-4 mt-auto border-t border-white/5 bg-white/2">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Total Target</div>
            <div className="text-sm font-semibold text-white/70">
              {formatCurrency(target.renewal + target.expansion + target.netNew, true)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Total Actual</div>
            <div className="text-sm font-semibold text-white">
              {isFuture ? "—" : formatCurrency(actual.renewal + actual.expansion + actual.netNew, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
