import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { PRODUCT_DATA, CURRENT_QUARTER } from "@/constants/mockData";
import { loadStore, hasInputData, storeClientsToClientExpansion, loadLastSaved, InputStore, Product, QUARTERS as STORE_QUARTERS, QUARTER_MONTHS, MONTHS, emptyClientMonth, createEmptyStore, getHubSpotSync, recalculateProductMonthlyTargetsFromClients, resolveTrackerData, saveStore } from "@/lib/dataStore";
import { formatCurrency, attainmentPct, attainmentColor, attainmentBg } from "@/lib/formatters";
import RevenueChart from "@/components/features/RevenueChart";
import MetricPill from "@/components/features/MetricPill";
import { TrendingUp, Building2, Pencil, Check, X, TableProperties, Users, UserCircle2, RefreshCw, CheckCircle2, AlertCircle, Globe2, UserPlus, ImagePlus, Settings2, LogOut, ShieldCheck } from "lucide-react";
import ClientRevenueTable from "@/components/features/ClientRevenueTable";
import TeamMemberRevenueTable from "@/components/features/TeamMemberRevenueTable";
import MappingConfigPanel, { MappingConfig, loadMappingConfig, saveMappingConfig } from "@/components/features/MappingConfigPanel";
import { useAuth } from "@/components/auth/AuthProvider";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type ProductTab = "Nuro" | "Access Hub" | "Evidence Hub";
type RevCatKey = "renewal" | "expansion" | "netNew";

const PRODUCT_TABS: { id: ProductTab; label: string }[] = [
  { id: "Nuro", label: "Nuro" },
  { id: "Access Hub", label: "Access Hub" },
  { id: "Evidence Hub", label: "Evidence Hub" },
];

function emptyProductRecord<T>(value: T): Record<ProductTab, T> {
  return {
    "Nuro": value,
    "Access Hub": value,
    "Evidence Hub": value,
  };
}

const PRODUCT_LOGO_STORAGE_KEY = "digital_revtrack_product_logos_v1";

function loadProductLogos(): Record<ProductTab, string | null> {
  if (typeof window === "undefined") return emptyProductRecord<string | null>(null);
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCT_LOGO_STORAGE_KEY) ?? "{}");
    return {
      "Nuro": parsed["Nuro"] ?? null,
      "Access Hub": parsed["Access Hub"] ?? null,
      "Evidence Hub": parsed["Evidence Hub"] ?? null,
    };
  } catch {
    return emptyProductRecord<string | null>(null);
  }
}

function buildClientNamesByProduct(inputStore: InputStore | null) {
  return {
    "Nuro": Array.from(new Set([
      ...PRODUCT_DATA["Nuro"].clients.map((client) => client.name),
      ...Object.keys(inputStore?.clients["Nuro"] ?? {}),
    ])),
    "Access Hub": Array.from(new Set([
      ...PRODUCT_DATA["Access Hub"].clients.map((client) => client.name),
      ...Object.keys(inputStore?.clients["Access Hub"] ?? {}),
    ])),
    "Evidence Hub": Array.from(new Set([
      ...PRODUCT_DATA["Evidence Hub"].clients.map((client) => client.name),
      ...Object.keys(inputStore?.clients["Evidence Hub"] ?? {}),
    ])),
  };
}

// â”€â”€ Access Infinity brand palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRODUCT_LABELS: Record<ProductTab, {
  tagline: string;
  primaryText: string;
  primaryBg: string;
  primaryBorder: string;
  pillBg: string;
  badgeBg: string;
  badgeText: string;
  tabActiveBg: string;
  tabActiveText: string;
  tabActiveBorder: string;
  btnBg: string;
  btnHover: string;
  btnText: string;
  heroGradient: string;
  heroTitle: string;
  heroMuted: string;
  heroStatCard: string;
  heroLogoRing: string;
}> = {
  "Nuro": {
    tagline: "Nuro Â· Revenue Operations",
    primaryText: "text-violet-700",
    primaryBg: "bg-violet-50",
    primaryBorder: "border-violet-200",
    pillBg: "bg-violet-50",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    tabActiveBg: "bg-violet-600",
    tabActiveText: "text-white",
    tabActiveBorder: "border-violet-600",
    btnBg: "bg-violet-600",
    btnHover: "hover:bg-violet-700",
    btnText: "text-white",
    heroGradient: "from-violet-50 via-white to-violet-100",
    heroTitle: "text-violet-950",
    heroMuted: "text-violet-800/70",
    heroStatCard: "border-violet-200 bg-white/90",
    heroLogoRing: "border-violet-200 bg-white",
  },
  "Access Hub": {
    tagline: "Access Hub Â· Revenue Operations",
    primaryText: "text-cyan-700",
    primaryBg: "bg-cyan-50",
    primaryBorder: "border-cyan-200",
    pillBg: "bg-cyan-50",
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-700",
    tabActiveBg: "bg-cyan-600",
    tabActiveText: "text-white",
    tabActiveBorder: "border-cyan-600",
    btnBg: "bg-cyan-600",
    btnHover: "hover:bg-cyan-700",
    btnText: "text-white",
    heroGradient: "from-cyan-50 via-white to-cyan-100",
    heroTitle: "text-cyan-950",
    heroMuted: "text-cyan-800/70",
    heroStatCard: "border-cyan-200 bg-white/90",
    heroLogoRing: "border-cyan-200 bg-white",
  },
  "Evidence Hub": {
    tagline: "Evidence Hub Â· Revenue Operations",
    primaryText: "text-indigo-700",
    primaryBg: "bg-indigo-50",
    primaryBorder: "border-indigo-200",
    pillBg: "bg-indigo-50",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-700",
    tabActiveBg: "bg-indigo-600",
    tabActiveText: "text-white",
    tabActiveBorder: "border-indigo-600",
    btnBg: "bg-indigo-600",
    btnHover: "hover:bg-indigo-700",
    btnText: "text-white",
    heroGradient: "from-indigo-50 via-white to-indigo-100",
    heroTitle: "text-indigo-950",
    heroMuted: "text-indigo-800/70",
    heroStatCard: "border-indigo-200 bg-white/90",
    heroLogoRing: "border-indigo-200 bg-white",
  },
};

const QUARTER_ORDER = ["Q1", "Q2", "Q3", "Q4"] as const;

const QUARTER_COLORS: Record<string, {
  header: string;
  headerBg: string;
  subBg: string;
  cellBg: string;
  leftBorder: string;
  totalActual: string;
  badge: string;
}> = {
  Q1: { header: "text-sky-700",     headerBg: "bg-sky-50",     subBg: "bg-sky-50/60",    cellBg: "bg-sky-50/40",    leftBorder: "border-l-2 border-sky-300",    totalActual: "text-sky-700",    badge: "bg-sky-100 text-sky-700"    },
  Q2: { header: "text-violet-700",  headerBg: "bg-violet-50",  subBg: "bg-violet-50/60", cellBg: "bg-violet-50/40", leftBorder: "border-l-2 border-violet-300", totalActual: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  Q3: { header: "text-amber-700",   headerBg: "bg-amber-50",   subBg: "bg-amber-50/60",  cellBg: "bg-amber-50/40",  leftBorder: "border-l-2 border-amber-300",  totalActual: "text-amber-700",  badge: "bg-amber-100 text-amber-700"  },
  Q4: { header: "text-emerald-700", headerBg: "bg-emerald-50", subBg: "bg-emerald-50/60",cellBg: "bg-emerald-50/40",leftBorder: "border-l-2 border-emerald-300", totalActual: "text-emerald-700",badge: "bg-emerald-100 text-emerald-700"},
};

function isFuture(q: "Q1" | "Q2" | "Q3" | "Q4"): boolean {
  return QUARTER_ORDER.indexOf(q) > QUARTER_ORDER.indexOf(CURRENT_QUARTER);
}
function isCurrent(q: "Q1" | "Q2" | "Q3" | "Q4"): boolean {
  return q === CURRENT_QUARTER;
}

const CATEGORIES: { key: RevCatKey; label: string; fullLabel: string; dot: string; text: string }[] = [
  { key: "renewal",   label: "ER", fullLabel: "Existing Renewal", dot: "bg-sky-500",    text: "text-sky-700"    },
  { key: "expansion", label: "EN", fullLabel: "Expansion",        dot: "bg-violet-500", text: "text-violet-700" },
  { key: "netNew",    label: "NN", fullLabel: "Net New",           dot: "bg-amber-500",  text: "text-amber-700"  },
];

// â”€â”€â”€ Editable Actual Cell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface EditableActualCellProps {
  value: number;
  isCustom: boolean;
  isProjected?: boolean;
  disabled?: boolean;
  colorCls: string;
  onSave: (val: number) => void;
}

function EditableActualCell({ value, isCustom, isProjected, disabled, colorCls, onSave }: EditableActualCellProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  function start() { if (disabled) return; setInput((value / 1_000_000).toFixed(3)); setEditing(true); }
  function save() { const raw = parseFloat(input.replace(/[^0-9.]/g, "")); if (!isNaN(raw) && raw >= 0) onSave(raw * 1_000_000); setEditing(false); }
  function cancel() { setEditing(false); }

  if (disabled) return <span className={`text-xs font-medium ${isCustom ? qc.header : "text-gray-500"}`}>{formatCurrency(value, true)}</span>;
  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-md border border-gray-300 bg-white px-1.5 py-0.5 shadow-sm">
          <span className="text-[10px] font-semibold text-gray-400">Â£</span>
          <input ref={inputRef} type="number" step="0.001" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className="bg-transparent w-16 text-center text-[11px] font-semibold outline-none text-gray-800" />
          <span className="text-[10px] text-gray-400">M</span>
        </div>
        <div className="flex gap-1">
          <button onClick={save} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"><Check className="w-3 h-3" /></button>
          <button onClick={cancel} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={start} title="Click to edit actual" className="group/acell inline-flex flex-col items-center gap-0.5">
      <span className={`text-xs font-semibold transition-colors ${colorCls} group-hover/acell:underline`}>
        {formatCurrency(value, true)}
        {isProjected && !isCustom && <span className="text-[9px] text-blue-500 ml-0.5">p</span>}
        {isCustom && <span className="text-[9px] text-gray-400 ml-0.5 italic">*</span>}
      </span>
      <span className="flex items-center gap-0.5 opacity-0 group-hover/acell:opacity-100 transition-opacity">
        <Pencil className="w-2.5 h-2.5 text-gray-400" />
        {isCustom && <span className="text-[8px] font-medium text-gray-400 italic">custom</span>}
      </span>
    </button>
  );
}

// â”€â”€â”€ Editable Target Cell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface EditableCellProps {
  value: number;
  isCustom: boolean;
  disabled?: boolean;
  qc: typeof QUARTER_COLORS[string];
  onSave: (val: number) => void;
}

function EditableTargetCell({ value, isCustom, disabled, qc, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  function start() { if (disabled) return; setInput(String(Math.round(value))); setEditing(true); }
  function save() { const raw = parseFloat(input.replace(/[^0-9.]/g, "")); if (!isNaN(raw) && raw >= 0) onSave(Math.round(raw)); setEditing(false); }
  function cancel() { setEditing(false); }

  if (disabled) return <span className={`text-xs font-medium ${isCustom ? qc.header : "text-gray-500"}`}>{formatCurrency(value, true)}</span>;
  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`flex items-center gap-0.5 rounded-md border bg-white px-1.5 py-0.5 shadow-sm ${qc.leftBorder.replace("border-l-2 ", "")}`}>
          <span className={`text-[10px] font-semibold ${qc.header}`}>Â£</span>
          <input ref={inputRef} type="number" step="1" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className={`bg-transparent w-16 text-center text-[11px] font-semibold outline-none ${qc.header}`} />
        </div>
        <div className="flex gap-1">
          <button onClick={save} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"><Check className="w-3 h-3" /></button>
          <button onClick={cancel} className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={start} title="Click to edit target" className="group/cell inline-flex flex-col items-center gap-0.5">
      <span className={`text-xs transition-colors ${isCustom ? `${qc.header} font-semibold` : "text-gray-500"} group-hover/cell:${qc.header} group-hover/cell:underline`}>
        {formatCurrency(value, true)}
      </span>
      <span className="flex items-center gap-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity">
        <Pencil className={`w-2.5 h-2.5 ${qc.header} opacity-50`} />
        {isCustom && <span className="text-[8px] font-medium text-gray-400 italic">custom</span>}
      </span>
    </button>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function TrackerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { access, canEdit, signOut } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load locally stored data if available
  const [inputStore, setInputStore] = useState<InputStore | null>(() => loadStore());
  const [inputLastSaved, setInputLastSaved] = useState<string | null>(() => loadLastSaved());
  const [productLogos, setProductLogos] = useState<Record<ProductTab, string | null>>(() => loadProductLogos());

  // Re-read localStorage whenever the user navigates back to this page
  useEffect(() => {
    // Initial load on mount
    setInputStore(loadStore());
    setInputLastSaved(loadLastSaved());

    function reload() {
      if (!document.hidden) {
        setInputStore(loadStore());
        setInputLastSaved(loadLastSaved());
      }
    }
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("focus", reload);
    return () => {
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("focus", reload);
    };
  }, []);

  // Returns product data merged with input-page data (input takes priority over mock)
  function getProductData(tab: ProductTab) {
    // Always load clients from the store â€” never fall back to mock clients
    const storeClients = inputStore ? storeClientsToClientExpansion(inputStore, tab) : [];

    if (inputStore) {
      const { targets, actuals } = resolveTrackerData(inputStore, tab, PRODUCT_DATA[tab]);
      if (hasInputData(inputStore, tab) || getHubSpotSync(inputStore, tab).syncedAt) {
        return { ...PRODUCT_DATA[tab], targets, actuals, clients: storeClients };
      }
    }
    return { ...PRODUCT_DATA[tab], clients: storeClients };
  }

  const initialProduct = (searchParams.get("product") as ProductTab) || "Nuro";
  const initialActiveTab = searchParams.get("tab") as "breakdown" | "clients" | "team" | "chart" | null;
  const [productTab, setProductTab] = useState<ProductTab>(
    PRODUCT_TABS.map(t => t.id).includes(initialProduct) ? initialProduct : "Nuro"
  );
  const [activeTab, setActiveTab] = useState<"breakdown" | "clients" | "team" | "chart">(
    initialActiveTab && ["breakdown", "clients", "team", "chart"].includes(initialActiveTab)
      ? initialActiveTab
      : "breakdown"
  );
  const [clientSearch, setClientSearch] = useState("");

  const hasInput = !!(inputStore && hasInputData(inputStore, productTab));
  const hasHubSpotSync = !!(inputStore && getHubSpotSync(inputStore, productTab).syncedAt);

  // â”€â”€ HubSpot Sync state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [mappingConfig, setMappingConfig] = useState<MappingConfig>(() => loadMappingConfig());
  const [mappingPanelOpen, setMappingPanelOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<ProductTab, "idle" | "syncing" | "success" | "error">>(emptyProductRecord("idle"));
  const [syncError, setSyncError] = useState<Record<ProductTab, string | null>>(emptyProductRecord<string | null>(null));
  const [lastSync, setLastSync] = useState<Record<ProductTab, string | null>>(emptyProductRecord<string | null>(null));
  const [syncStats, setSyncStats] = useState<Record<ProductTab, { totalDeals: number; skipped: number } | null>>(emptyProductRecord<{ totalDeals: number; skipped: number } | null>(null));
  const [liveActuals, setLiveActuals] = useState<Record<ProductTab, Record<string, { renewal: number; expansion: number; netNew: number }> | null>>({
    "Nuro": null, "Access Hub": null, "Evidence Hub": null
  });

  useEffect(() => {
    if (!inputStore) {
      setLastSync(emptyProductRecord<string | null>(null));
      setSyncStats(emptyProductRecord<{ totalDeals: number; skipped: number } | null>(null));
      setLiveActuals(emptyProductRecord<Record<string, { renewal: number; expansion: number; netNew: number }> | null>(null));
      return;
    }

    const nextLastSync = emptyProductRecord<string | null>(null);
    const nextStats = emptyProductRecord<{ totalDeals: number; skipped: number } | null>(null);
    const nextActuals = emptyProductRecord<Record<string, { renewal: number; expansion: number; netNew: number }> | null>(null);

    for (const product of PRODUCT_TABS.map((tab) => tab.id)) {
      const sync = getHubSpotSync(inputStore, product);
      nextLastSync[product] = sync.syncedAt
        ? new Date(sync.syncedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : null;
      nextStats[product] = sync.syncedAt ? { totalDeals: sync.totalDeals, skipped: sync.skipped } : null;
      nextActuals[product] = sync.syncedAt
        ? Object.fromEntries(
            STORE_QUARTERS.map((quarter) => [quarter, { ...sync.actuals[quarter] }]),
          ) as Record<string, { renewal: number; expansion: number; netNew: number }>
        : null;
    }

    setLastSync(nextLastSync);
    setSyncStats(nextStats);
    setLiveActuals(nextActuals);
  }, [inputStore]);

  async function syncHubSpot() {
    const tab = productTab;
    if (!supabase) {
      setSyncStatus(prev => ({ ...prev, [tab]: "error" }));
      setSyncError(prev => ({ ...prev, [tab]: "Supabase is not configured for this environment." }));
      return;
    }
    setSyncStatus(prev => ({ ...prev, [tab]: "syncing" }));
    setSyncError(prev => ({ ...prev, [tab]: null }));

    const { data, error } = await supabase.functions.invoke("hubspot-sync", {
      body: { mappingConfig, clientNamesByProduct: buildClientNamesByProduct(inputStore) },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const statusCode = error.context?.status ?? 500;
          const text = await error.context?.text();
          msg = `[${statusCode}] ${text || error.message}`;
        } catch { /* ignore */ }
      }
      setSyncStatus(prev => ({ ...prev, [tab]: "error" }));
      setSyncError(prev => ({ ...prev, [tab]: msg }));
      return;
    }

    const syncedAt = data.syncedAt ?? new Date().toISOString();
    const nextStore = inputStore ? structuredClone(inputStore) : createEmptyStore();

    for (const productResult of data.actualsByProduct ?? []) {
      const product = productResult.product as Product;
      if (!PRODUCT_TABS.some((item) => item.id === product)) continue;

      const quarterActuals = Object.fromEntries(
        STORE_QUARTERS.map((quarter) => [quarter, { renewal: 0, expansion: 0, netNew: 0 }]),
      ) as Record<string, { renewal: number; expansion: number; netNew: number }>;

      for (const item of productResult.actuals ?? []) {
        quarterActuals[item.quarter] = {
          renewal: item.renewal ?? 0,
          expansion: item.expansion ?? 0,
          netNew: item.netNew ?? 0,
        };
      }

      nextStore.hubspot.products[product] = {
        actuals: {
          Q1: { ...quarterActuals.Q1 },
          Q2: { ...quarterActuals.Q2 },
          Q3: { ...quarterActuals.Q3 },
          Q4: { ...quarterActuals.Q4 },
        },
        clientActuals: productResult.clientActuals ?? {},
        syncedAt,
        totalDeals: productResult.totalDeals ?? 0,
        skipped: productResult.skipped ?? 0,
      };
    }

    saveStore(nextStore);
    setInputStore(nextStore);
    setInputLastSaved(loadLastSaved());

    setSyncStatus((prev) => {
      const next = { ...prev };
      for (const productResult of data.actualsByProduct ?? []) {
        const product = productResult.product as ProductTab;
        if (PRODUCT_TABS.some((item) => item.id === product)) next[product] = "success";
      }
      return next;
    });

    setTimeout(() => {
      setSyncStatus((prev) => {
        const next = { ...prev };
        for (const productResult of data.actualsByProduct ?? []) {
          const product = productResult.product as ProductTab;
          if (PRODUCT_TABS.some((item) => item.id === product)) next[product] = "idle";
        }
        return next;
      });
    }, 4000);
  }

  function handleMappingSave(cfg: MappingConfig) {
    setMappingConfig(cfg);
    saveMappingConfig(cfg);
    setMappingPanelOpen(false);
  }

  const isSyncing = syncStatus[productTab] === "syncing";
  const syncSuccess = syncStatus[productTab] === "success";
  const syncErr = syncError[productTab];
  const syncStat = syncStats[productTab];
  const lastSyncTime = lastSync[productTab];

  const [customActualsAll, setCustomActualsAll] = useState<Record<ProductTab, Record<string, Partial<Record<RevCatKey, number>>>>>({
    "Nuro": {}, "Access Hub": {}, "Evidence Hub": {}
  });
  const customActuals = customActualsAll[productTab];

  function getActual(qIndex: number) {
    const q = QUARTER_ORDER[qIndex];
    // Priority: inline custom > input-page data > mock
    const productData = getProductData(productTab);
    const base = productData.actuals[qIndex];
    const overrides = customActuals[q];
    if (overrides) return { ...base, renewal: overrides.renewal ?? base.renewal, expansion: overrides.expansion ?? base.expansion, netNew: overrides.netNew ?? base.netNew };
    return base;
  }

  function isCustomActual(q: string, cat: RevCatKey): boolean { return customActuals[q]?.[cat] !== undefined; }
  function saveActual(q: string, cat: RevCatKey, val: number) {
    setCustomActualsAll(prev => ({ ...prev, [productTab]: { ...prev[productTab], [q]: { ...prev[productTab][q], [cat]: val } } }));
  }
  function getTarget(q: string, cat: RevCatKey): number {
    const productData = getProductData(productTab);
    return productData.targets[QUARTER_ORDER.indexOf(q as "Q1"|"Q2"|"Q3"|"Q4")][cat];
  }

  function saveClientQuarterTarget(clientName: string, quarter: "Q1" | "Q2" | "Q3" | "Q4", category: "er" | "en" | "nn", value: number) {
    const currentStore = inputStore ?? createEmptyStore();
    const clientRecord = currentStore.clients[productTab]?.[clientName];
    if (!clientRecord) return;

    const nextStore: InputStore = structuredClone(currentStore);
    const months = QUARTER_MONTHS[quarter];
    const monthKey = category === "er" ? "erTarget" : category === "en" ? "enTarget" : "nnTarget";
    const existingValues = months.map((month) => nextStore.clients[productTab][clientName].months[month]?.[monthKey] ?? 0);
    const existingTotal = existingValues.reduce((sum, amount) => sum + amount, 0);

    const distributedValues = existingTotal > 0
      ? existingValues.map((amount, index) => {
          if (index === months.length - 1) return 0;
          return Math.round((amount / existingTotal) * value);
        })
      : months.map(() => Math.floor(value / months.length));

    const assignedBeforeLast = distributedValues.slice(0, -1).reduce((sum, amount) => sum + amount, 0);
    distributedValues[months.length - 1] = Math.max(0, value - assignedBeforeLast);

    months.forEach((month, index) => {
      nextStore.clients[productTab][clientName].months[month] = {
        ...nextStore.clients[productTab][clientName].months[month],
        [monthKey]: value > 0 ? distributedValues[index] : null,
      };
    });

    if (category === "er") nextStore.clients[productTab][clientName].erTarget = value > 0 ? value : null;
    if (category === "en") nextStore.clients[productTab][clientName].enTarget = value > 0 ? value : null;
    if (category === "nn") nextStore.clients[productTab][clientName].nnTarget = value > 0 ? value : null;

    recalculateProductMonthlyTargetsFromClients(nextStore, productTab);
    saveStore(nextStore);
    setInputStore(nextStore);
    setInputLastSaved(loadLastSaved());
    window.dispatchEvent(new Event("focus"));
  }

  function addNetNewClient(clientName: string, csm: string, quarterTargets: Record<"Q1" | "Q2" | "Q3" | "Q4", number>) {
    const name = clientName.trim();
    if (!name) return;

    const currentStore = inputStore ?? createEmptyStore();
    const nextStore: InputStore = structuredClone(currentStore);
    const existingRecord = nextStore.clients[productTab]?.[name];

    if (!nextStore.clients[productTab]) {
      nextStore.clients[productTab] = {};
    }

    if (!existingRecord) {
      const months = Object.fromEntries(MONTHS.map((month) => [month, emptyClientMonth()])) as Record<(typeof MONTHS)[number], ReturnType<typeof emptyClientMonth>>;
      nextStore.clients[productTab][name] = {
        name,
        csm: csm.trim() || "—",
        am: "—",
        erTarget: null,
        enTarget: null,
        nnTarget: null,
        months,
      };
    } else if (csm.trim()) {
      nextStore.clients[productTab][name].csm = csm.trim();
    }

    for (const quarter of Object.keys(quarterTargets) as ("Q1" | "Q2" | "Q3" | "Q4")[]) {
      saveQuarterIntoStore(nextStore, name, quarter, "nn", quarterTargets[quarter]);
    }

    nextStore.clients[productTab][name].nnTarget = Object.values(quarterTargets).reduce((sum, amount) => sum + amount, 0) || null;
    recalculateProductMonthlyTargetsFromClients(nextStore, productTab);
    saveStore(nextStore);
    setInputStore(nextStore);
    setInputLastSaved(loadLastSaved());
    window.dispatchEvent(new Event("focus"));
  }

  function saveQuarterIntoStore(
    store: InputStore,
    clientName: string,
    quarter: "Q1" | "Q2" | "Q3" | "Q4",
    category: "er" | "en" | "nn",
    value: number,
  ) {
    const months = QUARTER_MONTHS[quarter];
    const monthKey = category === "er" ? "erTarget" : category === "en" ? "enTarget" : "nnTarget";
    const existingValues = months.map((month) => store.clients[productTab][clientName].months[month]?.[monthKey] ?? 0);
    const existingTotal = existingValues.reduce((sum, amount) => sum + amount, 0);
    const distributedValues = existingTotal > 0
      ? existingValues.map((amount, index) => (index === months.length - 1 ? 0 : Math.round((amount / existingTotal) * value)))
      : months.map(() => Math.floor(value / months.length));

    const assignedBeforeLast = distributedValues.slice(0, -1).reduce((sum, amount) => sum + amount, 0);
    distributedValues[months.length - 1] = Math.max(0, value - assignedBeforeLast);

    months.forEach((month, index) => {
      store.clients[productTab][clientName].months[month] = {
        ...store.clients[productTab][clientName].months[month],
        [monthKey]: value > 0 ? distributedValues[index] : null,
      };
    });
  }

  const annualTarget = QUARTER_ORDER.reduce((s, q) => s + getTarget(q, "renewal") + getTarget(q, "expansion") + getTarget(q, "netNew"), 0);
  const a0 = getActual(0); const a1 = getActual(1);
  const ytdActual = a0.renewal + a0.expansion + a0.netNew + a1.renewal + a1.expansion + a1.netNew;
  const ytdTarget = getTarget("Q1","renewal")+getTarget("Q1","expansion")+getTarget("Q1","netNew")+getTarget("Q2","renewal")+getTarget("Q2","expansion")+getTarget("Q2","netNew");
  const ytdRenewalActual = a0.renewal + a1.renewal;
  const ytdRenewalTarget = getTarget("Q1","renewal") + getTarget("Q2","renewal");
  const ytdRenewalPct = attainmentPct(ytdRenewalActual, ytdRenewalTarget);
  const q2Renewal = a1.renewal;
  const q2RenewTarget = getTarget("Q2","renewal");
  const q2ExpPct = attainmentPct(a1.expansion, getTarget("Q2","expansion"));
  const customActualCount = Object.values(customActuals).reduce((s,q)=>s+Object.keys(q??{}).length,0);
  const pLabel = PRODUCT_LABELS[productTab];
  const productLogo = productLogos[productTab];

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("product", productTab);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
  }, [productTab, activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    localStorage.setItem(PRODUCT_LOGO_STORAGE_KEY, JSON.stringify(productLogos));
  }, [productLogos]);

  function triggerLogoPicker() {
    if (!canEdit) return;
    logoInputRef.current?.click();
  }

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canEdit) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      setProductLogos((prev) => ({ ...prev, [productTab]: result }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeProductLogo() {
    if (!canEdit) return;
    setProductLogos((prev) => ({ ...prev, [productTab]: null }));
  }

  function attColorLight(pct: number) {
    if (pct >= 100) return "text-emerald-700";
    if (pct >= 85) return "text-amber-600";
    return "text-rose-600";
  }
  function attBarColor(pct: number) {
    if (pct >= 100) return "bg-emerald-500";
    if (pct >= 85) return "bg-amber-400";
    return "bg-rose-500";
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* â”€â”€ Top Nav Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-0">
            <div className="flex items-center gap-2 pr-6 border-r border-gray-200 mr-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow">
                <span className="text-white font-black text-[11px] tracking-tight">AI</span>
              </div>
              <span className="text-gray-800 font-bold text-sm tracking-tight hidden sm:block">Access Infinity</span>
            </div>
            {/* Global Dashboard tab */}
            <button onClick={() => navigate("/")}
              className="flex items-center gap-1.5 px-4 py-[18px] text-sm font-semibold border-b-2 border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300 -mb-px transition-all"
            >
              <Globe2 className="w-3.5 h-3.5" />
              Global Dashboard
            </button>
            {PRODUCT_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setProductTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-[18px] text-sm font-semibold transition-all border-b-2 -mb-px ${
                  productTab === tab.id
                    ? `${pLabel.tabActiveBorder} ${pLabel.primaryText}`
                    : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Actions */}
            <div className="flex items-center gap-2">
              {inputLastSaved && (
                <span className="hidden md:flex items-center gap-1 text-xs text-violet-700 font-medium">
                  Last updated {inputLastSaved}
                </span>
              )}
              {canEdit && (
                <button onClick={() => navigate("/clients")}
                  className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                >
                  <UserPlus className="w-3 h-3" /> Dashboard Inputs
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-violet-200"
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
                className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
              >
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </div>
        </div>
      </div>

      {/* â”€â”€ Hero Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`w-full bg-gradient-to-r ${pLabel.heroGradient} py-8 px-4 md:px-6 border-b border-gray-200`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-24 h-24 shrink-0 rounded-3xl border-2 ${pLabel.heroLogoRing} shadow-sm overflow-hidden flex items-center justify-center`}>
              {productLogo ? (
                <img src={productLogo} alt={`${productTab} logo`} className="w-full h-full object-contain p-3" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-3">
                  <ImagePlus className={`w-7 h-7 ${pLabel.primaryText}`} />
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Add Logo</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold uppercase tracking-widest ${pLabel.heroMuted}`}>{pLabel.tagline}</span>
              </div>
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${pLabel.heroTitle}`}>
                Digital RevTrack
              </h1>
                <p className={`text-sm mt-1 ${pLabel.heroMuted}`}>Revenue Operations · Quarterly breakdown across ER / EN / NN</p>
                {!canEdit && (
                  <div className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                    Read-only mode
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={triggerLogoPicker}
                    disabled={!canEdit}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${pLabel.primaryBorder} ${pLabel.primaryBg} ${pLabel.primaryText}`}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {productLogo ? "Change logo" : "Upload logo"}
                  </button>
                  {productLogo && (
                    <button
                      onClick={removeProductLogo}
                      disabled={!canEdit}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                    <X className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl border px-5 py-4 shadow-sm ${pLabel.heroStatCard}`}>
              <div className="text-right">
                <div className={`text-xs uppercase tracking-wider mb-0.5 ${pLabel.heroMuted}`}>Annual Target</div>
                <div className={`text-2xl font-bold ${pLabel.heroTitle}`}>{formatCurrency(annualTarget, true)}</div>
              </div>
            </div>
            <div className={`rounded-2xl border px-5 py-4 shadow-sm ${pLabel.heroStatCard}`}>
              <div className="text-right">
                <div className={`text-xs uppercase tracking-wider mb-0.5 ${pLabel.heroMuted}`}>YTD Progress</div>
                <div className={`text-2xl font-bold ${attainmentPct(ytdActual, annualTarget) >= 100 ? "text-emerald-600" : pLabel.heroTitle}`}>
                  {attainmentPct(ytdActual, annualTarget)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* â”€â”€ Banner Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`bg-white rounded-2xl border ${pLabel.primaryBorder} shadow-sm px-6 py-5 flex items-center justify-between`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold ${pLabel.primaryText} uppercase tracking-wider`}>Full Year FY26 Target</span>
                {hasInput && (
                  <span className={`text-[10px] ${pLabel.badgeBg} ${pLabel.badgeText} px-1.5 py-0.5 rounded-full font-medium`}>
                    Input Data
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`text-3xl font-bold ${pLabel.primaryText} tracking-tight`}>{formatCurrency(annualTarget, true)}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1">All 4 quarters Â· Renewal + Expansion + Net New</div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Progress</div>
              <div className={`text-2xl font-bold ${attColorLight(attainmentPct(ytdActual,annualTarget))}`}>{attainmentPct(ytdActual,annualTarget)}%</div>
              <div className="text-[11px] text-gray-400 mt-0.5">of annual</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">YTD Full Year Target Achievement</div>
              <div className="text-3xl font-bold text-emerald-700 tracking-tight">{formatCurrency(ytdRenewalActual, true)}</div>
              <div className="text-xs text-gray-400 mt-1">vs {formatCurrency(ytdRenewalTarget, true)} target Â· {ytdRenewalPct}% attainment</div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className={`text-2xl font-bold ${attColorLight(ytdRenewalPct)}`}>{ytdRenewalPct}%</div>
              <div className="text-[11px] text-gray-400 mt-0.5">att. rate</div>
              <div className={`text-xs mt-1 font-semibold ${ytdRenewalActual >= ytdRenewalTarget ? "text-emerald-600" : "text-rose-600"}`}>
                {ytdRenewalActual >= ytdRenewalTarget
                  ? `+${formatCurrency(ytdRenewalActual - ytdRenewalTarget, true)}`
                  : `-${formatCurrency(ytdRenewalTarget - ytdRenewalActual, true)}`}
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Quarterly Mini-Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Full Year Quarterly Target &amp; Actual Distribution</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUARTER_ORDER.map((q, i) => {
              const a = getActual(i);
              const qTotal = getTarget(q,"renewal")+getTarget(q,"expansion")+getTarget(q,"netNew");
              const qActual = a.renewal+a.expansion+a.netNew;
              const qPct = attainmentPct(qActual,qTotal);
              const future = isFuture(q);
              const current = isCurrent(q);
              const qc = QUARTER_COLORS[q];
              return (
                <div key={q} className={`bg-white rounded-xl border shadow-sm px-4 py-4 flex flex-col gap-2 ${future ? `${qc.leftBorder} border-gray-200 bg-gray-50/40` : `${qc.leftBorder} border-gray-100`}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${qc.header}`}>{q}</span>
                      {current && <span className="text-[9px] font-semibold bg-violet-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Live</span>}
                      {future && <span className="text-[9px] font-semibold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Target Only</span>}
                      {a.isProjected && !future && <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Proj.</span>}
                    </div>
                    <span className={`text-sm font-bold ${future ? "text-gray-300" : attColorLight(qPct)}`}>{future ? "â€”" : `${qPct}%`}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    {!future && <div className={`h-full rounded-full transition-all duration-700 ${attBarColor(qPct)}`} style={{ width: `${Math.min(qPct,100)}%` }} />}
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Target: <span className="text-gray-600 font-medium">{formatCurrency(qTotal,true)}</span></span>
                    <span className="text-gray-400">Act: <span className={`font-semibold ${future?"text-gray-300":attColorLight(qPct)}`}>{future?"â€”":formatCurrency(qActual,true)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* â”€â”€ KPI Pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricPill label="YTD Revenue" value={formatCurrency(ytdActual,true)} sub={`vs ${formatCurrency(ytdTarget,true)} target`} pct={attainmentPct(ytdActual,ytdTarget)} color="amber" />
          <MetricPill label="Annual Target" value={formatCurrency(annualTarget,true)} sub="FY26 full-year goal" color="blue" />
          <MetricPill label="Q2 Renewal Att." value={`${attainmentPct(q2Renewal,q2RenewTarget)}%`} sub={`${formatCurrency(q2Renewal,true)} of ${formatCurrency(q2RenewTarget,true)}`} color="emerald" />
          <MetricPill label="Q2 Expansion Att." value={`${q2ExpPct}%`} sub={`${formatCurrency(a1.expansion,true)} of ${formatCurrency(getTarget("Q2","expansion"),true)}`} color={q2ExpPct>=100?"emerald":"amber"} />
        </div>

        {/* â”€â”€ Tab Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 w-fit border border-gray-200">
          {[
            { id: "breakdown" as const, label: "ER / EN / NN",      icon: TableProperties },
            { id: "clients"   as const, label: "Revenue by Client",    icon: Users           },
            { id: "team"      as const, label: "Revenue by Team Member", icon: UserCircle2     },
            { id: "chart"     as const, label: "Revenue Chart",          icon: TrendingUp      },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? `${pLabel.tabActiveBg} ${pLabel.tabActiveText} shadow-sm` : "text-gray-500 hover:text-gray-800 hover:bg-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* â”€â”€ ER/EN/NN Breakdown Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === "breakdown" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <div className="hidden md:flex items-center gap-4 text-[11px]">
                {CATEGORIES.map((c) => (
                  <span key={c.key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${c.dot}`} />
                    <span className={`font-bold ${c.text}`}>{c.label}</span>
                    <span className="text-gray-400">{c.fullLabel}</span>
                  </span>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden md:flex items-center gap-1 text-gray-400 text-[10px]">
                  Targets update from Revenue by Client Â· Actuals can be edited here
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-gray-400 font-semibold uppercase tracking-wider text-[11px]" style={{ width: 150 }}>Category</th>
                    {QUARTER_ORDER.map((q) => {
                      const future = isFuture(q); const current = isCurrent(q); const qc = QUARTER_COLORS[q];
                      return (
                        <th key={q} colSpan={3} className={`text-center py-3 font-bold uppercase tracking-wider text-[11px] ${qc.leftBorder} ${future ? "text-gray-300 bg-gray-50/50" : `${qc.header} ${qc.headerBg}`}`}>
                          <span className="inline-flex items-center justify-center gap-1.5 px-2">
                            {q}
                            {current && <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">Live</span>}
                            {future && <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">Upcoming</span>}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2" />
                    {QUARTER_ORDER.map((q) => {
                      const future = isFuture(q); const qc = QUARTER_COLORS[q];
                      return (
                        <>
                          <th key={`${q}-t`} className={`px-3 py-2 text-center font-semibold text-[11px] ${qc.leftBorder} ${future ? "text-gray-300 bg-gray-50/50" : `text-gray-500 ${qc.subBg}`}`}>
                            <span className="flex items-center justify-center gap-1">Target</span>
                          </th>
                          <th key={`${q}-a`} className={`px-3 py-2 text-center font-semibold text-[11px] ${future ? "text-gray-300 bg-gray-50/50" : `text-gray-500 ${qc.subBg}`}`}>Actual</th>
                          <th key={`${q}-p`} className={`px-3 py-2 text-center font-semibold text-[11px] ${future ? "text-gray-300 bg-gray-50/50" : `text-gray-500 ${qc.subBg}`}`}>Att.%</th>
                        </>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {CATEGORIES.map(({ key, label, fullLabel, dot, text }) => (
                    <tr key={key} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                          <span className={`text-sm font-bold ${text} w-7 shrink-0`}>{label}</span>
                          <span className="text-gray-400 text-[11px]">{fullLabel}</span>
                        </div>
                      </td>
                      {QUARTER_ORDER.map((q, i) => {
                        const future = isFuture(q);
                        const liveA = getActual(i);
                        const productData = getProductData(productTab);
                        const isProj = !isCustomActual(q,key) && productData.actuals[i].isProjected && !future;
                        const t = getTarget(q,key);
                        const a = liveA[key] as number;
                        const pct = attainmentPct(a,t);
                        const colorCls = attColorLight(pct);
                        const barCls = attBarColor(pct);
                        const qc = QUARTER_COLORS[q];
                        return (
                          <>
                            <td key={`${q}-t`} className={`px-3 py-3 text-center ${qc.leftBorder} ${future ? "bg-gray-50/50" : qc.cellBg}`}>
                              <span className="text-xs text-gray-600 font-medium">{formatCurrency(t, true)}</span>
                            </td>
                            <td key={`${q}-a`} className={`px-3 py-3 text-center ${future ? "bg-gray-50/50" : qc.cellBg}`}>
                              <EditableActualCell value={a} isCustom={isCustomActual(q,key)} isProjected={isProj}
                                  disabled={future || !canEdit} colorCls={isProj ? "text-blue-600" : colorCls} onSave={(v) => saveActual(q,key,v)} />
                            </td>
                            <td key={`${q}-p`} className={`px-3 py-3 text-center ${future ? "bg-gray-50/50" : qc.cellBg}`}>
                              {future ? <span className="text-gray-300">â€”</span> : (
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`font-bold text-[11px] ${colorCls}`}>{pct}%</span>
                                  <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${Math.min(pct,100)}%` }} />
                                  </div>
                                </div>
                              )}
                            </td>
                          </>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-4"><span className="text-gray-700 font-bold text-xs uppercase tracking-wider">Total</span></td>
                    {QUARTER_ORDER.map((q, i) => {
                      const future = isFuture(q);
                      const a = getActual(i);
                      const qTgt = getTarget(q,"renewal")+getTarget(q,"expansion")+getTarget(q,"netNew");
                      const qAct = a.renewal+a.expansion+a.netNew;
                      const qPct = attainmentPct(qAct,qTgt);
                      const qc = QUARTER_COLORS[q];
                      return (
                        <>
                          <td key={`${q}-tot-t`} className={`px-3 py-4 text-center ${qc.leftBorder} ${future ? "bg-gray-50/50" : qc.cellBg}`}>
                            <span className="font-semibold text-gray-600">{formatCurrency(qTgt,true)}</span>
                          </td>
                          <td key={`${q}-tot-a`} className={`px-3 py-4 text-center ${future ? "bg-gray-50/50" : qc.cellBg}`}>
                            <span className={`font-bold ${future ? "text-gray-300" : qc.totalActual}`}>{future ? "â€”" : formatCurrency(qAct,true)}</span>
                          </td>
                          <td key={`${q}-tot-p`} className={`px-3 py-4 text-center ${future ? "bg-gray-50/50" : qc.cellBg}`}>
                            {future ? <span className="text-gray-300">â€”</span> : (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`font-bold text-[11px] ${attColorLight(qPct)}`}>{qPct}%</span>
                                <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${attBarColor(qPct)}`} style={{ width: `${Math.min(qPct,100)}%` }} />
                                </div>
                              </div>
                            )}
                          </td>
                        </>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeTab === "chart" && <RevenueChart />}

        {activeTab === "clients" && (
          <ClientRevenueTable
            clients={getProductData(productTab).clients}
            productTab={productTab}
            clientSearch={clientSearch}
            setClientSearch={setClientSearch}
            attColorLight={attColorLight}
            attBarColor={attBarColor}
          />
        )}

        {activeTab === "team" && (
          <TeamMemberRevenueTable
            clients={getProductData(productTab).clients}
            productTab={productTab}
            attColorLight={attColorLight}
            attBarColor={attBarColor}
            canEdit={canEdit}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-[11px] text-gray-400">
          <span>
            {hasInput
              ? `Showing client targets Â· saved ${inputLastSaved ?? ""}`
              : "Showing mock data - use the Clients page to load real values"}
          </span>
        </div>
      </div>

      <MappingConfigPanel
        open={mappingPanelOpen}
        config={mappingConfig}
        onClose={() => setMappingPanelOpen(false)}
        onSave={handleMappingSave}
      />
    </div>
  );
}




