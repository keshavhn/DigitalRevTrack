import { useState } from "react";
import { Users, Search, ChevronDown, ChevronRight } from "lucide-react";
import { ClientExpansion } from "@/types/tracker";
import { formatCurrency, attainmentPct } from "@/lib/formatters";

const QUARTER_COLORS: Record<string, {
  header: string;
  headerBg: string;
  subBg: string;
  cellBg: string;
  leftBorder: string;
  totalActual: string;
}> = {
  Q1: { header: "text-sky-700", headerBg: "bg-sky-50", subBg: "bg-sky-50/60", cellBg: "bg-sky-50/30", leftBorder: "border-l-2 border-sky-300", totalActual: "text-sky-700" },
  Q2: { header: "text-violet-700", headerBg: "bg-violet-50", subBg: "bg-violet-50/60", cellBg: "bg-violet-50/30", leftBorder: "border-l-2 border-violet-300", totalActual: "text-violet-700" },
  Q3: { header: "text-amber-700", headerBg: "bg-amber-50", subBg: "bg-amber-50/60", cellBg: "bg-amber-50/30", leftBorder: "border-l-2 border-amber-300", totalActual: "text-amber-700" },
  Q4: { header: "text-emerald-700", headerBg: "bg-emerald-50", subBg: "bg-emerald-50/60", cellBg: "bg-emerald-50/30", leftBorder: "border-l-2 border-emerald-300", totalActual: "text-emerald-700" },
};

const QUARTER_ORDER = ["Q1", "Q2", "Q3", "Q4"] as const;
type Q = typeof QUARTER_ORDER[number];
type ClientMode = "er-en" | "nn";

const CURRENT_QUARTER: Q = "Q3";
const HIDDEN_CLIENTS = new Set(["new client - novartis"]);

function isCurrent(q: Q) {
  return q === CURRENT_QUARTER;
}

function quarterKey(quarter: Q) {
  return quarter.toLowerCase() as "q1" | "q2" | "q3" | "q4";
}

function formatVariance(value: number) {
  if (value === 0) return formatCurrency(0, true);
  return `${value > 0 ? "+" : "-"}${formatCurrency(Math.abs(value), true)}`;
}

function varianceClass(value: number) {
  return value >= 0 ? "text-emerald-600" : "text-rose-600";
}

function shouldHideClient(name: string) {
  return HIDDEN_CLIENTS.has(name.trim().toLowerCase());
}

interface Props {
  clients: ClientExpansion[];
  productTab: string;
  clientSearch: string;
  setClientSearch: (v: string) => void;
  attColorLight: (pct: number) => string;
  attBarColor: (pct: number) => string;
}

export default function ClientRevenueTable({
  clients,
  productTab,
  clientSearch,
  setClientSearch,
  attColorLight,
  attBarColor,
}: Props) {
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [activeMode, setActiveMode] = useState<ClientMode>("er-en");

  const filtered = clients.filter((client) => {
    if (shouldHideClient(client.name)) return false;
    return clientSearch === "" ||
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.industry.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.csm.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.am.toLowerCase().includes(clientSearch.toLowerCase());
  });

  const erEnClients = filtered.filter((client) =>
    QUARTER_ORDER.some((quarter) => {
      const data = client[quarterKey(quarter)];
      return (
        data.erTarget > 0 ||
        data.enTarget > 0 ||
        (data.erActual ?? 0) > 0 ||
        (data.enActual ?? 0) > 0
      );
    }),
  );

  const nnClients = filtered.filter((client) =>
    QUARTER_ORDER.some((quarter) => {
      const data = client[quarterKey(quarter)];
      return data.nnTarget > 0 || (data.nnActual ?? 0) > 0;
    }),
  );

  function toggleClient(id: string) {
    setExpandedClients((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    erEnClients.forEach((client) => {
      next[client.id] = true;
    });
    setExpandedClients(next);
  }

  function collapseAll() {
    setExpandedClients({});
  }

  function clientManualTotal(client: ClientExpansion) {
    let target = 0;
    let actual = 0;
    QUARTER_ORDER.forEach((quarter) => {
      const data = client[quarterKey(quarter)];
      target += data.erTarget + data.enTarget;
      actual += (data.erActual ?? 0) + (data.enActual ?? 0);
    });
    return { target, actual, pct: attainmentPct(actual, target) };
  }

  function clientActualTotal(client: ClientExpansion) {
    const rowActual = QUARTER_ORDER.reduce((sum, quarter) => {
      const data = client[quarterKey(quarter)];
      return sum + (data.erActual ?? 0) + (data.enActual ?? 0);
    }, 0);

    if (rowActual > 0) {
      return rowActual;
    }

    return QUARTER_ORDER.reduce((sum, quarter) => sum + (client.hubspotActuals?.[quarter] ?? 0), 0);
  }

  function grandErEnTotals() {
    return QUARTER_ORDER.map((quarter) => {
      const key = quarterKey(quarter);
      const erTarget = erEnClients.reduce((sum, client) => sum + client[key].erTarget, 0);
      const erActual = erEnClients.reduce((sum, client) => sum + (client[key].erActual ?? 0), 0);
      const enTarget = erEnClients.reduce((sum, client) => sum + client[key].enTarget, 0);
      const enActual = erEnClients.reduce((sum, client) => sum + (client[key].enActual ?? 0), 0);
      return {
        quarter,
        totalTarget: erTarget + enTarget,
        totalActual: erActual + enActual,
        variance: erActual + enActual - (erTarget + enTarget),
      };
    });
  }

  function nnClientTotal(client: ClientExpansion) {
    let target = 0;
    let actual = 0;
    QUARTER_ORDER.forEach((quarter) => {
      const data = client[quarterKey(quarter)];
      target += data.nnTarget;
      actual += data.nnActual ?? 0;
    });
    return { target, actual, variance: actual - target, pct: attainmentPct(actual, target) };
  }

  function grandNnTotals() {
    return QUARTER_ORDER.map((quarter) => {
      const key = quarterKey(quarter);
      const target = nnClients.reduce((sum, client) => sum + client[key].nnTarget, 0);
      const actual = nnClients.reduce((sum, client) => sum + (client[key].nnActual ?? 0), 0);
      return { quarter, target, actual, variance: actual - target };
    });
  }

  const allExpanded = erEnClients.length > 0 && erEnClients.every((client) => expandedClients[client.id]);

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No client data available for {productTab}</p>
          <p className="text-xs mt-1">Maintain targets in Client Input, then review actuals and variance here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-700">Revenue by Client</span>
          <span className="text-[11px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">{activeMode === "er-en" ? erEnClients.length : nnClients.length} clients</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
          <button
            onClick={() => setActiveMode("er-en")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeMode === "er-en" ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            ER/EN
          </button>
          <button
            onClick={() => setActiveMode("nn")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeMode === "nn" ? "bg-amber-500 text-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            NN
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {activeMode === "er-en" && erEnClients.length > 0 && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="text-[11px] text-gray-500 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeMode === "er-en" ? "Search client, industry, CSM, AM..." : "Search NN clients..."}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 w-52"
            />
          </div>
        </div>
      </div>

      {activeMode === "er-en" && erEnClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Search className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No clients match "{clientSearch}"</p>
        </div>
      )}

      {activeMode === "er-en" && erEnClients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-400 font-semibold uppercase tracking-wider text-[11px]" style={{ width: 220 }}>Client</th>
                {QUARTER_ORDER.map((quarter) => {
                  const qc = QUARTER_COLORS[quarter];
                  return (
                    <th key={quarter} colSpan={4} className={`text-center py-3 font-bold uppercase tracking-wider text-[11px] ${qc.leftBorder} ${qc.header} ${qc.headerBg}`}>
                      <span className="inline-flex items-center justify-center gap-1.5 px-2">
                        {quarter}
                        {isCurrent(quarter) && <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">Live</span>}
                      </span>
                    </th>
                  );
                })}
                <th className="text-center py-3 px-4 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-l-2 border-gray-200">Manual Total</th>
                <th className="text-center py-3 px-4 text-emerald-700 font-semibold uppercase tracking-wider text-[11px] border-l border-emerald-200 bg-emerald-50/60">HubSpot Actual</th>
                <th className="text-center py-3 px-4 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-l border-gray-200">Variance</th>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-5 py-2 text-left text-[11px] text-gray-400 font-medium">Category</th>
                {QUARTER_ORDER.map((quarter) => {
                  const qc = QUARTER_COLORS[quarter];
                  return (
                    <>
                      <th key={`${quarter}-er-t`} className={`px-3 py-2 text-center font-semibold text-[11px] ${qc.leftBorder} text-sky-600 ${qc.subBg}`}>ER Tgt</th>
                      <th key={`${quarter}-er-a`} className={`px-3 py-2 text-center font-semibold text-[11px] text-sky-600 ${qc.subBg}`}>ER Act</th>
                      <th key={`${quarter}-en-t`} className={`px-3 py-2 text-center font-semibold text-[11px] text-violet-600 ${qc.subBg}`}>EN Tgt</th>
                      <th key={`${quarter}-en-a`} className={`px-3 py-2 text-center font-semibold text-[11px] text-violet-600 ${qc.subBg}`}>EN Act</th>
                    </>
                  );
                })}
                <th className="px-4 py-2 text-center text-[11px] text-gray-400 font-semibold border-l-2 border-gray-200">Act / Tgt</th>
                <th className="px-4 py-2 text-center text-[11px] text-emerald-700 font-semibold border-l border-emerald-200 bg-emerald-50/60">Total</th>
                <th className="px-4 py-2 text-center text-[11px] text-gray-400 font-semibold border-l border-gray-200">vs Target</th>
              </tr>
            </thead>
            <tbody>
              {erEnClients.map((client) => {
                const expanded = !!expandedClients[client.id];
                const manualTotal = clientManualTotal(client);
                  const actualTotal = clientActualTotal(client);
                  const variance = actualTotal - manualTotal.target;

                return (
                  <>
                    <tr
                      key={`${client.id}-header`}
                      className="border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer transition-colors bg-white"
                      onClick={() => toggleClient(client.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-2">
                          <button className={`mt-0.5 w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 shrink-0 transition-colors ${expanded ? "bg-violet-100 text-violet-600" : "bg-gray-100"}`}>
                            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                          <div>
                            <div className="font-bold text-gray-800 text-xs">{client.name}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{client.industry}</div>
                            <div className="text-[11px] text-gray-400">CSM: {client.csm}</div>
                            <div className="text-[11px] text-gray-400">AM: {client.am}</div>
                          </div>
                        </div>
                      </td>
                      {QUARTER_ORDER.map((quarter) => {
                        const data = client[quarterKey(quarter)];
                        const qc = QUARTER_COLORS[quarter];
                        return (
                          <>
                            <td key={`${client.id}-${quarter}-ert`} className={`px-3 py-3 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                              <span className="font-medium text-sky-600">{formatCurrency(data.erTarget, true)}</span>
                            </td>
                            <td key={`${client.id}-${quarter}-era`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                              {data.erActual !== null ? <span className={`font-bold ${attColorLight(attainmentPct(data.erActual, data.erTarget))}`}>{formatCurrency(data.erActual, true)}</span> : <span className="text-gray-300">-</span>}
                            </td>
                            <td key={`${client.id}-${quarter}-ent`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                              <span className="font-medium text-violet-600">{formatCurrency(data.enTarget, true)}</span>
                            </td>
                            <td key={`${client.id}-${quarter}-ena`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                              {data.enActual !== null ? <span className={`font-bold ${attColorLight(attainmentPct(data.enActual, data.enTarget))}`}>{formatCurrency(data.enActual, true)}</span> : <span className="text-gray-300">-</span>}
                            </td>
                          </>
                        );
                      })}
                      <td className="px-4 py-3 text-center border-l-2 border-gray-100">
                        <div className={`font-bold text-xs ${attColorLight(manualTotal.pct)}`}>{formatCurrency(manualTotal.actual, true)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(manualTotal.target, true)} tgt</div>
                        <div className={`text-[11px] font-bold mt-0.5 ${attColorLight(manualTotal.pct)}`}>{manualTotal.pct}%</div>
                      </td>
                      <td className="px-4 py-3 text-center border-l border-emerald-100 bg-emerald-50/30">
                        <div className="font-bold text-xs text-emerald-700">{formatCurrency(actualTotal, true)}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">actual total</div>
                      </td>
                      <td className="px-4 py-3 text-center border-l border-gray-100">
                        <div className={`font-bold text-xs ${varianceClass(variance)}`}>{formatVariance(variance)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">vs {formatCurrency(manualTotal.target, true)}</div>
                      </td>
                    </tr>

                    {expanded && (
                      <>
                        <tr key={`${client.id}-er`} className="border-b border-gray-50 bg-sky-50/20">
                          <td className="pl-12 pr-5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                              <span className="text-sky-700 font-semibold text-[11px]">ER</span>
                              <span className="text-gray-400 text-[11px]">Existing Renewal</span>
                            </div>
                          </td>
                          {QUARTER_ORDER.map((quarter) => {
                            const data = client[quarterKey(quarter)];
                            const qc = QUARTER_COLORS[quarter];
                            const pct = data.erActual !== null ? attainmentPct(data.erActual, data.erTarget) : null;
                            return (
                              <>
                                <td key={`${client.id}-${quarter}-er-detail-t`} className={`px-3 py-2.5 text-center ${qc.leftBorder} bg-sky-50/30`}>
                                  <span className="text-gray-500 text-[11px]">{formatCurrency(data.erTarget, true)}</span>
                                </td>
                                <td key={`${client.id}-${quarter}-er-detail-a`} className="px-3 py-2.5 text-center bg-sky-50/30">
                                  {data.erActual !== null ? <span className={`font-bold text-[11px] ${pct !== null ? attColorLight(pct) : "text-gray-500"}`}>{formatCurrency(data.erActual, true)}</span> : <span className="text-gray-300 text-[11px]">-</span>}
                                </td>
                                <td key={`${client.id}-${quarter}-er-detail-blank1`} className="px-3 py-2.5 bg-sky-50/30" />
                                <td key={`${client.id}-${quarter}-er-detail-pct`} className="px-3 py-2.5 text-center bg-sky-50/30">
                                  {pct !== null ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={`font-bold text-[11px] ${attColorLight(pct)}`}>{pct}%</span>
                                      <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${attBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                      </div>
                                    </div>
                                  ) : <span className="text-gray-300 text-[11px]">-</span>}
                                </td>
                              </>
                            );
                          })}
                          <td className="px-4 py-2.5 text-center border-l-2 border-gray-100">
                            {(() => {
                              const actual = QUARTER_ORDER.reduce((sum, quarter) => sum + (client[quarterKey(quarter)].erActual ?? 0), 0);
                              const target = QUARTER_ORDER.reduce((sum, quarter) => sum + client[quarterKey(quarter)].erTarget, 0);
                              const pct = attainmentPct(actual, target);
                              return (
                                <>
                                  <div className={`font-bold text-[11px] ${attColorLight(pct)}`}>{formatCurrency(actual, true)}</div>
                                  <div className="text-[10px] text-gray-400">{formatCurrency(target, true)} tgt</div>
                                  <div className={`text-[11px] font-bold ${attColorLight(pct)}`}>{pct}%</div>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-2.5 border-l border-emerald-100 bg-emerald-50/20" />
                          <td className="px-4 py-2.5 border-l border-gray-100" />
                        </tr>

                        <tr key={`${client.id}-en`} className="border-b border-gray-100 bg-violet-50/20">
                          <td className="pl-12 pr-5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                              <span className="text-violet-700 font-semibold text-[11px]">EN</span>
                              <span className="text-gray-400 text-[11px]">Expansion</span>
                            </div>
                          </td>
                          {QUARTER_ORDER.map((quarter) => {
                            const data = client[quarterKey(quarter)];
                            const pct = data.enActual !== null ? attainmentPct(data.enActual, data.enTarget) : null;
                            const qc = QUARTER_COLORS[quarter];
                            return (
                              <>
                                <td key={`${client.id}-${quarter}-en-detail-blank1`} className={`px-3 py-2.5 ${qc.leftBorder} bg-violet-50/30`} />
                                <td key={`${client.id}-${quarter}-en-detail-blank2`} className="px-3 py-2.5 bg-violet-50/30" />
                                <td key={`${client.id}-${quarter}-en-detail-t`} className="px-3 py-2.5 text-center bg-violet-50/30">
                                  <span className="text-gray-500 text-[11px]">{formatCurrency(data.enTarget, true)}</span>
                                </td>
                                <td key={`${client.id}-${quarter}-en-detail-a`} className="px-3 py-2.5 text-center bg-violet-50/30">
                                  {data.enActual !== null ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={`font-bold text-[11px] ${pct !== null ? attColorLight(pct) : "text-gray-500"}`}>{formatCurrency(data.enActual, true)}</span>
                                      {pct !== null && (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className={`text-[10px] font-semibold ${attColorLight(pct)}`}>{pct}%</span>
                                          <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${attBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : <span className="text-gray-300 text-[11px]">-</span>}
                                </td>
                              </>
                            );
                          })}
                          <td className="px-4 py-2.5 text-center border-l-2 border-gray-100">
                            {(() => {
                              const actual = QUARTER_ORDER.reduce((sum, quarter) => sum + (client[quarterKey(quarter)].enActual ?? 0), 0);
                              const target = QUARTER_ORDER.reduce((sum, quarter) => sum + client[quarterKey(quarter)].enTarget, 0);
                              const pct = attainmentPct(actual, target);
                              return (
                                <>
                                  <div className={`font-bold text-[11px] ${attColorLight(pct)}`}>{formatCurrency(actual, true)}</div>
                                  <div className="text-[10px] text-gray-400">{formatCurrency(target, true)} tgt</div>
                                  <div className={`text-[11px] font-bold ${attColorLight(pct)}`}>{pct}%</div>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-2.5 border-l border-emerald-100 bg-emerald-50/20" />
                          <td className="px-4 py-2.5 border-l border-gray-100" />
                        </tr>
                      </>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3.5">
                  <span className="text-gray-700 font-bold text-xs uppercase tracking-wider">Total ({erEnClients.length} clients)</span>
                </td>
                {grandErEnTotals().map(({ quarter, totalTarget, totalActual, variance }) => {
                  const qc = QUARTER_COLORS[quarter];
                  return (
                    <td key={`tot-${quarter}`} colSpan={4} className={`px-3 py-3.5 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                      <div className="text-[11px] font-semibold text-gray-600">{formatCurrency(totalTarget, true)} target</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${qc.totalActual}`}>{formatCurrency(totalActual, true)} actual</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${varianceClass(variance)}`}>{formatVariance(variance)} variance</div>
                    </td>
                  );
                })}
                <td className="px-4 py-3.5 text-center border-l-2 border-gray-200">
                  {(() => {
                    const actual = erEnClients.reduce((sum, client) => sum + clientManualTotal(client).actual, 0);
                    const target = erEnClients.reduce((sum, client) => sum + clientManualTotal(client).target, 0);
                    const pct = attainmentPct(actual, target);
                    return (
                      <>
                        <div className={`font-bold text-xs ${attColorLight(pct)}`}>{formatCurrency(actual, true)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(target, true)} tgt</div>
                        <div className={`text-[11px] font-bold mt-0.5 ${attColorLight(pct)}`}>{pct}%</div>
                      </>
                    );
                  })()}
                </td>
                <td className="px-4 py-3.5 text-center border-l border-emerald-200 bg-emerald-50/40">
                  {(() => {
                      const actual = erEnClients.reduce((sum, client) => sum + clientActualTotal(client), 0);
                    return (
                      <>
                        <div className="font-bold text-xs text-emerald-700">{formatCurrency(actual, true)}</div>
                          <div className="text-[11px] text-emerald-600 mt-0.5">actual total</div>
                      </>
                    );
                  })()}
                </td>
                <td className="px-4 py-3.5 text-center border-l border-gray-200">
                  {(() => {
                    const target = erEnClients.reduce((sum, client) => sum + clientManualTotal(client).target, 0);
                      const actual = erEnClients.reduce((sum, client) => sum + clientActualTotal(client), 0);
                    const variance = actual - target;
                    return (
                      <>
                        <div className={`font-bold text-xs ${varianceClass(variance)}`}>{formatVariance(variance)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">vs {formatCurrency(target, true)}</div>
                      </>
                    );
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeMode === "nn" && (
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="text-sm font-semibold text-amber-700">NN Revenue by Client</div>
            <p className="mt-2 text-xs text-amber-800">Maintain NN clients and targets in Client Input. This product view is display-only.</p>
          </div>

          {nnClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No NN clients yet for {productTab}</p>
              <p className="text-xs mt-1">Add NN clients in Client Input to start tracking net new revenue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-gray-400 font-semibold uppercase tracking-wider text-[11px]" style={{ width: 220 }}>Client</th>
                    {QUARTER_ORDER.map((quarter) => {
                      const qc = QUARTER_COLORS[quarter];
                      return (
                        <th key={`nn-${quarter}`} colSpan={2} className={`text-center py-3 font-bold uppercase tracking-wider text-[11px] ${qc.leftBorder} ${qc.header} ${qc.headerBg}`}>
                          <span className="inline-flex items-center justify-center gap-1.5 px-2">
                            {quarter}
                            {isCurrent(quarter) && <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">Live</span>}
                          </span>
                        </th>
                      );
                    })}
                    <th className="text-center py-3 px-4 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-l-2 border-gray-200">NN Total</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-l border-gray-200">Variance</th>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="px-5 py-2 text-left text-[11px] text-gray-400 font-medium">Category</th>
                    {QUARTER_ORDER.map((quarter) => {
                      const qc = QUARTER_COLORS[quarter];
                      return (
                        <>
                          <th key={`nn-${quarter}-t`} className={`px-3 py-2 text-center font-semibold text-[11px] ${qc.leftBorder} text-amber-700 ${qc.subBg}`}>NN Tgt</th>
                          <th key={`nn-${quarter}-a`} className={`px-3 py-2 text-center font-semibold text-[11px] text-amber-700 ${qc.subBg}`}>NN Act</th>
                        </>
                      );
                    })}
                    <th className="px-4 py-2 text-center text-[11px] text-gray-400 font-semibold border-l-2 border-gray-200">Act / Tgt</th>
                    <th className="px-4 py-2 text-center text-[11px] text-gray-400 font-semibold border-l border-gray-200">vs Target</th>
                  </tr>
                </thead>
                <tbody>
                  {nnClients.map((client) => {
                    const total = nnClientTotal(client);
                    return (
                      <tr key={`nn-${client.id}`} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-bold text-gray-800 text-xs">{client.name}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{client.industry}</div>
                          <div className="text-[11px] text-gray-400">CSM: {client.csm}</div>
                          <div className="text-[11px] text-gray-400">AM: {client.am}</div>
                        </td>
                        {QUARTER_ORDER.map((quarter) => {
                          const data = client[quarterKey(quarter)];
                          const qc = QUARTER_COLORS[quarter];
                          return (
                            <>
                              <td key={`${client.id}-${quarter}-nn-t`} className={`px-3 py-3 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                                <span className="font-medium text-amber-700">{formatCurrency(data.nnTarget, true)}</span>
                              </td>
                              <td key={`${client.id}-${quarter}-nn-a`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                                {data.nnActual !== null ? <span className="font-bold text-amber-700">{formatCurrency(data.nnActual, true)}</span> : <span className="text-gray-300">-</span>}
                              </td>
                            </>
                          );
                        })}
                        <td className="px-4 py-3 text-center border-l-2 border-gray-100">
                          <div className={`font-bold text-xs ${attColorLight(total.pct)}`}>{formatCurrency(total.actual, true)}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(total.target, true)} tgt</div>
                          <div className={`text-[11px] font-bold mt-0.5 ${attColorLight(total.pct)}`}>{total.pct}%</div>
                        </td>
                        <td className="px-4 py-3 text-center border-l border-gray-100">
                          <div className={`font-bold text-xs ${varianceClass(total.variance)}`}>{formatVariance(total.variance)}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">vs {formatCurrency(total.target, true)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-3.5">
                      <span className="text-gray-700 font-bold text-xs uppercase tracking-wider">Total ({nnClients.length} clients)</span>
                    </td>
                    {grandNnTotals().map(({ quarter, target, actual, variance }) => {
                      const qc = QUARTER_COLORS[quarter];
                      return (
                        <td key={`nn-total-${quarter}`} colSpan={2} className={`px-3 py-3.5 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                          <div className="text-[11px] font-semibold text-gray-600">{formatCurrency(target, true)} target</div>
                          <div className={`text-[11px] font-bold mt-0.5 ${qc.totalActual}`}>{formatCurrency(actual, true)} actual</div>
                          <div className={`text-[11px] font-bold mt-0.5 ${varianceClass(variance)}`}>{formatVariance(variance)} variance</div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3.5 text-center border-l-2 border-gray-200">
                      {(() => {
                        const target = nnClients.reduce((sum, client) => sum + nnClientTotal(client).target, 0);
                        const actual = nnClients.reduce((sum, client) => sum + nnClientTotal(client).actual, 0);
                        const pct = attainmentPct(actual, target);
                        return (
                          <>
                            <div className={`font-bold text-xs ${attColorLight(pct)}`}>{formatCurrency(actual, true)}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(target, true)} tgt</div>
                            <div className={`text-[11px] font-bold mt-0.5 ${attColorLight(pct)}`}>{pct}%</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-center border-l border-gray-200">
                      {(() => {
                        const target = nnClients.reduce((sum, client) => sum + nnClientTotal(client).target, 0);
                        const actual = nnClients.reduce((sum, client) => sum + nnClientTotal(client).actual, 0);
                        const variance = actual - target;
                        return (
                          <>
                            <div className={`font-bold text-xs ${varianceClass(variance)}`}>{formatVariance(variance)}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">vs {formatCurrency(target, true)}</div>
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
