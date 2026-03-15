import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  InputStore, Month, ClientMonthData, ClientRecord, Product,
  PRODUCTS, MONTHS, FY_MONTHS, QUARTERS, QUARTER_MONTHS,
  loadStore, saveStore, createEmptyStore, loadLastSaved, emptyClientMonth, recalculateProductMonthlyTargetsFromClients,
} from "@/lib/dataStore";
import { EXCEL_CLIENT_COUNT, ACCESS_HUB_CLIENT_COUNT, EVIDENCE_HUB_CLIENT_COUNT, overwriteAllProducts } from "@/lib/seedData";
import {
  UserPlus, Trash2, Save, CheckCircle2, Building2,
  ChevronDown, Globe2, Search, X, Plus, Info,
  Users, Package, AlertCircle, FileSpreadsheet, Settings2, LogOut,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

// ── Palette helpers ───────────────────────────────────────────────────────────
const QUARTER_STYLE: Record<"Q1"|"Q2"|"Q3"|"Q4", {
  header: string; headerBg: string; leftBorder: string; inputFocus: string; groupBg: string;
}> = {
  Q1: { header:"text-sky-700",     headerBg:"bg-sky-50",     leftBorder:"border-l-2 border-sky-300",     inputFocus:"focus:ring-sky-300",     groupBg:"bg-sky-50/40"    },
  Q2: { header:"text-violet-700",  headerBg:"bg-violet-50",  leftBorder:"border-l-2 border-violet-300",  inputFocus:"focus:ring-violet-300",  groupBg:"bg-violet-50/40" },
  Q3: { header:"text-amber-700",   headerBg:"bg-amber-50",   leftBorder:"border-l-2 border-amber-300",   inputFocus:"focus:ring-amber-300",   groupBg:"bg-amber-50/40"  },
  Q4: { header:"text-emerald-700", headerBg:"bg-emerald-50", leftBorder:"border-l-2 border-emerald-300", inputFocus:"focus:ring-emerald-300", groupBg:"bg-emerald-50/40"},
};

const PRODUCT_STYLE: Record<Product, {
  text: string; bg: string; border: string; activeBorder: string; dot: string;
}> = {
  "Nuro":         { text:"text-violet-700", bg:"bg-violet-50",  border:"border-violet-200", activeBorder:"border-violet-600", dot:"bg-violet-500" },
  "Access Hub":   { text:"text-cyan-700",   bg:"bg-cyan-50",    border:"border-cyan-200",   activeBorder:"border-cyan-600",   dot:"bg-cyan-500"   },
  "Evidence Hub": { text:"text-indigo-700", bg:"bg-indigo-50",  border:"border-indigo-200", activeBorder:"border-indigo-600", dot:"bg-indigo-500" },
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",   "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",     "bg-indigo-100 text-indigo-700",
  "bg-cyan-100 text-cyan-700",     "bg-orange-100 text-orange-700",
];

const CALENDAR_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];
const START_YEARS = [2023, 2024, 2025, 2026, 2027];

function initials(name: string) {
  return name.trim().split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function fmt(v: number | null): string {
  if (v === null || v === 0) return "";
  return (v / 1_000).toFixed(2);
}
function parse(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 1_000);
}
function fmtM(v: number) {
  if (v === 0) return "—";
  return `£${(v / 1_000).toFixed(1)}K`;
}
function fmtCurrencyWhole(v: number) {
  if (v === 0) return "—";
  return `£${Math.round(v).toLocaleString("en-GB")}`;
}
function parseAnnual(s: string): number | null {
  const n = parseFloat(s);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 1_000);
}

const NN_PREFIX = "Net New - ";

function isNnSalespersonClient(name: string) {
  return name.startsWith(NN_PREFIX);
}

function nnSalespersonName(name: string) {
  return name.startsWith(NN_PREFIX) ? name.slice(NN_PREFIX.length) : name;
}

// ── Compact number cell ───────────────────────────────────────────────────────
interface NumCellProps {
  value: number | null;
  onChange: (v: number | null) => void;
  focusCls: string;
  isActual?: boolean;
}
function NumCell({ value, onChange, focusCls, isActual }: NumCellProps) {
  const [local, setLocal] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(fmt(value)); }, [value, focused]);
  return (
    <div className="relative">
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-gray-400 pointer-events-none">£</span>
      <input
        type="number" step="1" min="0"
        value={focused ? local : fmt(value)}
        placeholder="—"
        onFocus={() => { setFocused(true); setLocal(fmt(value)); }}
        onBlur={() => { setFocused(false); onChange(parse(local)); }}
        onChange={e => setLocal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className={`w-full pl-4 pr-4 py-1 text-[11px] rounded border transition-all outline-none
          ${isActual ? "bg-white border-gray-200 text-gray-700 font-medium" : "bg-gray-50 border-gray-200 text-gray-600"}
          focus:ring-2 ${focusCls} focus:border-transparent placeholder:text-gray-300`}
      />
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">K</span>
    </div>
  );
}

interface AbsoluteNumCellProps {
  value: number | null;
  onChange: (v: number | null) => void;
  focusCls: string;
}
function AbsoluteNumCell({ value, onChange, focusCls }: AbsoluteNumCellProps) {
  const [local, setLocal] = useState(value === null || value === 0 ? "" : String(Math.round(value)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setLocal(value === null || value === 0 ? "" : String(Math.round(value)));
    }
  }, [value, focused]);

  return (
    <div className="relative">
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-gray-400 pointer-events-none">£</span>
      <input
        type="number" step="1" min="0"
        value={local}
        placeholder="—"
        onFocus={() => {
          setFocused(true);
          setLocal(value === null || value === 0 ? "" : String(Math.round(value)));
        }}
        onBlur={() => {
          setFocused(false);
          const n = parseFloat(local.replace(/[^0-9.]/g, ""));
          onChange(Number.isNaN(n) || n < 0 ? null : Math.round(n));
        }}
        onChange={e => setLocal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className={`w-full pl-4 pr-2 py-1 text-[11px] rounded border transition-all outline-none bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 ${focusCls} focus:border-transparent placeholder:text-gray-300`}
      />
    </div>
  );
}

// ── Per-product monthly ER/EN grid ────────────────────────────────────────────
interface ClientProductGridProps {
  product: Product;
  record: ClientRecord;
  onUpdate: (month: Month, key: keyof ClientMonthData, val: number | null) => void;
}
function ClientProductGrid({ product, record, onUpdate }: ClientProductGridProps) {
  const ROWS: { key: keyof ClientMonthData; label: string; color: string; isActual: boolean }[] = [
    { key:"erTarget", label:"ER Target",  color:"text-sky-700",    isActual:false },
    { key:"erActual", label:"ER Actual",  color:"text-sky-600",    isActual:true  },
    { key:"enTarget", label:"EN Target",  color:"text-violet-700", isActual:false },
    { key:"enActual", label:"EN Actual",  color:"text-violet-600", isActual:true  },
  ];

  function quarterTotal(q: "Q1"|"Q2"|"Q3"|"Q4", key: keyof ClientMonthData) {
    return QUARTER_MONTHS[q].reduce((s, m) => s + (record.months[m]?.[key] ?? 0), 0);
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="text-xs" style={{ minWidth: 1200 }}>
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider text-[11px] sticky left-0 bg-gray-50 z-10 border-r border-gray-100" style={{ width:140 }}>
              Category
            </th>
            {QUARTERS.map(q => {
              const qs = QUARTER_STYLE[q];
              return (
                <th key={q} colSpan={3} className={`text-center py-2.5 font-bold uppercase tracking-wider text-[11px] ${qs.leftBorder} ${qs.header} ${qs.headerBg}`}>
                  {q} — {QUARTER_MONTHS[q].join(" / ")}
                </th>
              );
            })}
            <th className="px-3 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider border-l-2 border-gray-200 bg-gray-50">
              Annual
            </th>
          </tr>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="sticky left-0 bg-gray-50 border-r border-gray-100 px-4 py-1.5" />
            {QUARTERS.map(q => {
              const qs = QUARTER_STYLE[q];
              return QUARTER_MONTHS[q].map((m, mi) => (
                <th key={m} className={`px-2 py-1.5 text-center font-bold text-[11px] uppercase tracking-wider ${qs.header} ${qs.headerBg} ${mi === 0 ? qs.leftBorder : ""}`} style={{ width:88 }}>
                  {m}
                </th>
              ));
            })}
            <th className="border-l-2 border-gray-200 bg-gray-50" />
          </tr>
        </thead>
        <tbody>
          <tr className="bg-sky-50/30 border-b border-sky-100">
            <td colSpan={14} className="px-4 py-1.5 sticky left-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-[11px] font-bold text-sky-700">ER — Existing Renewal</span>
              </div>
            </td>
          </tr>
          {ROWS.filter(r => r.key.startsWith("er")).map(row => (
            <tr key={row.key} className={`border-b border-gray-50 hover:bg-gray-50/30 ${row.isActual ? "bg-white" : "bg-gray-50/20"}`}>
              <td className="px-4 py-1.5 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                <div className="flex items-center gap-1.5 pl-4">
                  <span className={`text-[11px] font-semibold ${row.color}`}>{row.label}</span>
                </div>
              </td>
              {QUARTERS.map(q => {
                const qs = QUARTER_STYLE[q];
                return QUARTER_MONTHS[q].map((m, mi) => (
                  <td key={m} className={`px-2 py-1.5 ${mi === 0 ? qs.leftBorder : ""} ${qs.groupBg}`}>
                    <NumCell value={record.months[m]?.[row.key] ?? null} onChange={v => onUpdate(m, row.key, v)} focusCls={qs.inputFocus} isActual={row.isActual} />
                  </td>
                ));
              })}
              <td className="px-3 py-1.5 text-center border-l-2 border-gray-200 bg-gray-50">
                {(() => {
                  const total = MONTHS.reduce((s, m) => s + (record.months[m]?.[row.key] ?? 0), 0);
                  return <span className={`text-[11px] font-semibold ${row.color}`}>{total > 0 ? fmtM(total) : "—"}</span>;
                })()}
              </td>
            </tr>
          ))}
          <tr className="bg-violet-50/30 border-b border-violet-100">
            <td colSpan={14} className="px-4 py-1.5 sticky left-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-[11px] font-bold text-violet-700">EN — Expansion</span>
              </div>
            </td>
          </tr>
          {ROWS.filter(r => r.key.startsWith("en")).map(row => (
            <tr key={row.key} className={`border-b border-gray-50 hover:bg-gray-50/30 ${row.isActual ? "bg-white" : "bg-gray-50/20"}`}>
              <td className="px-4 py-1.5 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                <div className="flex items-center gap-1.5 pl-4">
                  <span className={`text-[11px] font-semibold ${row.color}`}>{row.label}</span>
                </div>
              </td>
              {QUARTERS.map(q => {
                const qs = QUARTER_STYLE[q];
                return QUARTER_MONTHS[q].map((m, mi) => (
                  <td key={m} className={`px-2 py-1.5 ${mi === 0 ? qs.leftBorder : ""} ${qs.groupBg}`}>
                    <NumCell value={record.months[m]?.[row.key] ?? null} onChange={v => onUpdate(m, row.key, v)} focusCls={qs.inputFocus} isActual={row.isActual} />
                  </td>
                ));
              })}
              <td className="px-3 py-1.5 text-center border-l-2 border-gray-200 bg-gray-50">
                {(() => {
                  const total = MONTHS.reduce((s, m) => s + (record.months[m]?.[row.key] ?? 0), 0);
                  return <span className={`text-[11px] font-semibold ${row.color}`}>{total > 0 ? fmtM(total) : "—"}</span>;
                })()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-gray-50 border-r border-gray-100">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Q Total</span>
            </td>
            {QUARTERS.map(q => {
              const qs = QUARTER_STYLE[q];
              const erTgt = quarterTotal(q, "erTarget");
              const enTgt = quarterTotal(q, "enTarget");
              const erAct = quarterTotal(q, "erActual");
              const enAct = quarterTotal(q, "enActual");
              return QUARTER_MONTHS[q].map((m, mi) =>
                mi === 0 ? (
                  <td key={m} colSpan={3} className={`px-3 py-2 text-center ${qs.leftBorder} ${qs.headerBg}`}>
                    <div className={`text-[11px] font-bold ${qs.header}`}>{fmtM(erTgt + enTgt)}</div>
                    <div className="text-[10px] text-gray-400">ER {fmtM(erTgt)} · EN {fmtM(enTgt)}</div>
                    {(erAct + enAct) > 0 && <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Act {fmtM(erAct + enAct)}</div>}
                  </td>
                ) : null
              );
            })}
            <td className="px-3 py-2 text-center border-l-2 border-gray-200 bg-gray-50">
              {(() => {
                const total = MONTHS.reduce((s, m) => {
                  const cm = record.months[m];
                  return s + (cm?.erTarget ?? 0) + (cm?.enTarget ?? 0);
                }, 0);
                return <div className="text-[11px] font-bold text-gray-700">{fmtM(total)}</div>;
              })()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Annual target input ───────────────────────────────────────────────────────
interface AnnualTargetInputProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  focusColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}
function AnnualTargetInput({ label, value, onChange, focusColor, bgColor, borderColor, textColor }: AnnualTargetInputProps) {
  const [local, setLocal] = useState(value !== null ? (value / 1_000).toFixed(2) : "");
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setLocal(value !== null ? (value / 1_000).toFixed(2) : "");
  }, [value, focused]);
  return (
    <div className="flex items-center gap-2">
      <label className={`text-[11px] uppercase tracking-wider font-bold shrink-0 ${textColor}`}>{label} Target</label>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400">£</span>
        <input
          type="number" step="0.01" min="0"
          value={focused ? local : (value !== null ? (value / 1_000).toFixed(2) : "")}
          placeholder="Annual (£K)"
          onFocus={() => { setFocused(true); setLocal(value !== null ? (value / 1_000).toFixed(2) : ""); }}
          onBlur={() => { setFocused(false); onChange(parseAnnual(local)); }}
          onChange={e => setLocal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className={`text-xs border rounded-lg pl-5 pr-7 py-1.5 focus:outline-none focus:ring-2 ${focusColor} focus:border-transparent w-36 ${bgColor} ${borderColor}`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">K</span>
      </div>
    </div>
  );
}

// ── Add Client Modal ──────────────────────────────────────────────────────────
interface AddClientModalProps {
  onAdd: (name: string, erTarget: number | null, enTarget: number | null, csm: string, am: string, startMonth: string | null, startYear: number | null, products: Product[]) => void;
  onClose: () => void;
  existingNames: string[];
}
function AddClientModal({ onAdd, onClose, existingNames }: AddClientModalProps) {
  const [name, setName]               = useState("");
  const [erTargetStr, setErTargetStr] = useState("");
  const [enTargetStr, setEnTargetStr] = useState("");
  const [csm, setCsm]                 = useState("");
  const [am, setAm]                   = useState("");
  const [startMonth, setStartMonth]   = useState<string | null>(null);
  const [startYear, setStartYear]     = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(["Nuro"]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function toggleProduct(p: Product) {
    setSelectedProducts(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  const canSubmit = name.trim() !== "" && csm.trim() !== "" && am.trim() !== "" && selectedProducts.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    const trimmed = name.trim();
    if (existingNames.map(n => n.toLowerCase()).includes(trimmed.toLowerCase())) {
      alert("A client with this name already exists.");
      return;
    }
    const erT = erTargetStr.trim() !== "" ? parseAnnual(erTargetStr) : null;
    const enT = enTargetStr.trim() !== "" ? parseAnnual(enTargetStr) : null;
    onAdd(trimmed, erT, enT, csm.trim(), am.trim(), startMonth, startYear, selectedProducts);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-white font-bold text-sm">Add New Client</h2>
            <p className="text-white/60 text-xs mt-0.5">Enter client details and assign products</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
              placeholder="e.g. Waymo"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
            />
          </div>

          {/* Start Month / Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
                Start Month <span className="text-gray-400 font-normal text-[10px] normal-case">(optional)</span>
              </label>
              <select
                value={startMonth ?? ""}
                onChange={e => setStartMonth(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-indigo-700"
              >
                <option value="">— Month —</option>
                {CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
                Start Year <span className="text-gray-400 font-normal text-[10px] normal-case">(optional)</span>
              </label>
              <select
                value={startYear ?? ""}
                onChange={e => setStartYear(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-indigo-700"
              >
                <option value="">— Year —</option>
                {START_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Annual ER / EN Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-sky-600 uppercase tracking-wider mb-1.5">
                Annual ER Target <span className="text-gray-400 font-normal text-[10px] normal-case">(£K, optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">£</span>
                <input
                  type="number" step="0.01" min="0"
                  value={erTargetStr}
                  onChange={e => setErTargetStr(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full pl-6 pr-8 py-2 text-sm border border-sky-200 rounded-lg bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">K</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-1.5">
                Annual EN Target <span className="text-gray-400 font-normal text-[10px] normal-case">(£K, optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">£</span>
                <input
                  type="number" step="0.01" min="0"
                  value={enTargetStr}
                  onChange={e => setEnTargetStr(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full pl-6 pr-8 py-2 text-sm border border-violet-200 rounded-lg bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">K</span>
              </div>
            </div>
          </div>

          {/* CSM + AM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                CSM <span className="text-rose-500">*</span>
                <span className="text-gray-400 font-normal ml-1 normal-case text-[10px]">Customer Success</span>
              </label>
              <input
                value={csm}
                onChange={e => setCsm(e.target.value)}
                placeholder="e.g. Sarah Chen"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent ${
                  csm.trim() === "" ? "border-rose-200" : "border-gray-200"
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                AM <span className="text-rose-500">*</span>
                <span className="text-gray-400 font-normal ml-1 normal-case text-[10px]">Account Manager</span>
              </label>
              <input
                value={am}
                onChange={e => setAm(e.target.value)}
                placeholder="e.g. James Park"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent ${
                  am.trim() === "" ? "border-rose-200" : "border-gray-200"
                }`}
              />
            </div>
          </div>
          {(!csm.trim() || !am.trim()) && name.trim() && (
            <p className="text-[11px] text-rose-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> CSM and AM are required fields
            </p>
          )}

          {/* Products */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Products <span className="text-rose-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.map(p => {
                const ps = PRODUCT_STYLE[p];
                const isSelected = selectedProducts.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => toggleProduct(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected ? `${ps.bg} ${ps.text} ${ps.border} shadow-sm` : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {isSelected && <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NN Target Grid (per-product monthly NN) ───────────────────────────────────
interface NNGridProps {
  store: InputStore;
  onUpdate: (product: Product, clientName: string, month: Month, val: number | null) => void;
  onAddSalesperson: (product: Product, salesperson: string) => void;
  onRemoveSalesperson: (product: Product, clientName: string) => void;
}
function NNGrid({ store, onUpdate, onAddSalesperson, onRemoveSalesperson }: NNGridProps) {
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>(
    Object.fromEntries(PRODUCTS.map(p => [p, true]))
  );
  const [newSalespeople, setNewSalespeople] = useState<Record<Product, string>>(
    Object.fromEntries(PRODUCTS.map((p) => [p, ""])) as Record<Product, string>
  );

  function nnRows(product: Product) {
    return Object.entries(store.clients[product] ?? {})
      .filter(([name, record]) =>
        isNnSalespersonClient(name) ||
        (record.nnTarget ?? 0) > 0 ||
        MONTHS.some((month) => (record.months[month]?.nnTarget ?? 0) > 0),
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }

  function quarterNNTotal(product: Product, q: "Q1"|"Q2"|"Q3"|"Q4") {
    return nnRows(product).reduce(
      (sum, [, record]) => sum + QUARTER_MONTHS[q].reduce((inner, month) => inner + (record.months[month]?.nnTarget ?? 0), 0),
      0
    );
  }
  function annualNN(product: Product) {
    return nnRows(product).reduce(
      (sum, [, record]) => sum + MONTHS.reduce((inner, month) => inner + (record.months[month]?.nnTarget ?? 0), 0),
      0
    );
  }

  return (
    <div className="space-y-4">
      {PRODUCTS.map(product => {
        const ps = PRODUCT_STYLE[product];
        const isExpanded = expandedProducts[product];
        const annualTgt = annualNN(product);
        const rows = nnRows(product);

        return (
          <div key={product} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors text-left"
              onClick={() => setExpandedProducts(prev => ({ ...prev, [product]: !prev[product] }))}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${ps.dot}`} />
              <span className={`font-bold text-sm ${ps.text}`}>{product}</span>
              {annualTgt > 0 && (
                <span className={`text-[11px] ${ps.bg} ${ps.text} border ${ps.border} px-2 py-0.5 rounded-full font-medium`}>
                  Annual target: {fmtCurrencyWhole(annualTgt)}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
            </button>

            {isExpanded && (
              <div className="space-y-3 p-3">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2">
                  <input
                    type="text"
                    value={newSalespeople[product]}
                    onChange={(e) => setNewSalespeople((prev) => ({ ...prev, [product]: e.target.value }))}
                    placeholder="Add salesperson"
                    className="flex-1 min-w-[180px] rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <button
                    onClick={() => {
                      onAddSalesperson(product, newSalespeople[product]);
                      setNewSalespeople((prev) => ({ ...prev, [product]: "" }));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add salesperson
                  </button>
                </div>

                <div className="overflow-x-auto">
                <table className="text-xs" style={{ minWidth: 1100 }}>
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold uppercase tracking-wider text-[11px] sticky left-0 bg-gray-50 z-10 border-r border-gray-100" style={{ width:180 }}>Salesperson</th>
                      {QUARTERS.map(q => {
                        const qs = QUARTER_STYLE[q];
                        return (
                          <th key={q} colSpan={3} className={`text-center py-2 font-bold uppercase tracking-wider text-[11px] ${qs.leftBorder} ${qs.header} ${qs.headerBg}`}>
                            {q} — {QUARTER_MONTHS[q].join(" / ")}
                          </th>
                        );
                      })}
                      <th className="px-3 py-2 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider border-l-2 border-gray-200 bg-gray-50">Annual</th>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="sticky left-0 bg-gray-50 border-r border-gray-100 px-4 py-1.5" />
                      {QUARTERS.map(q => {
                        const qs = QUARTER_STYLE[q];
                        return QUARTER_MONTHS[q].map((m, mi) => (
                          <th key={m} className={`px-2 py-1.5 text-center font-bold text-[11px] uppercase ${qs.header} ${qs.headerBg} ${mi === 0 ? qs.leftBorder : ""}`} style={{ width:88 }}>{m}</th>
                        ));
                      })}
                      <th className="border-l-2 border-gray-200 bg-gray-50" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([clientName, record]) => {
                      const salesperson = nnSalespersonName(clientName);
                      const annualRowTotal = MONTHS.reduce((sum, month) => sum + (record.months[month]?.nnTarget ?? 0), 0);
                      return (
                        <tr key={`${product}-${clientName}`} className="border-b border-gray-50 hover:bg-gray-50/30 bg-amber-50/20">
                          <td className="px-4 py-1.5 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-[11px] font-semibold text-amber-700">{salesperson}</div>
                                <div className="text-[10px] text-gray-400">AM owner</div>
                              </div>
                              <button
                                onClick={() => onRemoveSalesperson(product, clientName)}
                                className="text-[10px] font-semibold text-gray-400 hover:text-rose-600 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                          {QUARTERS.map(q => {
                            const qs = QUARTER_STYLE[q];
                            return QUARTER_MONTHS[q].map((m, mi) => (
                              <td key={`${clientName}-${m}`} className={`px-2 py-1.5 ${mi === 0 ? qs.leftBorder : ""} ${qs.groupBg}`}>
                                <AbsoluteNumCell value={record.months[m]?.nnTarget ?? null} onChange={v => onUpdate(product, clientName, m, v)} focusCls={qs.inputFocus} />
                              </td>
                            ));
                          })}
                          <td className="px-3 py-1.5 text-center border-l-2 border-gray-200 bg-gray-50">
                            <span className="text-[11px] font-semibold text-amber-700">{fmtCurrencyWhole(annualRowTotal)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-amber-50/30">
                      <td className="px-4 py-2 sticky left-0 bg-amber-50/30 border-r border-gray-100">
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Q Total</span>
                      </td>
                      {QUARTERS.map(q => {
                        const qs = QUARTER_STYLE[q];
                        const tgt = quarterNNTotal(product, q);
                        return QUARTER_MONTHS[q].map((m, mi) =>
                          mi === 0 ? (
                            <td key={m} colSpan={3} className={`px-3 py-2 text-center ${qs.leftBorder} ${qs.headerBg}`}>
                              <div className={`text-[11px] font-bold ${qs.header}`}>{fmtCurrencyWhole(tgt)}</div>
                            </td>
                          ) : null
                        );
                      })}
                      <td className="px-3 py-2 text-center border-l-2 border-gray-200 bg-amber-50/30">
                        <div className="text-[11px] font-bold text-amber-700">{fmtCurrencyWhole(annualTgt)}</div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientInputPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [store, setStore] = useState<InputStore>(() => loadStore() ?? createEmptyStore());
  const [lastSaved, setLastSaved] = useState<string | null>(() => loadLastSaved());
  const [saveFlash, setSaveFlash] = useState(false);
  const [activeView, setActiveView] = useState<"clients" | "net-new">("clients");
  const [seedFlash, setSeedFlash] = useState<string | null>(null);

  // Auto-sync client totals into monthly aggregate on page load for all products
  useEffect(() => {
    const refreshed = loadStore();
    if (refreshed) {
      for (const product of PRODUCTS) {
        recalculateProductMonthlyTargetsFromClients(refreshed, product);
      }
      setStore(refreshed);
    }
  }, []);

  // Client sidebar state
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product>("Nuro");
  const [clientSearch, setClientSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Derive master client list (union across all products)
  const masterClients: Map<string, { erTarget: number | null; enTarget: number | null; csm: string; am: string; startMonth: string | null; startYear: number | null; products: Product[] }> = new Map();
  for (const product of PRODUCTS) {
    for (const [name, rec] of Object.entries(store.clients[product] ?? {})) {
      if (!masterClients.has(name)) {
        masterClients.set(name, {
          erTarget: rec.erTarget ?? null,
          enTarget: rec.enTarget ?? null,
          csm: rec.csm,
          am: rec.am ?? "",
          startMonth: rec.startMonth ?? null,
          startYear: rec.startYear ?? null,
          products: [],
        });
      }
      masterClients.get(name)!.products.push(product);
    }
  }
  const clientList = Array.from(masterClients.entries())
    .filter(([name]) => clientSearch === "" || name.toLowerCase().includes(clientSearch.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const selectedClientProducts: Product[] = selectedClientName
    ? PRODUCTS.filter(p => store.clients[p]?.[selectedClientName])
    : [];

  useEffect(() => {
    if (selectedClientName && selectedClientProducts.length > 0 && !selectedClientProducts.includes(selectedProduct)) {
      setSelectedProduct(selectedClientProducts[0]);
    }
  }, [selectedClientName]);

  // ── Mutations ────────────────────────────────────────────────────────────
  function addClient(name: string, erTarget: number | null, enTarget: number | null, csm: string, am: string, startMonth: string | null, startYear: number | null, products: Product[]) {
    setStore(prev => {
      const next = { ...prev, clients: { ...prev.clients } };
      for (const p of products) {
        if (!next.clients[p][name]) {
          const months: Record<Month, any> = {} as any;
          for (const m of MONTHS) months[m] = emptyClientMonth();
          next.clients[p] = {
            ...next.clients[p],
            [name]: { name, erTarget, enTarget, nnTarget: null, csm, am, startMonth, startYear, months } as ClientRecord,
          };
        }
      }
      return next;
    });
    setSelectedClientName(name);
    setSelectedProduct(products[0]);
    setShowAddModal(false);
  }

  function addProductToClient(product: Product) {
    if (!selectedClientName) return;
    const info = masterClients.get(selectedClientName)!;
    setStore(prev => {
      if (prev.clients[product]?.[selectedClientName]) return prev;
      const months: Record<Month, any> = {} as any;
      for (const m of MONTHS) months[m] = emptyClientMonth();
      return {
        ...prev,
        clients: {
          ...prev.clients,
          [product]: {
            ...prev.clients[product],
            [selectedClientName]: { name: selectedClientName, erTarget: info.erTarget, enTarget: info.enTarget, nnTarget: null, csm: info.csm, am: info.am, startMonth: info.startMonth, startYear: info.startYear, months } as ClientRecord,
          },
        },
      };
    });
    setSelectedProduct(product);
  }

  function removeProductFromClient(product: Product) {
    if (!selectedClientName) return;
    if (!window.confirm(`Remove ${selectedClientName} from ${product}? All monthly data for this product will be deleted.`)) return;
    setStore(prev => {
      const next = { ...prev, clients: { ...prev.clients } };
      const productClients = { ...next.clients[product] };
      delete productClients[selectedClientName];
      next.clients[product] = productClients;
      return next;
    });
    const remaining = PRODUCTS.filter(p => p !== product && store.clients[p]?.[selectedClientName]);
    if (remaining.length > 0) setSelectedProduct(remaining[0]);
    else setSelectedClientName(null);
  }

  function removeClient(name: string) {
    if (!window.confirm(`Delete client "${name}"? All data across all products will be removed.`)) return;
    setStore(prev => {
      const next = { ...prev, clients: { ...prev.clients } };
      for (const p of PRODUCTS) {
        const productClients = { ...next.clients[p] };
        delete productClients[name];
        next.clients[p] = productClients;
      }
      return next;
    });
    if (selectedClientName === name) setSelectedClientName(null);
  }

  function updateClientMeta(field: "csm" | "am" | "startMonth", value: string) {
    if (!selectedClientName) return;
    setStore(prev => {
      const next = { ...prev, clients: { ...prev.clients } };
      for (const p of PRODUCTS) {
        if (next.clients[p]?.[selectedClientName]) {
          next.clients[p] = {
            ...next.clients[p],
            [selectedClientName]: { ...next.clients[p][selectedClientName], [field]: value || null },
          };
        }
      }
      return next;
    });
  }

  function updateClientMetaYear(value: number | null) {
    if (!selectedClientName) return;
    setStore(prev => {
      const next = { ...prev, clients: { ...prev.clients } };
      for (const p of PRODUCTS) {
        if (next.clients[p]?.[selectedClientName]) {
          next.clients[p] = {
            ...next.clients[p],
            [selectedClientName]: { ...next.clients[p][selectedClientName], startYear: value },
          };
        }
      }
      return next;
    });
  }

  function updateClientAnnualTarget(field: "erTarget" | "enTarget", value: number | null) {
    if (!selectedClientName) return;
    setStore(prev => {
      const next = { ...prev, clients: { ...prev.clients } };
      for (const p of PRODUCTS) {
        if (next.clients[p]?.[selectedClientName]) {
          next.clients[p] = {
            ...next.clients[p],
            [selectedClientName]: { ...next.clients[p][selectedClientName], [field]: value },
          };
        }
      }
      return next;
    });
  }

  function updateClientMonth(month: Month, key: keyof ClientMonthData, val: number | null) {
    if (!selectedClientName) return;
    setStore(prev => ({
      ...prev,
      clients: {
        ...prev.clients,
        [selectedProduct]: {
          ...prev.clients[selectedProduct],
          [selectedClientName]: {
            ...prev.clients[selectedProduct][selectedClientName],
            months: {
              ...prev.clients[selectedProduct][selectedClientName].months,
              [month]: {
                ...prev.clients[selectedProduct][selectedClientName].months[month],
                [key]: val,
              },
            },
          },
        },
      },
    }));
  }

  function addNnSalesperson(product: Product, salesperson: string) {
    const trimmed = salesperson.trim();
    if (!trimmed) return;

    const clientName = `${NN_PREFIX}${trimmed}`;
    setStore((prev) => {
      if (prev.clients[product]?.[clientName]) return prev;

      const months = {} as Record<Month, ClientMonthData>;
      for (const month of MONTHS) months[month] = emptyClientMonth();

      const next: InputStore = {
        ...prev,
        clients: {
          ...prev.clients,
          [product]: {
            ...prev.clients[product],
            [clientName]: {
              name: clientName,
              erTarget: null,
              enTarget: null,
              nnTarget: null,
              csm: "N/A",
              am: trimmed,
              months,
            } as ClientRecord,
          },
        },
      };
      recalculateProductMonthlyTargetsFromClients(next, product);
      return next;
    });
  }

  function removeNnSalesperson(product: Product, clientName: string) {
    setStore((prev) => {
      const nextClients = { ...prev.clients[product] };
      delete nextClients[clientName];

      const next: InputStore = {
        ...prev,
        clients: {
          ...prev.clients,
          [product]: nextClients,
        },
      };
      recalculateProductMonthlyTargetsFromClients(next, product);
      return next;
    });
  }

  function updateNN(product: Product, clientName: string, month: Month, val: number | null) {
    setStore(prev => {
      const record = prev.clients[product]?.[clientName];
      if (!record) return prev;

      const next: InputStore = {
        ...prev,
        clients: {
          ...prev.clients,
          [product]: {
            ...prev.clients[product],
            [clientName]: {
              ...record,
              nnTarget: MONTHS.reduce((sum, currentMonth) => sum + (currentMonth === month ? (val ?? 0) : (record.months[currentMonth]?.nnTarget ?? 0)), 0) || null,
              months: {
                ...record.months,
                [month]: {
                  ...record.months[month],
                  nnTarget: val,
                },
              },
            },
          },
        },
      };
      recalculateProductMonthlyTargetsFromClients(next, product);
      return next;
    });
  }

  function handleSave() {
    const nextStore = structuredClone(store);
    for (const product of PRODUCTS) {
      recalculateProductMonthlyTargetsFromClients(nextStore, product);
    }
    saveStore(nextStore);
    setStore(nextStore);
    const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    setLastSaved(ts);
    setSaveFlash(true);
    window.dispatchEvent(new Event("focus"));
    setTimeout(() => setSaveFlash(false), 2500);
  }

  const currentRecord: ClientRecord | null =
    selectedClientName && selectedProduct && store.clients[selectedProduct]?.[selectedClientName]
      ? store.clients[selectedProduct][selectedClientName]
      : null;

  const currentMeta = selectedClientName ? masterClients.get(selectedClientName) : null;
  const totalClients = masterClients.size;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Top Nav ───────────────────────────────────────────────────────── */}
      <div className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pr-6 border-r border-gray-200">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow">
                <span className="text-white font-black text-[11px] tracking-tight">AI</span>
              </div>
              <span className="text-gray-800 font-bold text-sm tracking-tight hidden sm:block">Access Infinity</span>
            </div>
            <Users className="w-4 h-4 text-violet-600" />
            <span className="text-[13px] font-semibold text-gray-700">Client Input</span>
            <span className="text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">FY26 · Aug–Jul</span>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="hidden md:flex items-center gap-1 text-[11px] text-gray-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Saved {lastSaved}
              </span>
            )}
              <button onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                <Globe2 className="w-3 h-3" /> Global Dashboard
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium px-3 py-1.5 rounded-lg border border-violet-200 transition-colors"
              >
                <Settings2 className="w-3 h-3" /> Settings
              </button>
              <button
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                <LogOut className="w-3 h-3" /> Sign out
              </button>
              <button onClick={handleSave}
                className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all shadow-sm ${
                  saveFlash ? "bg-emerald-500 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"
                }`}
            >
              {saveFlash ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {saveFlash ? "Saved!" : "Save All"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero Strip ────────────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-violet-700 to-indigo-800 py-5 px-4 md:px-6">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-0.5">Revenue Operations · FY26</div>
            <h1 className="text-xl font-bold text-white tracking-tight">Client Revenue Input</h1>
            <p className="text-white/60 text-xs mt-0.5">
              Add clients · set annual ER/EN targets · assign CSM &amp; AM · enter monthly ER/EN actuals · manage Net New by salesperson
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right text-white/70">
              <div className="text-2xl font-bold text-white">{totalClients}</div>
              <div className="text-[11px] uppercase tracking-wider">Clients</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right text-white/70">
              <div className="text-2xl font-bold text-white">
                {PRODUCTS.reduce((s, p) => s + Object.keys(store.clients[p] ?? {}).length, 0)}
              </div>
              <div className="text-[11px] uppercase tracking-wider">Product Links</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── View tabs ─────────────────────────────────────────────────────── */}
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 flex items-center gap-0">
          {[
            { id:"clients" as const,  label:"Client Revenue (ER / EN)", icon:Users   },
            { id:"net-new" as const,  label:"Net New (NN) by Product",  icon:Package },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveView(id)}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeView === id
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Net New View ──────────────────────────────────────────────────── */}
      {activeView === "net-new" && (
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-5">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Add salesperson rows under each product and enter monthly NN targets for each owner below.
              Enter absolute pound values here (for example, <strong>1500000</strong> = £1.5M).
            </span>
          </div>
          <NNGrid store={store} onUpdate={updateNN} onAddSalesperson={addNnSalesperson} onRemoveSalesperson={removeNnSalesperson} />
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button onClick={handleSave}
              className={`flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-xl transition-all shadow ${
                saveFlash ? "bg-emerald-500 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"
              }`}
            >
              {saveFlash ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveFlash ? "Saved!" : "Save All"}
            </button>
          </div>
        </div>
      )}

      {/* ── Client Revenue View ───────────────────────────────────────────── */}
      {activeView === "clients" && (
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 flex gap-5" style={{ minHeight: "calc(100vh - 200px)" }}>

          {/* ── Left Sidebar: Client List ─────────────────────────────────── */}
          <div className="w-64 shrink-0 flex flex-col gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center gap-2 justify-center py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add New Client
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  if (window.confirm(`This will replace ALL existing client data for all three products with the ${EXCEL_CLIENT_COUNT + ACCESS_HUB_CLIENT_COUNT + EVIDENCE_HUB_CLIENT_COUNT} clients from your Excel file. Continue?`)) {
                    const result = overwriteAllProducts();
                    setStore(loadStore()!);
                    setSelectedClientName(null);
                    setSeedFlash(`✓ Loaded ${result.nuro} Nuro · ${result.accessHub} Access Hub · ${result.evidenceHub} Evidence Hub`);
                    setTimeout(() => setSeedFlash(null), 5000);
                  }
                }}
                className="w-full flex items-center gap-2 justify-center py-2.5 px-4 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-xl border border-violet-200 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Upload Excel
              </button>
              {seedFlash && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-violet-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  {seedFlash}
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clients…"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {clientList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-center px-2">
                  <Users className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">{clientSearch ? "No clients match your search" : "No clients yet"}</p>
                  <p className="text-[11px] mt-1 text-gray-300">Click "Add New Client" to get started</p>
                </div>
              )}
              {clientList.map(([name, info], idx) => {
                const isSelected = selectedClientName === name;
                const avatarCls = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const missingMeta = !info.csm || !info.am;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      setSelectedClientName(name);
                      if (info.products.length > 0 && !info.products.includes(selectedProduct)) {
                        setSelectedProduct(info.products[0]);
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left group ${
                      isSelected
                        ? "bg-violet-50 border-violet-200 shadow-sm"
                        : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarCls}`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isSelected ? "text-violet-700" : "text-gray-800"}`}>{name}</div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {info.csm ? `CSM: ${info.csm}` : ""}{info.csm && info.am ? " · " : ""}{info.am ? `AM: ${info.am}` : ""}
                        {!info.csm && !info.am && "No details"}
                      </div>
                      {(info.startMonth || info.startYear) && (
                        <div className="text-[10px] text-indigo-500 font-medium mt-0.5">
                          Start: {[info.startMonth, info.startYear].filter(Boolean).join(" ")}
                        </div>
                      )}
                      {(info.erTarget !== null || info.enTarget !== null) && (
                        <div className="flex gap-1 mt-0.5">
                          {info.erTarget !== null && (
                            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-sky-50 text-sky-700">ER {fmtM(info.erTarget)}</span>
                          )}
                          {info.enTarget !== null && (
                            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-violet-50 text-violet-700">EN {fmtM(info.enTarget)}</span>
                          )}
                        </div>
                      )}
                      {missingMeta && (
                        <div className="text-[10px] text-rose-500 flex items-center gap-0.5 mt-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> Missing {!info.csm ? "CSM" : ""}{!info.csm && !info.am ? " & " : ""}{!info.am ? "AM" : ""}
                        </div>
                      )}
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {info.products.map(p => (
                          <span key={p} className={`text-[9px] font-semibold px-1 py-0.5 rounded ${PRODUCT_STYLE[p].bg} ${PRODUCT_STYLE[p].text}`}>{p.replace(" Hub","")}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeClient(name); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete client"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                );
              })}
            </div>

            {totalClients > 0 && (
              <div className="border-t border-gray-200 pt-3 space-y-1">
                {PRODUCTS.map(p => {
                  const count = Object.keys(store.clients[p] ?? {}).length;
                  const ps = PRODUCT_STYLE[p];
                  return (
                    <div key={p} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                        <span className="text-gray-500">{p}</span>
                      </div>
                      <span className={`font-semibold ${ps.text}`}>{count} client{count !== 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right Panel: Client Detail ────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {!selectedClientName ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-base font-semibold text-gray-500">Select a client to edit</p>
                <p className="text-sm mt-1">Or click "Add New Client" to create your first entry</p>
                <button onClick={() => setShowAddModal(true)}
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow"
                >
                  <UserPlus className="w-4 h-4" /> Add New Client
                </button>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Client header card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${AVATAR_COLORS[Array.from(masterClients.keys()).indexOf(selectedClientName) % AVATAR_COLORS.length]}`}>
                      {initials(selectedClientName)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <h2 className="text-lg font-bold text-gray-800">{selectedClientName}</h2>
                      {/* Annual ER / EN Targets */}
                      <div className="flex flex-wrap gap-4 items-center py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold shrink-0">Annual Targets</span>
                        <AnnualTargetInput
                          label="ER"
                          value={currentMeta?.erTarget ?? null}
                          onChange={v => updateClientAnnualTarget("erTarget", v)}
                          focusColor="focus:ring-sky-300"
                          bgColor="bg-sky-50"
                          borderColor="border-sky-200"
                          textColor="text-sky-700"
                        />
                        <AnnualTargetInput
                          label="EN"
                          value={currentMeta?.enTarget ?? null}
                          onChange={v => updateClientAnnualTarget("enTarget", v)}
                          focusColor="focus:ring-violet-300"
                          bgColor="bg-violet-50"
                          borderColor="border-violet-200"
                          textColor="text-violet-700"
                        />
                      </div>
                      {/* CSM + AM + Start Month/Year */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold shrink-0">
                            CSM <span className="text-rose-400">*</span>
                          </label>
                          <input
                            value={currentMeta?.csm ?? ""}
                            onChange={e => updateClientMeta("csm", e.target.value)}
                            placeholder="Customer Success Manager"
                            className={`text-xs border rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 w-40 ${
                              !currentMeta?.csm ? "border-rose-300 bg-rose-50" : "border-gray-200"
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold shrink-0">
                            AM <span className="text-rose-400">*</span>
                          </label>
                          <input
                            value={currentMeta?.am ?? ""}
                            onChange={e => updateClientMeta("am", e.target.value)}
                            placeholder="Account Manager"
                            className={`text-xs border rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 w-40 ${
                              !currentMeta?.am ? "border-rose-300 bg-rose-50" : "border-gray-200"
                            }`}
                          />
                        </div>
                        {/* Start Month + Year inline */}
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold shrink-0">Start</label>
                          <select
                            value={currentMeta?.startMonth ?? ""}
                            onChange={e => updateClientMeta("startMonth", e.target.value)}
                            className="text-xs border border-indigo-200 rounded-lg px-2.5 py-1.5 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-indigo-700 w-24"
                          >
                            <option value="">Month</option>
                            {CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <select
                            value={currentMeta?.startYear ?? ""}
                            onChange={e => updateClientMetaYear(e.target.value ? Number(e.target.value) : null)}
                            className="text-xs border border-indigo-200 rounded-lg px-2.5 py-1.5 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-indigo-700 w-24"
                          >
                            <option value="">Year</option>
                            {START_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          {(currentMeta?.startMonth || currentMeta?.startYear) && (
                            <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              {[currentMeta?.startMonth, currentMeta?.startYear].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </div>
                        {(!currentMeta?.csm || !currentMeta?.am) && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>CSM and AM are required</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeClient(selectedClientName)}
                      className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Client
                    </button>
                  </div>
                </div>

                {/* Product tabs */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 bg-gray-50 px-5 flex items-center justify-between">
                    <div className="flex items-center gap-0">
                      {PRODUCTS.map(p => {
                        const ps = PRODUCT_STYLE[p];
                        const isLinked = selectedClientProducts.includes(p);
                        const isActive = selectedProduct === p && isLinked;
                        return (
                          <button
                            key={p}
                            onClick={() => { if (isLinked) setSelectedProduct(p); }}
                            className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
                              isActive
                                ? `${ps.activeBorder} ${ps.text}`
                                : isLinked
                                ? "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                                : "border-transparent text-gray-300 cursor-default"
                            }`}
                          >
                            <Building2 className="w-3 h-3" />
                            {p}
                            {isLinked
                              ? <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${ps.dot}`} />
                              : <span className="text-[10px] text-gray-300 ml-1">not linked</span>
                            }
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 pl-3 border-l border-gray-200 ml-2">
                      {PRODUCTS.filter(p => !selectedClientProducts.includes(p)).map(p => {
                        const ps = PRODUCT_STYLE[p];
                        return (
                          <button key={p} onClick={() => addProductToClient(p)}
                            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${ps.bg} ${ps.text} ${ps.border} hover:opacity-80`}
                          >
                            <Plus className="w-2.5 h-2.5" /> {p.replace(" Hub","")}
                          </button>
                        );
                      })}
                      {selectedClientProducts.includes(selectedProduct) && (
                        <button onClick={() => removeProductFromClient(selectedProduct)}
                          className="flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" /> Remove {selectedProduct.replace(" Hub","")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    {!selectedClientProducts.includes(selectedProduct) ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Building2 className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">{selectedClientName} is not linked to {selectedProduct}</p>
                        <button onClick={() => addProductToClient(selectedProduct)}
                          className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${PRODUCT_STYLE[selectedProduct].bg} ${PRODUCT_STYLE[selectedProduct].text} ${PRODUCT_STYLE[selectedProduct].border} hover:opacity-80 transition-colors`}
                        >
                          <Plus className="w-3 h-3" /> Add to {selectedProduct}
                        </button>
                      </div>
                    ) : currentRecord ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-semibold ${PRODUCT_STYLE[selectedProduct].text}`}>{selectedClientName} · {selectedProduct}</span>
                          <span className="text-[11px] text-gray-400">· Enter monthly ER/EN targets &amp; actuals · Values in £K</span>
                        </div>
                        <ClientProductGrid product={selectedProduct} record={currentRecord} onUpdate={updateClientMonth} />
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Info tip */}
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Annual ER/EN Targets</strong> are client-level totals for high-level planning. The monthly grid captures detailed month-by-month targets and actuals.
                    ER/EN data populates the <strong>Revenue by Client</strong> and <strong>Revenue by Team Member</strong> tabs on the dashboard.
                    Net New (NN) is product-level — use the <strong>Net New (NN) by Product</strong> tab.
                    All values in <strong>thousands (£K)</strong> — e.g. 1500 = £1.5M.
                    Click <strong>Save All</strong> before navigating away.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Client Modal ───────────────────────────────────────────────── */}
      {showAddModal && (
        <AddClientModal
          onAdd={addClient}
          onClose={() => setShowAddModal(false)}
          existingNames={Array.from(masterClients.keys())}
        />
      )}
    </div>
  );
}
