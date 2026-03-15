import { ClientExpansion } from "@/types/tracker";
import { QUARTERS } from "@/constants/mockData";
import { formatCurrency, attainmentPct, attainmentColor } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";

interface Props {
  clients: ClientExpansion[];
  selectedQuarter: "ALL" | "Q1" | "Q2" | "Q3" | "Q4";
}

function getActual(client: ClientExpansion, q: "Q1" | "Q2" | "Q3" | "Q4"): number | null {
  return client[`${q.toLowerCase()}Actual` as keyof ClientExpansion] as number | null;
}

function getTarget(client: ClientExpansion, q: "Q1" | "Q2" | "Q3" | "Q4"): number {
  return client[`${q.toLowerCase()}Target` as keyof ClientExpansion] as number;
}

export default function ClientExpansionTable({ clients, selectedQuarter }: Props) {
  const quarters = selectedQuarter === "ALL" ? QUARTERS : [selectedQuarter];

  const totalByQ = QUARTERS.map((q) => {
    const target = clients.reduce((s, c) => s + getTarget(c, q), 0);
    const actual = clients.reduce((s, c) => {
      const a = getActual(c, q);
      return s + (a ?? 0);
    }, 0);
    return { q, target, actual };
  });

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #141d35 0%, #0f1629 100%)" }}
    >
      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-4 text-white/40 font-medium text-xs uppercase tracking-wider w-[200px]">
                Client
              </th>
              <th className="text-left px-3 py-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                CSM
              </th>
              <th className="text-left px-3 py-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                AM
              </th>
              {quarters.map((q) => (
                <th
                  key={q}
                  colSpan={2}
                  className="text-center px-3 py-4 text-white/40 font-medium text-xs uppercase tracking-wider"
                >
                  {q} Expansion
                </th>
              ))}
              <th className="text-right px-5 py-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                Att.
              </th>
            </tr>
            <tr className="border-b border-white/8 bg-white/2">
              <td className="px-5 py-2 text-white/20 text-[11px]"></td>
              <td className="px-3 py-2 text-white/20 text-[11px]"></td>
              <td className="px-3 py-2 text-white/20 text-[11px]"></td>
              {quarters.map((q) => (
                <>
                  <td key={`${q}-t`} className="px-3 py-2 text-white/25 text-[11px] text-center">
                    Target
                  </td>
                  <td key={`${q}-a`} className="px-3 py-2 text-white/25 text-[11px] text-center">
                    Actual
                  </td>
                </>
              ))}
              <td className="px-5 py-2 text-white/20 text-[11px] text-right"></td>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clients.map((client) => {
              const ytdTarget = quarters.reduce((s, q) => s + getTarget(client, q), 0);
              const ytdActual = quarters.reduce((s, q) => {
                const a = getActual(client, q);
                return s + (a ?? 0);
              }, 0);
              const ytdPct = attainmentPct(ytdActual, ytdTarget);

              return (
                <tr
                  key={client.id}
                  className="group hover:bg-white/3 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white/70 shrink-0"
                        style={{ background: "rgba(251,191,36,0.15)" }}
                      >
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium leading-tight">{client.name}</div>
                        <div className="text-white/35 text-[11px]">{client.industry}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-white/50 text-xs">{client.csm}</td>
                  <td className="px-3 py-3.5 text-white/50 text-xs">{client.am}</td>
                  {quarters.map((q) => {
                    const act = getActual(client, q);
                    const tgt = getTarget(client, q);
                    return (
                      <>
                        <td key={`${q}-t`} className="px-3 py-3.5 text-center">
                          <span className="text-white/45 text-xs">{formatCurrency(tgt, true)}</span>
                        </td>
                        <td key={`${q}-a`} className="px-3 py-3.5 text-center">
                          {act !== null ? (
                            <span
                              className={`text-xs font-semibold ${
                                act >= tgt ? "text-emerald-400" : "text-white/70"
                              }`}
                            >
                              {formatCurrency(act, true)}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      </>
                    );
                  })}
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-bold ${attainmentColor(ytdPct)}`}>
                      {ytdPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t border-white/15 bg-amber-500/5">
              <td className="px-5 py-4 text-white font-semibold text-sm" colSpan={3}>
                Total
              </td>
              {quarters.map((q) => {
                const row = totalByQ.find((r) => r.q === q)!;
                return (
                  <>
                    <td key={`${q}-tt`} className="px-3 py-4 text-center">
                      <span className="text-white/60 text-xs font-medium">
                        {formatCurrency(row.target, true)}
                      </span>
                    </td>
                    <td key={`${q}-ta`} className="px-3 py-4 text-center">
                      <span className="text-amber-400 text-xs font-semibold">
                        {formatCurrency(row.actual, true)}
                      </span>
                    </td>
                  </>
                );
              })}
              <td className="px-5 py-4 text-right">
                <span className={`text-sm font-bold ${attainmentColor(
                  attainmentPct(
                    totalByQ.filter(r => quarters.includes(r.q)).reduce((s, r) => s + r.actual, 0),
                    totalByQ.filter(r => quarters.includes(r.q)).reduce((s, r) => s + r.target, 0)
                  )
                )}`}>
                  {attainmentPct(
                    totalByQ.filter(r => quarters.includes(r.q)).reduce((s, r) => s + r.actual, 0),
                    totalByQ.filter(r => quarters.includes(r.q)).reduce((s, r) => s + r.target, 0)
                  )}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
