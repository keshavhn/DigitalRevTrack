/**
 * Shared data store — persists to localStorage.
 * Client and dashboard pages use this store.
 * Input is monthly; TrackerPage aggregates months → quarters.
 */

export type Month =
  | "Jan" | "Feb" | "Mar"
  | "Apr" | "May" | "Jun"
  | "Jul" | "Aug" | "Sep"
  | "Oct" | "Nov" | "Dec";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type Product = "Nuro" | "Access Hub" | "Evidence Hub";

export const PRODUCTS: Product[] = ["Nuro", "Access Hub", "Evidence Hub"];
export const MONTHS: Month[] = [
  "Jan", "Feb", "Mar",
  "Apr", "May", "Jun",
  "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec",
];
export const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

/** Maps each quarter to its constituent months (FY Aug–Jul) */
export const QUARTER_MONTHS: Record<Quarter, Month[]> = {
  Q1: ["Aug", "Sep", "Oct"],
  Q2: ["Nov", "Dec", "Jan"],
  Q3: ["Feb", "Mar", "Apr"],
  Q4: ["May", "Jun", "Jul"],
};

/** Months in fiscal-year order (Aug → Jul) for display purposes */
export const FY_MONTHS: Month[] = [
  "Aug", "Sep", "Oct",
  "Nov", "Dec", "Jan",
  "Feb", "Mar", "Apr",
  "May", "Jun", "Jul",
];

/** Maps a month back to its quarter (FY Aug–Jul) */
export const MONTH_TO_QUARTER: Record<Month, Quarter> = {
  Aug: "Q1", Sep: "Q1", Oct: "Q1",
  Nov: "Q2", Dec: "Q2", Jan: "Q2",
  Feb: "Q3", Mar: "Q3", Apr: "Q3",
  May: "Q4", Jun: "Q4", Jul: "Q4",
};

export interface MonthCellData {
  erTarget: number | null;
  erActual: number | null;
  enTarget: number | null;
  enActual: number | null;
  nnTarget: number | null;
  nnActual: number | null;
}

// Legacy alias for components that import QuarterCellData
export type QuarterCellData = MonthCellData;

/** Per-client monthly ER/EN data (NN stays aggregate) */
export interface ClientMonthData {
  erTarget: number | null;
  erActual: number | null;
  enTarget: number | null;
  enActual: number | null;
  nnTarget: number | null;
  nnActual: number | null;
}

/** Client metadata */
export interface ClientRecord {
  name: string;
  erTarget: number | null;  // Annual ER target for this client
  enTarget: number | null;  // Annual EN target for this client
  nnTarget: number | null;  // Annual NN target for this client
  csm: string;
  am: string;
  months: Record<Month, ClientMonthData>;
}

export interface HubSpotQuarterActuals {
  renewal: number;
  expansion: number;
  netNew: number;
}

export interface HubSpotProductSync {
  actuals: Record<Quarter, HubSpotQuarterActuals>;
  clientActuals: Record<string, Record<Quarter, number>>;
  syncedAt: string | null;
  totalDeals: number;
  skipped: number;
}

export interface HubSpotSyncStore {
  products: Record<Product, HubSpotProductSync>;
}

/** Main store shape */
export interface InputStore {
  /** Aggregate monthly ER/EN/NN per product */
  monthly: Record<Product, Record<Month, MonthCellData>>;
  /** Client-level monthly ER/EN per product */
  clients: Record<Product, Record<string, ClientRecord>>; // keyed by client name
  /** Persisted quarterly HubSpot actuals overrides per product */
  hubspot: HubSpotSyncStore;
}

const STORAGE_KEY = "ai_revenue_input_data_v4";
const LAST_SAVED_KEY = "ai_revenue_input_saved_at";

const IMPORTED_FY2526_ACTUALS: Partial<
  Record<Product, Record<string, Partial<Record<Quarter, { er?: number; en?: number }>>>>
> = {
  "Access Hub": {
    "Astellas": { Q2: { en: 7895 } },
    "AstraZeneca": { Q1: { er: 525000, en: 24813 }, Q2: { en: 23333 } },
    "Boehringer Ingelheim": { Q2: { er: 25217, en: 8696 } },
    "MSD": { Q1: { er: 47653, en: 54537 }, Q2: { en: 160392 } },
    "Pfizer": { Q1: { en: 134135 }, Q2: { er: 622398, en: 278195 } },
  },
  "Evidence Hub": {
    "Pfizer": { Q2: { er: 650933, en: 109217 } },
    "Regeneron": { Q1: { en: 42857 } },
    "Sanofi": { Q1: { en: 478195 }, Q2: { en: 200451 } },
    "Teva": { Q2: { en: 75188 } },
    "UCB": { Q2: { er: 17391 } },
  },
  "Nuro": {
    "AstraZeneca": { Q1: { er: 176000, en: 112300 } },
    "BioNtech": { Q2: { er: 142065, en: 49239 } },
    "Boehringer Ingelheim": { Q1: { er: 109952 } },
    "Genmab": { Q1: { en: 8579 }, Q2: { er: 109624, en: 55789 } },
    "GSK": { Q2: { er: 129000 } },
    "Janssen": { Q2: { er: 67504, en: 154301 } },
    "Jazz": { Q1: { er: 138000 } },
    "Lilly": { Q3: { er: 293383 } },
    "MSD": { Q3: { er: 160677, en: 2857 } },
    "Otsuka": { Q2: { er: 85000 } },
    "Sanofi": { Q1: { en: 41739 } },
    "Sobi": { Q1: { er: 57157 } },
    "UCB": { Q2: { er: 171304, en: 72174 }, Q3: { en: 32307 } },
  },
};

const IMPORTED_FY2526_NN_ACTUALS: Partial<
  Record<Product, Record<string, { am: string; quarterActuals: Partial<Record<Quarter, number>> }>>
> = {
  "Access Hub": {
    "Novartis": {
      am: "Russ",
      quarterActuals: { Q1: 264326 },
    },
  },
  "Evidence Hub": {
    "Alcon": {
      am: "Vanit",
      quarterActuals: { Q2: 205263 },
    },
    "Immunocore": {
      am: "Ali",
      quarterActuals: { Q3: 110000 },
    },
  },
  "Nuro": {
    "Alfasigma": {
      am: "Rob",
      quarterActuals: { Q2: 82609 },
    },
    "Ono Pharmaceuticals": {
      am: "Ali",
      quarterActuals: { Q2: 80000 },
    },
    "Almirall": {
      am: "Pawan",
      quarterActuals: { Q2: 62609 },
    },
    "Revolution Medicine": {
      am: "Rob",
      quarterActuals: { Q2: 86654 },
    },
  },
};

export function emptyCell(): MonthCellData {
  return { erTarget: null, erActual: null, enTarget: null, enActual: null, nnTarget: null, nnActual: null };
}

export function emptyClientMonth(): ClientMonthData {
  return { erTarget: null, erActual: null, enTarget: null, enActual: null, nnTarget: null, nnActual: null };
}

export function emptyHubSpotQuarterActuals(): HubSpotQuarterActuals {
  return { renewal: 0, expansion: 0, netNew: 0 };
}

export function createEmptyHubSpotProductSync(): HubSpotProductSync {
  return {
    actuals: {
      Q1: emptyHubSpotQuarterActuals(),
      Q2: emptyHubSpotQuarterActuals(),
      Q3: emptyHubSpotQuarterActuals(),
      Q4: emptyHubSpotQuarterActuals(),
    },
    clientActuals: {},
    syncedAt: null,
    totalDeals: 0,
    skipped: 0,
  };
}

export function createEmptyHubSpotStore(): HubSpotSyncStore {
  return {
    products: {
      "Nuro": createEmptyHubSpotProductSync(),
      "Access Hub": createEmptyHubSpotProductSync(),
      "Evidence Hub": createEmptyHubSpotProductSync(),
    },
  };
}

export function createEmptyStore(): InputStore {
  const monthly: Partial<Record<Product, Record<Month, MonthCellData>>> = {};
  const clients: Partial<Record<Product, Record<string, ClientRecord>>> = {};
  for (const p of PRODUCTS) {
    const productData: Partial<Record<Month, MonthCellData>> = {};
    for (const m of MONTHS) productData[m] = emptyCell();
    monthly[p] = productData as Record<Month, MonthCellData>;
    clients[p] = {};
  }
  return {
    monthly: monthly as Record<Product, Record<Month, MonthCellData>>,
    clients: clients as Record<Product, Record<string, ClientRecord>>,
    hubspot: createEmptyHubSpotStore(),
  };
}

function applyImportedFy2526Actuals(store: InputStore): void {
  for (const product of PRODUCTS) {
    const productImports = IMPORTED_FY2526_ACTUALS[product];
    const nnImports = IMPORTED_FY2526_NN_ACTUALS[product];

    for (const [clientName, quarterMap] of Object.entries(productImports ?? {})) {
      const record = store.clients[product]?.[clientName];
      if (!record) continue;

      for (const month of MONTHS) {
        record.months[month] = {
          ...emptyClientMonth(),
          ...record.months[month],
          erActual: null,
          enActual: null,
        };
      }

      for (const [quarter, values] of Object.entries(quarterMap) as [Quarter, { er?: number; en?: number }][]) {
        const months = QUARTER_MONTHS[quarter];
        const firstMonth = months[0];

        if (values.er !== undefined) {
          record.months[firstMonth] = {
            ...record.months[firstMonth],
            erActual: Math.round(values.er),
          };
        }

        if (values.en !== undefined) {
          record.months[firstMonth] = {
            ...record.months[firstMonth],
            enActual: Math.round(values.en),
          };
        }
      }
    }

    for (const [clientName, nnImport] of Object.entries(nnImports ?? {})) {
      let record = store.clients[product]?.[clientName];
      if (!record) {
        const months = {} as Record<Month, ClientMonthData>;
        for (const month of MONTHS) {
          months[month] = emptyClientMonth();
        }
        record = {
          name: clientName,
          erTarget: null,
          enTarget: null,
          nnTarget: null,
          csm: "—",
          am: nnImport.am || "—",
          months,
        };
        store.clients[product][clientName] = record;
      }

      record.am = nnImport.am || record.am || "—";

      for (const month of MONTHS) {
        record.months[month] = {
          ...emptyClientMonth(),
          ...record.months[month],
          nnActual: null,
        };
      }

      for (const [quarter, value] of Object.entries(nnImport.quarterActuals) as [Quarter, number][]) {
        const months = QUARTER_MONTHS[quarter];
        const firstMonth = months[0];
        record.months[firstMonth] = {
          ...record.months[firstMonth],
          nnActual: Math.round(value),
        };
      }
    }

    recalculateProductMonthlyTargetsFromClients(store, product);
  }
}

export function loadStore(): InputStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate that it's the v4 format (has monthly + clients keys)
    if (!parsed.monthly || !parsed.clients) return null;
    if (!parsed.monthly["Nuro"]["Jan"]) return null;
    // Ensure all products have required entries and migrate older shapes.
    const store = parsed as InputStore;
    for (const p of PRODUCTS) {
      if (!store.clients[p]) store.clients[p] = {};
      for (const [clientName, record] of Object.entries(store.clients[p])) {
        if (["new client - novartis"].includes(clientName.trim().toLowerCase())) {
          delete store.clients[p][clientName];
          continue;
        }
        record.nnTarget ??= null;
        for (const month of MONTHS) {
          record.months[month] = {
            ...emptyClientMonth(),
            ...record.months[month],
          };
        }
      }
    }
    if (!store.hubspot?.products) {
      store.hubspot = createEmptyHubSpotStore();
    }
    for (const p of PRODUCTS) {
      const existing = store.hubspot.products[p];
      store.hubspot.products[p] = {
        ...createEmptyHubSpotProductSync(),
        ...existing,
        actuals: {
          Q1: { ...emptyHubSpotQuarterActuals(), ...existing?.actuals?.Q1 },
          Q2: { ...emptyHubSpotQuarterActuals(), ...existing?.actuals?.Q2 },
          Q3: { ...emptyHubSpotQuarterActuals(), ...existing?.actuals?.Q3 },
          Q4: { ...emptyHubSpotQuarterActuals(), ...existing?.actuals?.Q4 },
        },
        clientActuals: existing?.clientActuals ?? {},
      };
    }
    applyImportedFy2526Actuals(store);
    return store;
  } catch {
    return null;
  }
}

export function saveStore(store: InputStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  localStorage.setItem(LAST_SAVED_KEY, new Date().toISOString());
}

export function loadLastSaved(): string | null {
  const raw = localStorage.getItem(LAST_SAVED_KEY);
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function clearStore(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_SAVED_KEY);
}

export function hasHubSpotActuals(store: InputStore, product: Product): boolean {
  const sync = store.hubspot.products[product];
  return QUARTERS.some((quarter) => {
    const actuals = sync.actuals[quarter];
    return actuals.renewal !== 0 || actuals.expansion !== 0 || actuals.netNew !== 0;
  });
}

export function getHubSpotSync(store: InputStore, product: Product): HubSpotProductSync {
  return store.hubspot.products[product] ?? createEmptyHubSpotProductSync();
}

/** Returns true if any data has been entered for a product */
export function hasInputData(store: InputStore, product: Product): boolean {
  return MONTHS.some(m => {
    const c = store.monthly[product][m];
    return Object.values(c).some(v => v !== null && v !== 0);
  }) || Object.keys(store.clients[product] ?? {}).length > 0;
}

/** Aggregate all months in a quarter for a product */
function aggregateQuarter(
  store: InputStore,
  product: Product,
  quarter: Quarter
): MonthCellData {
  const months = QUARTER_MONTHS[quarter];
  const result: MonthCellData = emptyCell();
  for (const m of months) {
    const c = store.monthly[product][m];
    (['erTarget','erActual','enTarget','enActual','nnTarget','nnActual'] as (keyof MonthCellData)[]).forEach(k => {
      if (c[k] !== null) {
        result[k] = (result[k] ?? 0) + (c[k] as number);
      }
    });
  }
  return result;
}

/** Convert store client records to ClientExpansion format for ClientRevenueTable */
export function storeClientsToClientExpansion(store: InputStore, product: Product) {
  const clientMap = store.clients[product] ?? {};
  const clientActuals = store.hubspot.products[product]?.clientActuals ?? {};
  return Object.entries(clientMap).map(([clientName, rec], idx) => {
    function aggregateClientQuarter(q: Quarter) {
      const months = QUARTER_MONTHS[q];
      let erTarget = 0, erActual: number | null = null;
      let enTarget = 0, enActual: number | null = null;
      let nnTarget = 0, nnActual: number | null = null;
      for (const m of months) {
        const cm = rec.months[m];
        if (!cm) continue;
        erTarget += cm.erTarget ?? 0;
        enTarget += cm.enTarget ?? 0;
        nnTarget += cm.nnTarget ?? 0;
        if (cm.erActual !== null) erActual = (erActual ?? 0) + cm.erActual;
        if (cm.enActual !== null) enActual = (enActual ?? 0) + cm.enActual;
        if (cm.nnActual !== null) nnActual = (nnActual ?? 0) + cm.nnActual;
      }
      return { erTarget, erActual, enTarget, enActual, nnTarget, nnActual };
    }
    const q1 = aggregateClientQuarter("Q1");
    const q2 = aggregateClientQuarter("Q2");
    const q3 = aggregateClientQuarter("Q3");
    const q4 = aggregateClientQuarter("Q4");
    return {
      id: `store-${idx}-${clientName}`,
      name: rec.name,
      industry: "—",
      csm: rec.csm || "—",
      am: rec.am || "—",
      q1Target: q1.erTarget + q1.enTarget + q1.nnTarget,
      q1Actual: q1.erActual !== null || q1.enActual !== null || q1.nnActual !== null ? (q1.erActual ?? 0) + (q1.enActual ?? 0) + (q1.nnActual ?? 0) : null,
      q2Target: q2.erTarget + q2.enTarget + q2.nnTarget,
      q2Actual: q2.erActual !== null || q2.enActual !== null || q2.nnActual !== null ? (q2.erActual ?? 0) + (q2.enActual ?? 0) + (q2.nnActual ?? 0) : null,
      q3Target: q3.erTarget + q3.enTarget + q3.nnTarget,
      q3Actual: q3.erActual !== null || q3.enActual !== null || q3.nnActual !== null ? (q3.erActual ?? 0) + (q3.enActual ?? 0) + (q3.nnActual ?? 0) : null,
      q4Target: q4.erTarget + q4.enTarget + q4.nnTarget,
      q4Actual: q4.erActual !== null || q4.enActual !== null || q4.nnActual !== null ? (q4.erActual ?? 0) + (q4.enActual ?? 0) + (q4.nnActual ?? 0) : null,
      q1, q2, q3, q4,
      hubspotActuals: clientActuals[clientName],
    };
  });
}

export function recalculateProductMonthlyTargetsFromClients(store: InputStore, product: Product): void {
  for (const record of Object.values(store.clients[product] ?? {})) {
    let annualErTarget = 0;
    let annualEnTarget = 0;
    let annualNnTarget = 0;

    for (const month of MONTHS) {
      annualErTarget += record.months[month]?.erTarget ?? 0;
      annualEnTarget += record.months[month]?.enTarget ?? 0;
      annualNnTarget += record.months[month]?.nnTarget ?? 0;
    }

    record.erTarget = annualErTarget > 0 ? annualErTarget : null;
    record.enTarget = annualEnTarget > 0 ? annualEnTarget : null;
    record.nnTarget = annualNnTarget > 0 ? annualNnTarget : null;
  }

  for (const month of MONTHS) {
    let erTarget = 0;
    let erActual = 0;
    let enTarget = 0;
    let enActual = 0;
    let nnTarget = 0;
    let nnActual = 0;
    let hasErActual = false;
    let hasEnActual = false;
    let hasNnActual = false;

    for (const record of Object.values(store.clients[product] ?? {})) {
      erTarget += record.months[month]?.erTarget ?? 0;
      if (record.months[month]?.erActual !== null && record.months[month]?.erActual !== undefined) {
        erActual += record.months[month]?.erActual ?? 0;
        hasErActual = true;
      }
      enTarget += record.months[month]?.enTarget ?? 0;
      if (record.months[month]?.enActual !== null && record.months[month]?.enActual !== undefined) {
        enActual += record.months[month]?.enActual ?? 0;
        hasEnActual = true;
      }
      nnTarget += record.months[month]?.nnTarget ?? 0;
      if (record.months[month]?.nnActual !== null && record.months[month]?.nnActual !== undefined) {
        nnActual += record.months[month]?.nnActual ?? 0;
        hasNnActual = true;
      }
    }

    store.monthly[product][month] = {
      ...store.monthly[product][month],
      erTarget: erTarget > 0 ? erTarget : null,
      erActual: hasErActual ? erActual : null,
      enTarget: enTarget > 0 ? enTarget : null,
      enActual: hasEnActual ? enActual : null,
      nnTarget: nnTarget > 0 ? nnTarget : null,
      nnActual: hasNnActual ? nnActual : null,
    };
  }
}

/** Convert monthly input store to TrackerPage-compatible actuals/targets (aggregated by quarter) */
export function storeToTrackerData(store: InputStore, product: Product) {
  const targets = QUARTERS.map(q => {
    const c = aggregateQuarter(store, product, q);
    return {
      quarter: q,
      renewal: c.erTarget ?? 0,
      expansion: c.enTarget ?? 0,
      churn: 0,
      netNew: c.nnTarget ?? 0,
    };
  });
  const actuals = QUARTERS.map(q => {
    const c = aggregateQuarter(store, product, q);
    return {
      quarter: q,
      renewal: c.erActual ?? 0,
      expansion: c.enActual ?? 0,
      churn: 0,
      netNew: c.nnActual ?? 0,
      isProjected: false,
    };
  });
  return { targets, actuals: applyHubSpotActuals(store, product, actuals) };
}

type TrackerQuarterDatum = {
  quarter: string;
  renewal: number;
  expansion: number;
  churn: number;
  netNew: number;
  isProjected?: boolean;
};

export function applyHubSpotActuals<T extends TrackerQuarterDatum[]>(
  store: InputStore,
  product: Product,
  actuals: T
): T {
  if (!hasHubSpotActuals(store, product)) {
    return actuals;
  }

  return actuals.map((entry) => {
    const quarter = entry.quarter as Quarter;
    if (!QUARTERS.includes(quarter)) {
      return entry;
    }

    const override = store.hubspot.products[product].actuals[quarter];
    return {
      ...entry,
      renewal: override.renewal !== 0 ? override.renewal : entry.renewal,
      expansion: override.expansion !== 0 ? override.expansion : entry.expansion,
      netNew: override.netNew !== 0 ? override.netNew : entry.netNew,
      isProjected: false,
    };
  }) as T;
}

export function resolveTrackerData<T extends TrackerQuarterDatum[]>(
  store: InputStore | null,
  product: Product,
  fallback: {
    targets: { quarter: string; renewal: number; expansion: number; churn: number; netNew: number }[];
    actuals: T;
  }
) {
  if (!store) {
    return fallback;
  }

  if (hasInputData(store, product)) {
    return storeToTrackerData(store, product);
  }

  return {
    targets: fallback.targets,
    actuals: applyHubSpotActuals(store, product, fallback.actuals),
  };
}
