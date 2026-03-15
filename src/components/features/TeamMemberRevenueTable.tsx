import { useState, useEffect } from "react";
import { Users, Search, ChevronDown, ChevronRight, UserCircle2 } from "lucide-react";
import { ClientExpansion } from "@/types/tracker";
import { formatCurrency, attainmentPct } from "@/lib/formatters";

const QUARTER_COLORS: Record<string, {
  header: string; headerBg: string; subBg: string; cellBg: string;
  leftBorder: string; totalActual: string;
}> = {
  Q1: { header: "text-sky-700",     headerBg: "bg-sky-50",     subBg: "bg-sky-50/60",    cellBg: "bg-sky-50/30",    leftBorder: "border-l-2 border-sky-300",    totalActual: "text-sky-700"    },
  Q2: { header: "text-violet-700",  headerBg: "bg-violet-50",  subBg: "bg-violet-50/60", cellBg: "bg-violet-50/30", leftBorder: "border-l-2 border-violet-300", totalActual: "text-violet-700" },
  Q3: { header: "text-amber-700",   headerBg: "bg-amber-50",   subBg: "bg-amber-50/60",  cellBg: "bg-amber-50/30",  leftBorder: "border-l-2 border-amber-300",  totalActual: "text-amber-700"  },
  Q4: { header: "text-emerald-700", headerBg: "bg-emerald-50", subBg: "bg-emerald-50/60",cellBg: "bg-emerald-50/30",leftBorder: "border-l-2 border-emerald-300", totalActual: "text-emerald-700"},
};

const QUARTER_ORDER = ["Q1", "Q2", "Q3", "Q4"] as const;
type Q = typeof QUARTER_ORDER[number];
const CURRENT_QUARTER: Q = "Q3";
function isFuture(q: Q) { return QUARTER_ORDER.indexOf(q) > QUARTER_ORDER.indexOf(CURRENT_QUARTER); }
function isCurrent(q: Q) { return q === CURRENT_QUARTER; }

type TeamRole = "CS" | "AM" | "NB";
const ROLE_OPTIONS: TeamRole[] = ["CS", "AM", "NB"];
const ROLE_STYLE: Record<TeamRole, { bg: string; text: string; border: string; label: string }> = {
  CS: { bg: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-200",     label: "Customer Success" },
  AM: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", label: "Account Management" },
  NB: { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200",  label: "New Business" },
};

const ROLES_STORAGE_KEY = "nuro_team_roles_v1";
const NEW_BUSINESS_NAMES = new Set(["Ali", "Mark", "Russ", "Rob", "Pawan"]);
const ACCOUNT_MANAGEMENT_NAMES = new Set(["Brian", "Russ", "Pawan"]);

function hasMappedRole(name: string, role: TeamRole): boolean {
  const trimmed = name.trim();
  if (role === "NB") return NEW_BUSINESS_NAMES.has(trimmed);
  if (role === "AM") return ACCOUNT_MANAGEMENT_NAMES.has(trimmed);
  return !NEW_BUSINESS_NAMES.has(trimmed) && !ACCOUNT_MANAGEMENT_NAMES.has(trimmed);
}

function primaryMappedRole(name: string): TeamRole {
  const trimmed = name.trim();
  if (ACCOUNT_MANAGEMENT_NAMES.has(trimmed)) return "AM";
  if (NEW_BUSINESS_NAMES.has(trimmed)) return "NB";
  return "CS";
}

function loadTeamRoles(): Record<string, TeamRole> {
  try { return JSON.parse(localStorage.getItem(ROLES_STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function saveTeamRoles(roles: Record<string, TeamRole>) {
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
}

// Avatar colour palette — cycles for each CSM
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface TeamMember {
  name: string;
  clients: ClientExpansion[];
  colorCls: string;
}

interface QuarterAgg {
  erTarget: number; erActual: number;
  enTarget: number; enActual: number;
}

function aggregateForQuarter(clients: ClientExpansion[], q: Q): QuarterAgg {
  const qKey = q.toLowerCase() as "q1"|"q2"|"q3"|"q4";
  return clients.reduce((acc, c) => {
    const qd = c[qKey];
    return {
      erTarget: acc.erTarget + qd.erTarget,
      erActual: acc.erActual + (qd.erActual ?? 0),
      enTarget: acc.enTarget + qd.enTarget,
      enActual: acc.enActual + (qd.enActual ?? 0),
    };
  }, { erTarget: 0, erActual: 0, enTarget: 0, enActual: 0 });
}

interface Props {
  clients: ClientExpansion[];
  productTab: string;
  attColorLight: (pct: number) => string;
  attBarColor: (pct: number) => string;
}

export default function TeamMemberRevenueTable({ clients, productTab, attColorLight, attBarColor }: Props) {
  const [search, setSearch] = useState("");
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const [teamRoles, setTeamRoles] = useState<Record<string, TeamRole>>(() => loadTeamRoles());
  const [roleFilter, setRoleFilter] = useState<TeamRole | "All">("All");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null); // CSM name being role-edited

  useEffect(() => { saveTeamRoles(teamRoles); }, [teamRoles]);

  function assignRole(csmName: string, role: TeamRole) {
    setTeamRoles(prev => ({ ...prev, [csmName]: role }));
    setEditingRole(null);
  }
  function removeRole(csmName: string) {
    setTeamRoles(prev => { const next = { ...prev }; delete next[csmName]; return next; });
    setEditingRole(null);
  }

  const displayQuarters = QUARTER_ORDER;
  const groupingMode: TeamRole = roleFilter === "All" ? "CS" : roleFilter;

  // Group clients by the selected owner field so Account Management shows AM-tagged accounts.
  const teamMap: Record<string, ClientExpansion[]> = {};
  clients.forEach(c => {
    const key = groupingMode === "AM" ? (c.am || "Unassigned") : (c.csm || "Unassigned");
    if (!teamMap[key]) teamMap[key] = [];
    teamMap[key].push(c);
  });

  const teamMembers: TeamMember[] = Object.entries(teamMap)
    .map(([name, cls], i) => ({ name, clients: cls, colorCls: AVATAR_COLORS[i % AVATAR_COLORS.length] }))
    .filter(m => {
      const matchSearch = search === "" || m.name.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "All" || hasMappedRole(m.name, roleFilter);
      const hasActuals =
        groupingMode !== "AM" ||
        displayQuarters.some((q) => {
          const agg = aggregateForQuarter(m.clients, q);
          return agg.erActual > 0 || agg.enActual > 0;
        });
      return matchSearch && matchRole && hasActuals;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function toggleMember(name: string) {
    setExpandedMembers(prev => ({ ...prev, [name]: !prev[name] }));
  }
  function expandAll() {
    const next: Record<string, boolean> = {};
    teamMembers.forEach(m => { next[m.name] = true; });
    setExpandedMembers(next);
  }
  function collapseAll() { setExpandedMembers({}); }

  const allExpanded = teamMembers.length > 0 && teamMembers.every(m => expandedMembers[m.name]);

  // Full-year totals for a member
  function memberYTD(m: TeamMember) {
    let act = 0; let tgt = 0;
    displayQuarters.forEach(q => {
      const agg = aggregateForQuarter(m.clients, q);
      tgt += agg.erTarget + agg.enTarget;
      act += agg.erActual + agg.enActual;
    });
    return { act, tgt, pct: attainmentPct(act, tgt) };
  }

  // Grand totals (all team members visible)
  function grandTotals() {
    return displayQuarters.map(q => {
      const agg = teamMembers.reduce((acc, m) => {
        const qa = aggregateForQuarter(m.clients, q);
        return {
          erTarget: acc.erTarget + qa.erTarget,
          erActual: acc.erActual + qa.erActual,
          enTarget: acc.enTarget + qa.enTarget,
          enActual: acc.enActual + qa.enActual,
        };
      }, { erTarget: 0, erActual: 0, enTarget: 0, enActual: 0 });
      return { q, ...agg };
    });
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <UserCircle2 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No team member data available for {productTab}</p>
          <p className="text-xs mt-1">Client-level data with CSM assignments is required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex-wrap gap-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <UserCircle2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-700">Revenue by Team Member</span>
          <span className="text-[11px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {teamMembers.length} {groupingMode === "AM" ? "AMs" : groupingMode === "NB" ? "NB owners" : "CSMs"}
          </span>
          <span className="text-[11px] text-gray-400">· {clients.length} clients · ER = Existing Renewal · EN = Expansion</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {teamMembers.length > 0 && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="text-[11px] text-gray-500 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}

          {/* Role filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                roleFilter === "All"
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200"
                  : `${ROLE_STYLE[roleFilter as TeamRole].bg} ${ROLE_STYLE[roleFilter as TeamRole].text} ${ROLE_STYLE[roleFilter as TeamRole].border}`
              }`}
            >
              {roleFilter === "All" ? "All Teams" : `${roleFilter} — ${ROLE_STYLE[roleFilter as TeamRole].label}`}
              <ChevronDown className="w-3 h-3" />
            </button>
            {roleDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-52">
                <button
                  onClick={() => { setRoleFilter("All"); setRoleDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors ${
                    roleFilter === "All" ? "bg-gray-100 text-gray-800" : "text-gray-600"
                  }`}
                >
                  All Teams
                </button>
                {ROLE_OPTIONS.map(role => (
                  <button
                    key={role}
                    onClick={() => { setRoleFilter(role); setRoleDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                      roleFilter === role ? `${ROLE_STYLE[role].bg} ${ROLE_STYLE[role].text}` : "text-gray-600"
                    }`}
                  >
                    <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold ${ROLE_STYLE[role].bg} ${ROLE_STYLE[role].text} border ${ROLE_STYLE[role].border}`}>{role}</span>
                    {ROLE_STYLE[role].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team member…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 w-44"
            />
          </div>
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Search className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No {groupingMode === "AM" ? "account managers" : groupingMode === "NB" ? "new business owners" : "team members"} match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-400 font-semibold uppercase tracking-wider text-[11px]" style={{ width: 220 }}>
                  Team Member
                </th>
                {displayQuarters.map(q => {
                  const qc = QUARTER_COLORS[q];
                  return (
                    <th key={q} colSpan={4} className={`text-center py-3 font-bold uppercase tracking-wider text-[11px] ${qc.leftBorder} ${qc.header} ${qc.headerBg}`}>
                      <span className="inline-flex items-center justify-center gap-1.5 px-2">
                        {q}
                        {isCurrent(q) && (
                          <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">Live</span>
                        )}
                      </span>
                    </th>
                  );
                })}
                <th className="text-center py-3 px-4 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-l-2 border-gray-200">Total</th>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-5 py-2 text-left text-[11px] text-gray-400 font-medium">Clients</th>
                {displayQuarters.map(q => {
                  const qc = QUARTER_COLORS[q];
                  return (
                    <>
                      <th key={`${q}-er-t`} className={`px-3 py-2 text-center font-semibold text-[11px] ${qc.leftBorder} text-sky-600 ${qc.subBg}`}>ER Tgt</th>
                      <th key={`${q}-er-a`} className={`px-3 py-2 text-center font-semibold text-[11px] text-sky-600 ${qc.subBg}`}>ER Act</th>
                      <th key={`${q}-en-t`} className={`px-3 py-2 text-center font-semibold text-[11px] text-violet-600 ${qc.subBg}`}>EN Tgt</th>
                      <th key={`${q}-en-a`} className={`px-3 py-2 text-center font-semibold text-[11px] text-violet-600 ${qc.subBg}`}>EN Act</th>
                    </>
                  );
                })}
                <th className="px-4 py-2 text-center text-[11px] text-gray-400 font-semibold border-l-2 border-gray-200">Act / Tgt</th>
              </tr>
            </thead>

            <tbody>
              {teamMembers.map(member => {
                const isExpanded = !!expandedMembers[member.name];
                const ytd = memberYTD(member);
                const ytdColor = attColorLight(ytd.pct);

                return (
                  <>
                    {/* Team member summary row */}
                    <tr
                      key={`${member.name}-header`}
                      className="border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer transition-colors bg-white"
                      onClick={() => toggleMember(member.name)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <button className={`w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 shrink-0 transition-colors mt-0.5 ${isExpanded ? "bg-violet-100 text-violet-600" : "bg-gray-100"}`}>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${member.colorCls}`}>
                            {initials(member.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 text-xs">{member.name}</span>
                              {/* Role badge + assignment picker */}
                              <div className="relative" onClick={e => e.stopPropagation()}>
                                {(teamRoles[member.name] ?? primaryMappedRole(member.name)) ? (
                                  <button
                                    onClick={() => setEditingRole(editingRole === member.name ? null : member.name)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors hover:opacity-80 ${ROLE_STYLE[teamRoles[member.name] ?? primaryMappedRole(member.name)].bg} ${ROLE_STYLE[teamRoles[member.name] ?? primaryMappedRole(member.name)].text} ${ROLE_STYLE[teamRoles[member.name] ?? primaryMappedRole(member.name)].border}`}
                                    title="Click to change role"
                                  >
                                    {teamRoles[member.name] ?? primaryMappedRole(member.name)}
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingRole(editingRole === member.name ? null : member.name)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200 transition-colors"
                                    title="Assign role"
                                  >
                                    + Role
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                {editingRole === member.name && (
                                  <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-48">
                                    {ROLE_OPTIONS.map(role => (
                                      <button
                                        key={role}
                                        onClick={() => assignRole(member.name, role)}
                                        className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                                          (teamRoles[member.name] ?? primaryMappedRole(member.name)) === role ? `${ROLE_STYLE[role].bg} ${ROLE_STYLE[role].text}` : "text-gray-700"
                                        }`}
                                      >
                                        <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold ${ROLE_STYLE[role].bg} ${ROLE_STYLE[role].text} border ${ROLE_STYLE[role].border}`}>{role}</span>
                                        {ROLE_STYLE[role].label}
                                      </button>
                                    ))}
                                    {(teamRoles[member.name] ?? primaryMappedRole(member.name)) && (
                                      <button
                                        onClick={() => removeRole(member.name)}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors border-t border-gray-100"
                                      >
                                        Remove role
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {member.clients.length} client{member.clients.length !== 1 ? "s" : ""}
                              {" · "}
                              {[...new Set(member.clients.map(c => (c as any).am).filter(Boolean))].slice(0, 1).map((am: string) => `AM: ${am}`).join(", ")}
                            </div>
                          </div>
                        </div>
                      </td>

                      {displayQuarters.map(q => {
                        const qc = QUARTER_COLORS[q];
                        const agg = aggregateForQuarter(member.clients, q);
                        const erPct = attainmentPct(agg.erActual, agg.erTarget);
                        const enPct = attainmentPct(agg.enActual, agg.enTarget);
                        const totalTgt = agg.erTarget + agg.enTarget;
                        const totalAct = agg.erActual + agg.enActual;
                        const totalPct = attainmentPct(totalAct, totalTgt);

                        return (
                          <>
                            <td key={`${q}-ert`} className={`px-3 py-3 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                              <span className="text-sky-600 font-medium">{formatCurrency(agg.erTarget, true)}</span>
                            </td>
                            <td key={`${q}-era`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                              <span className={`font-bold ${attColorLight(erPct)}`}>{formatCurrency(agg.erActual, true)}</span>
                              <div className={`text-[10px] font-semibold mt-0.5 ${attColorLight(erPct)}`}>{erPct}%</div>
                            </td>
                            <td key={`${q}-ent`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                              <span className="text-violet-600 font-medium">{formatCurrency(agg.enTarget, true)}</span>
                            </td>
                            <td key={`${q}-ena`} className={`px-3 py-3 text-center ${qc.cellBg}`}>
                              <span className={`font-bold ${attColorLight(enPct)}`}>{formatCurrency(agg.enActual, true)}</span>
                              <div className={`text-[10px] font-semibold mt-0.5 ${attColorLight(enPct)}`}>{enPct}%</div>
                            </td>
                          </>
                        );
                      })}

                      {/* Total */}
                      <td className="px-4 py-3 text-center border-l-2 border-gray-100">
                        <div className={`font-bold text-xs ${ytdColor}`}>{formatCurrency(ytd.act, true)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(ytd.tgt, true)} tgt</div>
                        <div className={`text-[11px] font-bold mt-0.5 ${ytdColor}`}>{ytd.pct}%</div>
                        {/* Progress bar */}
                        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto mt-1">
                          <div className={`h-full rounded-full ${attBarColor(ytd.pct)}`} style={{ width: `${Math.min(ytd.pct, 100)}%` }} />
                        </div>
                      </td>
                    </tr>

                    {/* Expanded: per-client rows */}
                    {isExpanded && member.clients.map(client => {
                      return (
                        <tr key={`${member.name}-${client.id}`} className="border-b border-gray-50 bg-gray-50/30 hover:bg-gray-50/60 transition-colors">
                          <td className="pl-14 pr-5 py-2.5">
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                              <div>
                                <div className="font-semibold text-gray-700 text-[11px]">{client.name}</div>
                                <div className="text-[10px] text-gray-400">{client.industry}</div>
                              </div>
                            </div>
                          </td>
                          {displayQuarters.map(q => {
                            const qKey = q.toLowerCase() as "q1"|"q2"|"q3"|"q4";
                            const qd = client[qKey];
                            const qc = QUARTER_COLORS[q];
                            const erPct = qd.erActual !== null ? attainmentPct(qd.erActual, qd.erTarget) : null;
                            const enPct = qd.enActual !== null ? attainmentPct(qd.enActual, qd.enTarget) : null;
                            return (
                              <>
                                <td key={`${q}-ert`} className={`px-3 py-2.5 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                                  <span className="text-sky-600 text-[11px]">{formatCurrency(qd.erTarget, true)}</span>
                                </td>
                                <td key={`${q}-era`} className={`px-3 py-2.5 text-center ${qc.cellBg}`}>
                                  {qd.erActual !== null
                                    ? <><span className={`font-semibold text-[11px] ${erPct !== null ? attColorLight(erPct) : "text-gray-600"}`}>{formatCurrency(qd.erActual, true)}</span>
                                        {erPct !== null && <div className={`text-[10px] ${attColorLight(erPct)}`}>{erPct}%</div>}</>
                                    : <span className="text-gray-300 text-[11px]">—</span>
                                  }
                                </td>
                                <td key={`${q}-ent`} className={`px-3 py-2.5 text-center ${qc.cellBg}`}>
                                  <span className="text-violet-600 text-[11px]">{formatCurrency(qd.enTarget, true)}</span>
                                </td>
                                <td key={`${q}-ena`} className={`px-3 py-2.5 text-center ${qc.cellBg}`}>
                                  {qd.enActual !== null
                                    ? <><span className={`font-semibold text-[11px] ${enPct !== null ? attColorLight(enPct) : "text-gray-600"}`}>{formatCurrency(qd.enActual, true)}</span>
                                        {enPct !== null && <div className={`text-[10px] ${attColorLight(enPct)}`}>{enPct}%</div>}</>
                                    : <span className="text-gray-300 text-[11px]">—</span>
                                  }
                                </td>
                              </>
                            );
                          })}
                          <td className="px-4 py-2.5 text-center border-l-2 border-gray-100">
                            {(() => {
                              const act = displayQuarters.reduce((s, q) => {
                                const qd = client[q.toLowerCase() as "q1"|"q2"|"q3"|"q4"];
                                return s + (qd.erActual ?? 0) + (qd.enActual ?? 0);
                              }, 0);
                              const tgt = displayQuarters.reduce((s, q) => {
                                const qd = client[q.toLowerCase() as "q1"|"q2"|"q3"|"q4"];
                                return s + qd.erTarget + qd.enTarget;
                              }, 0);
                              const pct = attainmentPct(act, tgt);
                              return (
                                <>
                                  <div className={`font-semibold text-[11px] ${attColorLight(pct)}`}>{formatCurrency(act, true)}</div>
                                  <div className="text-[10px] text-gray-400">{formatCurrency(tgt, true)} tgt</div>
                                  <div className={`text-[10px] font-bold ${attColorLight(pct)}`}>{pct}%</div>
                                </>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}
            </tbody>

            {/* Grand total footer */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3.5">
                  <span className="text-gray-700 font-bold text-xs uppercase tracking-wider">
                    Total ({teamMembers.length} CSM{teamMembers.length !== 1 ? "s" : ""})
                  </span>
                </td>
                {grandTotals().map(({ q, erTarget, erActual, enTarget, enActual }) => {
                  const qc = QUARTER_COLORS[q];
                  const erPct = attainmentPct(erActual, erTarget);
                  const enPct = attainmentPct(enActual, enTarget);
                  return (
                    <>
                      <td key={`tot-${q}-ert`} className={`px-3 py-3.5 text-center ${qc.leftBorder} ${qc.cellBg}`}>
                        <span className="font-semibold text-sky-700">{formatCurrency(erTarget, true)}</span>
                      </td>
                      <td key={`tot-${q}-era`} className={`px-3 py-3.5 text-center ${qc.cellBg}`}>
                        <div className={`font-bold text-xs ${qc.totalActual}`}>{formatCurrency(erActual, true)}</div>
                        <div className={`text-[10px] font-semibold ${attColorLight(erPct)}`}>{erPct}%</div>
                      </td>
                      <td key={`tot-${q}-ent`} className={`px-3 py-3.5 text-center ${qc.cellBg}`}>
                        <span className="font-semibold text-violet-700">{formatCurrency(enTarget, true)}</span>
                      </td>
                      <td key={`tot-${q}-ena`} className={`px-3 py-3.5 text-center ${qc.cellBg}`}>
                        <div className={`font-bold text-xs ${qc.totalActual}`}>{formatCurrency(enActual, true)}</div>
                        <div className={`text-[10px] font-semibold ${attColorLight(enPct)}`}>{enPct}%</div>
                      </td>
                    </>
                  );
                })}
                <td className="px-4 py-3.5 text-center border-l-2 border-gray-200">
                  {(() => {
                    let gAct = 0; let gTgt = 0;
                    teamMembers.forEach(m => {
                      displayQuarters.forEach(q => {
                        const agg = aggregateForQuarter(m.clients, q);
                        gAct += agg.erActual + agg.enActual;
                        gTgt += agg.erTarget + agg.enTarget;
                      });
                    });
                    const gPct = attainmentPct(gAct, gTgt);
                    return (
                      <>
                        <div className={`font-bold text-xs ${attColorLight(gPct)}`}>{formatCurrency(gAct, true)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(gTgt, true)} tgt</div>
                        <div className={`text-[11px] font-bold mt-0.5 ${attColorLight(gPct)}`}>{gPct}%</div>
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
  );
}
