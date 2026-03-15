import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Globe2, LogOut, Settings2, ShieldCheck, UserPlus } from "lucide-react";
import {
  hasInputData,
  InputStore,
  Product,
  PRODUCTS,
  getHubSpotSync,
  resolveTrackerData,
} from "@/lib/dataStore";
import { PRODUCT_DATA, CURRENT_QUARTER } from "@/constants/mockData";
import { formatCurrency, attainmentPct } from "@/lib/formatters";
import { useRevenueSnapshot } from "@/hooks/useRevenueSnapshot";
import { useAuth } from "@/components/auth/AuthProvider";

const PRODUCT_TABS: { id: Product; label: string }[] = [
  { id: "Nuro", label: "Nuro" },
  { id: "Access Hub", label: "Access Hub" },
  { id: "Evidence Hub", label: "Evidence Hub" },
];

const ARR_TRACKER_STORAGE_KEY = "digital_revtrack_arr_tracker_v1";

const QUARTER_ORDER = ["Q1", "Q2", "Q3", "Q4"] as const;
type Quarter = typeof QUARTER_ORDER[number];
type CategoryKey = "er" | "en" | "nn";

const CATEGORY_META: Record<CategoryKey, { label: string; shortLabel: string; dot: string; bar: string; text: string; bg: string }> = {
  er: { label: "ER", shortLabel: "Renewal", dot: "bg-sky-500", bar: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  en: { label: "EN", shortLabel: "Expansion", dot: "bg-violet-500", bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  nn: { label: "NN", shortLabel: "Net New", dot: "bg-amber-500", bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
};

const PRODUCT_STYLE: Record<Product, { text: string; bg: string; border: string; dot: string }> = {
  "Nuro": { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", dot: "bg-violet-500" },
  "Access Hub": { text: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", dot: "bg-cyan-500" },
  "Evidence Hub": { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500" },
};

function isFuture(q: Quarter) {
  return QUARTER_ORDER.indexOf(q) > QUARTER_ORDER.indexOf(CURRENT_QUARTER);
}

function attColorLight(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct >= 85) return "text-amber-600";
  return "text-rose-600";
}

function attBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 85) return "bg-amber-400";
  return "bg-rose-500";
}

interface MetricValue {
  target: number;
  actual: number;
}

interface QuarterSummary {
  quarter: Quarter;
  er: MetricValue;
  en: MetricValue;
  nn: MetricValue;
  total: MetricValue;
}

interface ProductSummary {
  product: Product;
  fromInput: boolean;
  fromHubSpot: boolean;
  annualTarget: number;
  annual: {
    er: MetricValue;
    en: MetricValue;
    nn: MetricValue;
    total: MetricValue;
  };
  ytd: {
    er: MetricValue;
    en: MetricValue;
    nn: MetricValue;
    total: MetricValue;
  };
  quarters: QuarterSummary[];
}

interface ArrTrackerItem {
  id: string;
  clientName: string;
  product: Product;
  arrValue: number;
}

interface ArrTrackerState {
  arrAsOfLastMonth: number;
  knownContractions: number;
  signedThisMonth: ArrTrackerItem[];
  waitingForSignature: ArrTrackerItem[];
}

function createEmptyArrTrackerState(): ArrTrackerState {
  return {
    arrAsOfLastMonth: 0,
    knownContractions: 0,
    signedThisMonth: [],
    waitingForSignature: [],
  };
}

function loadArrTrackerState(): ArrTrackerState {
  if (typeof window === "undefined") return createEmptyArrTrackerState();
  try {
    const parsed = JSON.parse(localStorage.getItem(ARR_TRACKER_STORAGE_KEY) ?? "null");
    return {
      ...createEmptyArrTrackerState(),
      ...parsed,
      signedThisMonth: Array.isArray(parsed?.signedThisMonth) ? parsed.signedThisMonth : [],
      waitingForSignature: Array.isArray(parsed?.waitingForSignature) ? parsed.waitingForSignature : [],
    };
  } catch {
    return createEmptyArrTrackerState();
  }
}

function lastMonthLabel() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
}

function createArrItem(product: Product): ArrTrackerItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clientName: "",
    product,
    arrValue: 0,
  };
}

function arrListTotal(items: ArrTrackerItem[]) {
  return items.reduce((sum, item) => sum + item.arrValue, 0);
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${formatCurrency(value, true)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value), true)}`;
  return formatCurrency(0, true);
}

function ArrNumberField({
  value,
  onChange,
  negative = false,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  negative?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <span className="text-sm font-semibold text-gray-400">£</span>
      <input
        type="number"
        min={0}
        step={1}
        value={Math.abs(value)}
        disabled={disabled}
        onChange={(e) => {
          const nextValue = Math.max(0, Number(e.target.value) || 0);
          onChange(negative ? -nextValue : nextValue);
        }}
        className="w-36 bg-transparent px-2 text-sm font-semibold text-gray-800 outline-none disabled:cursor-not-allowed disabled:text-gray-400"
      />
    </div>
  );
}

function ArrTrackerTable({
  title,
  items,
  draft,
  onDraftChange,
  onAdd,
  onUpdate,
  onRemove,
  disabled = false,
}: {
  title: string;
  items: ArrTrackerItem[];
  draft: ArrTrackerItem;
  onDraftChange: (draft: ArrTrackerItem) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ArrTrackerItem>) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Add one or more manual ARR rows.</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-gray-400">Total</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(arrListTotal(items), true)}</div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            type="text"
            value={draft.clientName}
            disabled={disabled}
            onChange={(e) => onDraftChange({ ...draft, clientName: e.target.value })}
            placeholder="Client name"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <select
            value={draft.product}
            disabled={disabled}
            onChange={(e) => onDraftChange({ ...draft, product: e.target.value as Product })}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {PRODUCTS.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
          <ArrNumberField
            value={draft.arrValue}
            disabled={disabled}
            onChange={(arrValue) => onDraftChange({ ...draft, arrValue })}
          />
          <button
            onClick={onAdd}
            disabled={disabled}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Add row
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            No rows added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-3">Client Name</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">ARR Value</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.clientName}
                          disabled={disabled}
                          onChange={(e) => onUpdate(item.id, { clientName: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                    </td>
                    <td className="px-3 py-3">
                        <select
                          value={item.product}
                          disabled={disabled}
                          onChange={(e) => onUpdate(item.id, { product: e.target.value as Product })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 disabled:cursor-not-allowed disabled:bg-gray-100"
                        >
                        {PRODUCTS.map((product) => (
                          <option key={product} value={product}>{product}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <ArrNumberField
                        value={item.arrValue}
                        disabled={disabled}
                        onChange={(arrValue) => onUpdate(item.id, { arrValue })}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => onRemove(item.id)}
                          disabled={disabled}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function buildProductSummary(store: InputStore | null, product: Product): ProductSummary {
  const fromInput = !!(store && hasInputData(store, product));
  const fromHubSpot = !!(store && getHubSpotSync(store, product).syncedAt);
  const { targets, actuals } = store
    ? resolveTrackerData(store, product, PRODUCT_DATA[product])
    : PRODUCT_DATA[product];

  const quarters: QuarterSummary[] = QUARTER_ORDER.map((quarter, index) => {
    const target = targets[index];
    const actual = actuals[index];
    return {
      quarter,
      er: { target: target.renewal, actual: actual.renewal },
      en: { target: target.expansion, actual: actual.expansion },
      nn: { target: target.netNew, actual: actual.netNew },
      total: {
        target: target.renewal + target.expansion + target.netNew,
        actual: actual.renewal + actual.expansion + actual.netNew,
      },
    };
  });

  const visibleQuarters = quarters.filter((entry) => !isFuture(entry.quarter));
  const sumMetric = (items: QuarterSummary[], key: CategoryKey | "total"): MetricValue => ({
    target: items.reduce((sum, item) => sum + item[key].target, 0),
    actual: items.reduce((sum, item) => sum + item[key].actual, 0),
  });

  return {
    product,
    fromInput,
    fromHubSpot,
    annualTarget: quarters.reduce((sum, item) => sum + item.total.target, 0),
    annual: {
      er: sumMetric(quarters, "er"),
      en: sumMetric(quarters, "en"),
      nn: sumMetric(quarters, "nn"),
      total: sumMetric(quarters, "total"),
    },
    ytd: {
      er: sumMetric(visibleQuarters, "er"),
      en: sumMetric(visibleQuarters, "en"),
      nn: sumMetric(visibleQuarters, "nn"),
      total: sumMetric(visibleQuarters, "total"),
    },
    quarters,
  };
}

function aggregateSummaries(summaries: ProductSummary[]) {
  const sumMetric = (selector: (summary: ProductSummary) => MetricValue): MetricValue => ({
    target: summaries.reduce((sum, summary) => sum + selector(summary).target, 0),
    actual: summaries.reduce((sum, summary) => sum + selector(summary).actual, 0),
  });

  return {
    er: {
      target: summaries.reduce((sum, summary) => sum + summary.annual.er.target, 0),
      actual: summaries.reduce((sum, summary) => sum + summary.ytd.er.actual, 0),
    },
    en: {
      target: summaries.reduce((sum, summary) => sum + summary.annual.en.target, 0),
      actual: summaries.reduce((sum, summary) => sum + summary.ytd.en.actual, 0),
    },
    nn: {
      target: summaries.reduce((sum, summary) => sum + summary.annual.nn.target, 0),
      actual: summaries.reduce((sum, summary) => sum + summary.ytd.nn.actual, 0),
    },
    total: {
      target: summaries.reduce((sum, summary) => sum + summary.annual.total.target, 0),
      actual: summaries.reduce((sum, summary) => sum + summary.ytd.total.actual, 0),
    },
  };
}

function MetricBar({
  label,
  target,
  actual,
  dotClass,
  barClass,
  textClass,
  compact = false,
}: {
  label: string;
  target: number;
  actual: number;
  dotClass: string;
  barClass: string;
  textClass: string;
  compact?: boolean;
}) {
  const pct = attainmentPct(actual, target);
  const barWidth = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
          <span className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${textClass}`}>{label}</span>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-bold ${compact ? "text-xs" : "text-sm"} ${textClass}`}>{formatCurrency(actual, true)}</div>
          <div className="text-[11px] text-gray-400">Target {formatCurrency(target, true)}</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${barWidth}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className={`${attColorLight(pct)} font-bold`}>{pct}% YTD</span>
          <span className="text-gray-400">{formatCurrency(actual - target, true)} variance</span>
        </div>
      </div>
    </div>
  );
}

function TotalBlock({
  label,
  target,
  actual,
}: {
  label: string;
  target: number;
  actual: number;
}) {
  const pct = attainmentPct(actual, target);
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(target, true)}</div>
          <div className="text-[11px] text-gray-400">Total target</div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${attColorLight(pct)}`}>{formatCurrency(actual, true)}</div>
          <div className="text-[11px] text-gray-400">YTD achievement</div>
        </div>
      </div>
      <div className="mt-3 h-2.5 bg-white rounded-full overflow-hidden border border-gray-100">
        <div className={`h-full rounded-full ${attBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className={`font-bold ${attColorLight(pct)}`}>{pct}% YTD</span>
        <span className="text-gray-400">{formatCurrency(actual - target, true)} variance</span>
      </div>
    </div>
  );
}

export default function GlobalDashboardPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { access, canEdit, signOut } = useAuth();
    const { store, lastSaved } = useRevenueSnapshot();
  const initialTopTab = searchParams.get("tracker") === "arr" ? "arr" : "sales";
  const [topTrackerTab, setTopTrackerTab] = useState<"sales" | "arr">(initialTopTab);
  const [arrTracker, setArrTracker] = useState<ArrTrackerState>(() => loadArrTrackerState());
  const [signedDraft, setSignedDraft] = useState<ArrTrackerItem>(() => createArrItem("Access Hub"));
  const [waitingDraft, setWaitingDraft] = useState<ArrTrackerItem>(() => createArrItem("Access Hub"));
  const [selectedQuarterByProduct, setSelectedQuarterByProduct] = useState<Record<Product, Quarter>>({
    "Nuro": (searchParams.get("nuroQuarter") as Quarter) || CURRENT_QUARTER,
    "Access Hub": (searchParams.get("accessQuarter") as Quarter) || CURRENT_QUARTER,
    "Evidence Hub": (searchParams.get("evidenceQuarter") as Quarter) || CURRENT_QUARTER,
  });

  const summaries = PRODUCTS.map((product) => buildProductSummary(store, product));
  const overall = aggregateSummaries(summaries);
  const inputCount = summaries.filter((summary) => summary.fromInput).length;
  const arrLastMonth = lastMonthLabel();
  const signedThisMonthTotal = arrListTotal(arrTracker.signedThisMonth);
  const waitingForSignatureTotal = arrListTotal(arrTracker.waitingForSignature);
  const confirmedArrTotal = arrTracker.arrAsOfLastMonth + arrTracker.knownContractions;
  const contractedArrTotal = confirmedArrTotal + signedThisMonthTotal + waitingForSignatureTotal;

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tracker", topTrackerTab);
    next.set("nuroQuarter", selectedQuarterByProduct["Nuro"]);
    next.set("accessQuarter", selectedQuarterByProduct["Access Hub"]);
    next.set("evidenceQuarter", selectedQuarterByProduct["Evidence Hub"]);
    setSearchParams(next, { replace: true });
  }, [topTrackerTab, selectedQuarterByProduct, searchParams, setSearchParams]);

  useEffect(() => {
    localStorage.setItem(ARR_TRACKER_STORAGE_KEY, JSON.stringify(arrTracker));
  }, [arrTracker]);

  function addArrRow(section: "signedThisMonth" | "waitingForSignature") {
    const draft = section === "signedThisMonth" ? signedDraft : waitingDraft;
    if (!draft.clientName.trim() || draft.arrValue <= 0) return;

    setArrTracker((prev) => ({
      ...prev,
      [section]: [
        ...prev[section],
        {
          ...draft,
          clientName: draft.clientName.trim(),
        },
      ],
    }));

    if (section === "signedThisMonth") {
      setSignedDraft(createArrItem(draft.product));
    } else {
      setWaitingDraft(createArrItem(draft.product));
    }
  }

  function updateArrRow(section: "signedThisMonth" | "waitingForSignature", id: string, patch: Partial<ArrTrackerItem>) {
    setArrTracker((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeArrRow(section: "signedThisMonth" | "waitingForSignature", id: string) {
    setArrTracker((prev) => ({
      ...prev,
      [section]: prev[section].filter((item) => item.id !== id),
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-0">
            <div className="flex items-center gap-2 pr-6 border-r border-gray-200 mr-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow">
                <span className="text-white font-black text-[11px] tracking-tight">AI</span>
              </div>
              <span className="text-gray-800 font-bold text-sm tracking-tight hidden sm:block">Access Infinity</span>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-[18px] text-sm font-semibold border-b-2 border-violet-600 text-violet-700 -mb-px">
              <Globe2 className="w-3.5 h-3.5" />
              Global Dashboard
            </button>
            {PRODUCT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/tracker?product=${encodeURIComponent(tab.id)}`)}
                className="flex items-center gap-1.5 px-4 py-[18px] text-sm font-semibold border-b-2 border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300 -mb-px transition-all"
              >
                <Building2 className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="hidden md:flex items-center gap-1 text-[11px] text-violet-700 font-medium">
                  Last updated {lastSaved}
                </span>
              )}
              {canEdit && (
                <button
                  onClick={() => navigate("/clients")}
                  className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                >
                  <UserPlus className="w-3 h-3" /> Dashboard Inputs
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium px-3 py-1.5 rounded-lg transition-colors border border-violet-200"
                >
                  <Settings2 className="w-3 h-3" /> Settings
                </button>
              )}
              <span className={`hidden md:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${canEdit ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                <ShieldCheck className="w-3 h-3" />
                {access?.role === "editor" ? "Editor" : "Read only"}
              </span>
              <button
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
              >
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-violet-900 to-indigo-900 px-4 md:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe2 className="w-4 h-4 text-violet-300" />
                <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Digital RevTrack</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Global Revenue Dashboard</h1>
              <p className="text-sm text-white/55 mt-1">
                ER, EN, and NN target versus YTD achievement across all products
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Overall FY26</div>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                <div>
                  <div className="text-white/50 text-[11px]">Target</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(overall.total.target, true)}</div>
                </div>
                <div>
                  <div className="text-white/50 text-[11px]">YTD Achievement</div>
                  <div className={`text-xl font-bold ${overall.total.actual >= overall.total.target ? "text-emerald-400" : "text-amber-300"}`}>
                    {formatCurrency(overall.total.actual, true)}
                  </div>
                </div>
                <div>
                  <div className="text-white/50 text-[11px]">Confirmed ARR</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(confirmedArrTotal, true)}</div>
                </div>
                <div>
                  <div className="text-white/50 text-[11px]">CARR</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(contractedArrTotal, true)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => setTopTrackerTab("sales")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    topTrackerTab === "sales" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Sales Tracker
                </button>
                <button
                  onClick={() => setTopTrackerTab("arr")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    topTrackerTab === "arr" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  ARR Tracker
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {topTrackerTab === "sales"
                  ? "Target versus YTD achievement across ER, EN, and NN"
                  : "A dedicated ARR summary can live here alongside the sales tracker."}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-400">
                {topTrackerTab === "sales" ? "Combined YTD" : "ARR View"}
              </div>
              <div className={`text-sm font-bold ${attColorLight(attainmentPct(overall.total.actual, overall.total.target))}`}>
                {topTrackerTab === "sales" ? `${attainmentPct(overall.total.actual, overall.total.target)}%` : "Ready"}
              </div>
            </div>
          </div>

          {topTrackerTab === "sales" ? (
            <>
              <div className="mt-6 space-y-5">
                {(["er", "en", "nn"] as CategoryKey[]).map((key) => {
                  const meta = CATEGORY_META[key];
                  const metric = overall[key];
                  return (
                    <MetricBar
                      key={key}
                      label={`${meta.label} ${meta.shortLabel}`}
                      target={metric.target}
                      actual={metric.actual}
                      dotClass={meta.dot}
                      barClass={meta.bar}
                      textClass={meta.text}
                    />
                  );
                })}
              </div>

              <div className="mt-6">
                <TotalBlock label="Total Sales" target={overall.total.target} actual={overall.total.actual} />
              </div>
            </>
            ) : (
              <div className="mt-6 space-y-5">
                {!canEdit && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    ARR Tracker is read-only for your account. Editors can update ARR values and add contract rows.
                  </div>
                )}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="px-5 py-3">ARR Summary</th>
                      <th className="px-5 py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-4 font-semibold text-gray-800">ARR as of {arrLastMonth}</td>
                      <td className="px-5 py-4">
                        <ArrNumberField
                          value={arrTracker.arrAsOfLastMonth}
                          disabled={!canEdit}
                          onChange={(value) => setArrTracker((prev) => ({ ...prev, arrAsOfLastMonth: value }))}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-rose-50/60">
                      <td className="px-5 py-4 font-semibold text-rose-700">Known Contractions</td>
                      <td className="px-5 py-4">
                        <ArrNumberField
                          value={arrTracker.knownContractions}
                          disabled={!canEdit}
                          onChange={(value) => setArrTracker((prev) => ({ ...prev, knownContractions: value }))}
                          negative
                        />
                      </td>
                    </tr>
                    <tr className="border-b-2 border-gray-200 bg-violet-50/70">
                      <td className="px-5 py-4 font-bold text-violet-950">Confirmed ARR</td>
                      <td className="px-5 py-4 text-lg font-bold text-violet-950">{formatCurrency(confirmedArrTotal, true)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-4 font-semibold text-gray-800">New Contracts Signed this month</td>
                      <td className="px-5 py-4 text-lg font-bold text-emerald-700">{formatSignedNumber(signedThisMonthTotal)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-4 font-semibold text-gray-800">Waiting for signature</td>
                      <td className="px-5 py-4 text-lg font-bold text-amber-700">{formatSignedNumber(waitingForSignatureTotal)}</td>
                    </tr>
                    <tr className="bg-indigo-50/80">
                      <td className="px-5 py-4 font-bold text-indigo-950">CARR (Contracted ARR)</td>
                      <td className="px-5 py-4 text-xl font-bold text-indigo-950">{formatCurrency(contractedArrTotal, true)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ArrTrackerTable
                title="New Contracts Signed this month"
                items={arrTracker.signedThisMonth}
                draft={signedDraft}
                onDraftChange={setSignedDraft}
                onAdd={() => addArrRow("signedThisMonth")}
                onUpdate={(id, patch) => updateArrRow("signedThisMonth", id, patch)}
                onRemove={(id) => removeArrRow("signedThisMonth", id)}
                disabled={!canEdit}
              />

              <ArrTrackerTable
                title="Waiting for signature"
                items={arrTracker.waitingForSignature}
                draft={waitingDraft}
                onDraftChange={setWaitingDraft}
                onAdd={() => addArrRow("waitingForSignature")}
                onUpdate={(id, patch) => updateArrRow("waitingForSignature", id, patch)}
                onRemove={(id) => removeArrRow("waitingForSignature", id)}
                disabled={!canEdit}
              />
            </div>
          )}
        </section>

        {topTrackerTab === "sales" && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Product Dashboards</h2>
            <p className="text-sm text-gray-500">Each product shows ER, EN, NN, total, and quarterly progress</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {summaries.map((summary) => {
              const productStyle = PRODUCT_STYLE[summary.product];
              const totalPct = attainmentPct(summary.ytd.total.actual, summary.ytd.total.target);
              const selectedQuarter = summary.quarters.find(
                (quarter) => quarter.quarter === selectedQuarterByProduct[summary.product],
              ) ?? summary.quarters[0];
              const selectedQuarterIsFuture = isFuture(selectedQuarter.quarter);

              return (
                <div key={summary.product} className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className={`px-5 py-4 border-b ${productStyle.bg} ${productStyle.border}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${productStyle.dot}`} />
                        <div>
                          <h3 className={`text-base font-bold ${productStyle.text}`}>{summary.product}</h3>
                          <div className="text-[11px] text-gray-500">
                            FY26 target {formatCurrency(summary.annualTarget, true)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/tracker?product=${encodeURIComponent(summary.product)}`)}
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Open product
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {(["er", "en", "nn"] as CategoryKey[]).map((key) => {
                      const meta = CATEGORY_META[key];
                      const metric = {
                        target: summary.annual[key].target,
                        actual: summary.ytd[key].actual,
                      };
                      return (
                        <MetricBar
                          key={key}
                          label={`${meta.label} ${meta.shortLabel}`}
                          target={metric.target}
                          actual={metric.actual}
                          dotClass={meta.dot}
                          barClass={meta.bar}
                          textClass={meta.text}
                          compact
                        />
                      );
                    })}

                    <TotalBlock
                      label={`${summary.product} Total`}
                      target={summary.annual.total.target}
                      actual={summary.ytd.total.actual}
                    />

                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Quarterly View</h4>
                          <p className="text-[11px] text-gray-500">Click a quarter tab to view its target and achievement card</p>
                        </div>
                        <div className={`text-xs font-bold ${attColorLight(totalPct)}`}>{totalPct}% YTD</div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {summary.quarters.map((quarter) => {
                          const active = quarter.quarter === selectedQuarter.quarter;
                          return (
                            <button
                              key={quarter.quarter}
                              onClick={() =>
                                setSelectedQuarterByProduct((prev) => ({
                                  ...prev,
                                  [summary.product]: quarter.quarter,
                                }))
                              }
                              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                                active
                                  ? `${productStyle.bg} ${productStyle.border} ${productStyle.text}`
                                  : "border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
                              }`}
                            >
                              {quarter.quarter}
                            </button>
                          );
                        })}
                      </div>

                      <div className={`rounded-2xl border border-gray-200 p-4 ${selectedQuarterIsFuture ? "bg-gray-50/80" : "bg-white"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-bold text-gray-800">{selectedQuarter.quarter}</div>
                          <div className="text-[11px] text-gray-400">
                            {selectedQuarterIsFuture
                              ? "Target only"
                              : `${attainmentPct(selectedQuarter.total.actual, selectedQuarter.total.target)}% achieved`}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {(["er", "en", "nn"] as CategoryKey[]).map((key) => {
                            const meta = CATEGORY_META[key];
                            const metric = selectedQuarter[key];
                            return (
                              <MetricBar
                                key={`${selectedQuarter.quarter}-${key}`}
                                label={meta.label}
                                target={metric.target}
                                actual={selectedQuarterIsFuture ? 0 : metric.actual}
                                dotClass={meta.dot}
                                barClass={meta.bar}
                                textClass={meta.text}
                                compact
                              />
                            );
                          })}
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-gray-500">Quarter Total Target</div>
                              <div className="text-sm font-bold text-gray-900">{formatCurrency(selectedQuarter.total.target, true)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] uppercase tracking-wider text-gray-500">Quarter Achievement</div>
                              <div className={`text-sm font-bold ${selectedQuarterIsFuture ? "text-gray-400" : attColorLight(attainmentPct(selectedQuarter.total.actual, selectedQuarter.total.target))}`}>
                                {selectedQuarterIsFuture ? "—" : formatCurrency(selectedQuarter.total.actual, true)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
