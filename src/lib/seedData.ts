/**
 * Seed data from uploaded Excel — values treated as £K (× 1,000 for internal storage)
 * All clients are for the Nuro product.
 */

import { ClientMonthData, ClientRecord, InputStore, Month, MONTHS, Product, PRODUCTS, createEmptyStore, emptyClientMonth, loadStore, recalculateProductMonthlyTargetsFromClients, saveStore } from "@/lib/dataStore";
import { WORKBOOK_TARGET_SEEDS, WorkbookTargetSeed } from "@/lib/workbookTargets";

const TARGET_RESTORE_VERSION_KEY = "ai_restore_seed_targets_v4";

const FY26_OWNER_MAPPING: Partial<Record<Product, Record<string, { am?: string; csm?: string }>>> = {
  "Access Hub": {
    "Astellas": { am: "Brian", csm: "Cloe" },
    "AstraZeneca": { am: "Russ", csm: "Rob" },
    "Boehringer Ingelheim": { am: "Brian", csm: "Cloe" },
    "MSD": { am: "Brian", csm: "Cloe" },
    "Novartis": { am: "Russ" },
    "Pfizer": { am: "Brian", csm: "Hilary" },
  },
  "Evidence Hub": {
    "Alcon": { am: "Vanit" },
    "Immunocore": { am: "Ali" },
    "Pfizer": { am: "Brian", csm: "Hilary" },
    "Regeneron": { am: "Brian", csm: "Andreas" },
    "Sanofi": { am: "Brian", csm: "Andreas" },
    "Teva": { am: "Brian", csm: "Rob" },
    "UCB": { am: "Pawan", csm: "Maro" },
  },
  "Nuro": {
    "Alfasigma": { am: "Rob" },
    "Almirall": { am: "Pawan" },
    "AstraZeneca": { am: "Russ", csm: "Rob" },
    "BioNtech": { am: "Pawan", csm: "Cloe" },
    "Boehringer Ingelheim": { am: "Brian", csm: "Cloe" },
    "Genmab": { am: "Pawan", csm: "Cloe" },
    "GSK": { am: "Pawan", csm: "Hilary" },
    "Janssen": { am: "Brian", csm: "Cloe" },
    "Jazz": { csm: "Cloe" },
    "Lilly": { am: "Brian", csm: "Cloe" },
    "MSD": { am: "Brian", csm: "Cloe" },
    "Ono Pharmaceuticals": { am: "Ali" },
    "Otsuka": { am: "Brian", csm: "Rob" },
    "Revolution Medicine": { am: "Rob" },
    "Sanofi": { am: "Brian", csm: "Andreas" },
    "Sobi": { am: "Pawan", csm: "Cloe" },
    "UCB": { am: "Pawan", csm: "Cloe" },
  },
};

function K(v: number): number { return Math.round(v * 1_000); }

function emptyMonths(): Record<Month, ClientMonthData> {
  const m = {} as Record<Month, ClientMonthData>;
  for (const mo of MONTHS) m[mo] = { erTarget: null, erActual: null, enTarget: null, enActual: null, nnTarget: null, nnActual: null };
  return m;
}

function makeClient(
  name: string,
  csm: string,
  am: string,
  annualER: number | null,
  annualEN: number | null,
  monthlyER: Partial<Record<Month, number>>,
  monthlyEN: Partial<Record<Month, number>>,
): ClientRecord {
  const months = emptyMonths();
  for (const [m, v] of Object.entries(monthlyER)) {
    months[m as Month].erTarget = K(v as number);
  }
  for (const [m, v] of Object.entries(monthlyEN)) {
    months[m as Month].enTarget = K(v as number);
  }
  return {
    name,
    csm,
    am,
    erTarget: annualER !== null ? K(annualER) : null,
    enTarget: annualEN !== null ? K(annualEN) : null,
    nnTarget: null,
    months,
  };
}

const EXCEL_CLIENTS: ClientRecord[] = [
  makeClient("Abbvie",                     "Rob",     "Brian",   221.805,   20,      { Mar: 221.805 },              { Dec: 20 }),
  makeClient("Arvinas",                    "Hilary",  "Pawan",   48.722,    null,    { Apr: 48.722 },               {}),
  makeClient("AstraZeneca",               "Rob",     "Russ",    288.3,     null,    { Oct: 175.802 },              {}),
  makeClient("Biogen",                     "Hilary",  "Pawan",   146.241,   null,    { Jun: 146.241 },              {}),
  makeClient("BioNtech",                   "Cloe",    "Pawan",   142.065,   null,    { Dec: 142.065 },              {}),
  makeClient("BMS",                        "Cloe",    "Brian",   139.098,   null,    { Jul: 139.098 },              {}),
  makeClient("Boehringer Ingelheim",       "Cloe",    "Brian",   191.304,   null,    { Oct: 95.652, Apr: 95.652 }, {}),
  makeClient("Daaichi Sankyo",             "Rob",     "Brian",   null,      120,     {},                            { Dec: 120 }),
  makeClient("EMD Serono",                 "Rob",     "Pawan",   130.435,   null,    { Mar: 130.435 },              {}),
  makeClient("Genmab",                     "Cloe",    "Pawan",   109.624,   8.578,   { Jan: 109.624 },              {}),
  makeClient("GSK",                        "Hilary",  "Pawan",   120,       null,    { Nov: 120 },                  {}),
  makeClient("Ionis Pharmaceuticals, Inc.","Rob",     "Brian",   41.353,    null,    { Jun: 41.353 },               {}),
  makeClient("Janssen",                    "Cloe",    "Brian",   67.504,    100,     { Dec: 67.504 },               { Dec: 100 }),
  makeClient("Lilly",                      "Cloe",    "Brian",   293.233,   30,      { Mar: 293.233 },              { Mar: 30 }),
  makeClient("MSD",                        "Cloe",    "Brian",   160.677,   null,    { Apr: 160.677 },              {}),
  makeClient("Novo Nordisk",               "Hilary",  "Pawan",   null,      60,      {},                            {}),
  makeClient("Otsuka",                     "Rob",     "Brian",   120,       null,    { Jan: 120 },                  {}),
  makeClient("Pfizer",                     "Hilary",  "Brian",   null,      224,     {},                            { Feb: 120 }),
  makeClient("Sanofi",                     "Andreas", "Brian",   null,      120,     {},                            { Apr: 120 }),
  makeClient("Sobi",                       "Cloe",    "Pawan",   57.15652,  null,    { Sep: 54.435 },               {}),
  makeClient("Teva",                       "Rob",     "Brian",   73.684,    null,    { Jul: 73.684 },               {}),
  makeClient("UCB",                        "Cloe",    "Pawan",   223.478,   null,    { Jan: 171.304 },              {}),
  // Jazz removed — no ER or EN targets defined
];

/**
 * Aggregate all client monthly ER/EN targets into store.monthly["Nuro"]
 * so the tracker dashboard QuarterCards reflect the full-year total.
 */
function syncClientTotalsToMonthly(store: InputStore): void {
  for (const m of MONTHS) {
    let erTarget = 0;
    let enTarget = 0;
    for (const rec of Object.values(store.clients["Nuro"] ?? {})) {
      erTarget += rec.months[m]?.erTarget ?? 0;
      enTarget += rec.months[m]?.enTarget ?? 0;
    }
    const existing = store.monthly["Nuro"][m];
    store.monthly["Nuro"][m] = {
      ...existing,
      erTarget: erTarget > 0 ? erTarget : existing.erTarget,
      enTarget: enTarget > 0 ? enTarget : existing.enTarget,
    };
  }
}

export function seedExcelClients(): { added: number; skipped: number } {
  const store: InputStore = loadStore() ?? createEmptyStore();
  let added = 0;
  let skipped = 0;

  for (const client of EXCEL_CLIENTS) {
    const existing = store.clients["Nuro"]?.[client.name];
    if (existing) {
      skipped++;
    } else {
      store.clients["Nuro"][client.name] = client;
      added++;
    }
  }

  syncClientTotalsToMonthly(store);
  saveStore(store);
  window.dispatchEvent(new Event("focus"));
  return { added, skipped };
}

export function overwriteExcelClients(): { added: number } {
  const store: InputStore = loadStore() ?? createEmptyStore();

  // Replace only Nuro clients — preserve all other product data
  store.clients["Nuro"] = {};
  for (const client of EXCEL_CLIENTS) {
    store.clients["Nuro"][client.name] = client;
  }

  syncClientTotalsToMonthly(store);
  saveStore(store);
  window.dispatchEvent(new Event("focus"));
  return { added: EXCEL_CLIENTS.length };
}

/**
 * Re-sync monthly aggregate totals from current client data.
 * Call this after manually editing clients to keep the tracker in sync.
 */
export function resyncNuroTotals(): void {
  const store: InputStore = loadStore() ?? createEmptyStore();
  // Reset Nuro monthly ER/EN targets to zero before re-aggregating
  for (const m of MONTHS) {
    store.monthly["Nuro"][m].erTarget = null;
    store.monthly["Nuro"][m].enTarget = null;
  }
  syncClientTotalsToMonthly(store);
  saveStore(store);
  window.dispatchEvent(new Event("focus"));
}

export const EXCEL_CLIENT_COUNT = EXCEL_CLIENTS.length;

// ── Access Hub clients (values are raw £, NOT K multiplied) ─────────────────
function makeAHClient(
  name: string,
  csm: string,
  am: string,
  annualER: number | null,
  annualEN: number | null,
  monthlyER: Partial<Record<Month, number>>,
  monthlyEN: Partial<Record<Month, number>>,
): ClientRecord {
  const months = emptyMonths();
  for (const [m, v] of Object.entries(monthlyER)) {
    months[m as Month].erTarget = Math.round(v as number);
  }
  for (const [m, v] of Object.entries(monthlyEN)) {
    months[m as Month].enTarget = Math.round(v as number);
  }
  // Calculate annual from monthly if not provided
  const erSum = Object.values(monthlyER).reduce((s, v) => s + (v ?? 0), 0);
  const enSum = Object.values(monthlyEN).reduce((s, v) => s + (v ?? 0), 0);
  const erAnnual = annualER ?? (erSum || null);
  const enAnnual = annualEN ?? (enSum || null);
  return {
    name,
    csm,
    am,
    erTarget: erAnnual ? Math.round(erAnnual) : null,
    enTarget: enAnnual ? Math.round(enAnnual) : null,
    nnTarget: null,
    months,
  };
}

// Values are raw £ (e.g. 577500 = £577,500 = £577.5K)
const ACCESS_HUB_CLIENTS: ClientRecord[] = [
  makeAHClient("Abbvie",                "Rob",     "Brian",   null, null, { Mar: 70000 },                    {}),
  makeAHClient("Astellas",              "Cloe",    "Brian",   null, null, { Apr: 82707 },                    {}),
  makeAHClient("AstraZeneca",           "Rob",     "Russ",    null, null, { Oct: 577500 },                   { Oct: 180000 }),
  makeAHClient("Biogen",               "Hilary",  "Pawan",   null, null, { Mar: 70000, Jun: 88947 },        {}),
  makeAHClient("BioNtech",              "Cloe",    "Pawan",   null, null, {},                               { Dec: 60000 }),
  makeAHClient("Boehringer Ingelheim",  "Cloe",    "Brian",   null, null, { Mar: 120000 },                   {}),
  makeAHClient("EMD Serono",            "Rob",     "Pawan",   null, null, {},                               { Sep: 50000 }),
  makeAHClient("Genmab",               "Cloe",    "Pawan",   null, null, { Feb: 56000 },                    {}),
  // GSK (Access Hub) removed — no ER or EN targets defined
  makeAHClient("Lilly",                "Cloe",    "Brian",   null, null, {},                               { Jun: 80000 }),
  makeAHClient("MSD",                  "Cloe",    "Brian",   null, null, { Aug: 43478, Apr: 80000 },        {}),
  makeAHClient("Novo Nordisk",          "Hilary",  "Pawan",   null, null, { Dec: 83092 },                   { Apr: 80000 }),
  makeAHClient("Otsuka",               "Rob",     "Brian",   null, null, { May: 60000 },                   {}),
  makeAHClient("Pfizer",               "Hilary",  "Brian",   null, null, { Dec: 900593 },                  {}),
  makeAHClient("Regeneron",             "Andreas", "New AM",  null, null, {},                               { Jun: 100000 }),
  makeAHClient("Sanofi",               "Andreas", "Brian",   null, null, { May: 80000 },                   {}),
  makeAHClient("New client whitespace", "TBC",     "New AM",  null, null, {},                               { Feb: 120000 }),
];

function syncProductTotalsToMonthly(store: InputStore, product: "Access Hub" | "Evidence Hub"): void {
  for (const m of MONTHS) {
    let erTarget = 0;
    let enTarget = 0;
    for (const rec of Object.values(store.clients[product] ?? {})) {
      erTarget += rec.months[m]?.erTarget ?? 0;
      enTarget += rec.months[m]?.enTarget ?? 0;
    }
    const existing = store.monthly[product][m];
    store.monthly[product][m] = {
      ...existing,
      erTarget: erTarget > 0 ? erTarget : existing.erTarget,
      enTarget: enTarget > 0 ? enTarget : existing.enTarget,
    };
  }
}

export function overwriteAccessHubClients(): { added: number } {
  const store: InputStore = loadStore() ?? createEmptyStore();

  // Replace only Access Hub clients — preserve all other product data
  store.clients["Access Hub"] = {};
  for (const client of ACCESS_HUB_CLIENTS) {
    store.clients["Access Hub"][client.name] = client;
  }

  syncProductTotalsToMonthly(store, "Access Hub");
  saveStore(store);
  window.dispatchEvent(new Event("focus"));
  return { added: ACCESS_HUB_CLIENTS.length };
}

export const ACCESS_HUB_CLIENT_COUNT = ACCESS_HUB_CLIENTS.length;

// ── Evidence Hub clients (values are raw £, same as Access Hub) ──────────────
function makeEHClient(
  name: string,
  csm: string,
  am: string,
  monthlyER: Partial<Record<Month, number>>,
  monthlyEN: Partial<Record<Month, number>>,
): ClientRecord {
  const months = emptyMonths();
  for (const [m, v] of Object.entries(monthlyER)) {
    months[m as Month].erTarget = Math.round(v as number);
  }
  for (const [m, v] of Object.entries(monthlyEN)) {
    months[m as Month].enTarget = Math.round(v as number);
  }
  const erSum = Object.values(monthlyER).reduce((s, v) => s + (v ?? 0), 0);
  const enSum = Object.values(monthlyEN).reduce((s, v) => s + (v ?? 0), 0);
  return {
    name,
    csm,
    am,
    erTarget: erSum ? Math.round(erSum) : null,
    enTarget: enSum ? Math.round(enSum) : null,
    nnTarget: null,
    months,
  };
}

const EVIDENCE_HUB_CLIENTS: ClientRecord[] = [
  makeEHClient("Astellas",              "Andreas", "Brian",   { Apr: 120000, Jun: 82087 }, {}),
  // AstraZeneca (Evidence Hub) removed — no ER or EN targets defined
  makeEHClient("Biogen",               "Hilary",  "Pawan",   {},                          { Jun: 80000 }),
  makeEHClient("Boehringer Ingelheim",  "Andreas", "Brian",   {},                          { Feb: 100000, May: 121739 }),
  makeEHClient("Daaichi Sankyo",        "Rob",     "Brian",   { Mar: 120000 },             {}),
  makeEHClient("Genmab",               "Cloe",    "Pawan",   { Mar: 64000 },              {}),
  makeEHClient("Janssen",              "Cloe",    "Brian",   {},                          { Feb: 80000 }),
  makeEHClient("Lilly",                "Cloe",    "Brian",   {},                          { Nov: 90000 }),
  makeEHClient("MSD",                  "Cloe",    "Brian",   {},                          { Jul: 120000 }),
  makeEHClient("Otsuka",               "Rob",     "Brian",   {},                          { Jan: 60000 }),
  makeEHClient("Pfizer",               "Maro",    "Brian",   { Dec: 918288 },             { Dec: 165000 }),
  makeEHClient("Regeneron",             "Andreas", "New AM",  { May: 60000 },              {}),
  makeEHClient("Sanofi",               "Andreas", "Brian",   {},                          { Oct: 210000 }),
  makeEHClient("UCB",                  "Maro",    "Pawan",   { Jan: 34782, Apr: 70000 },  { Jan: 17391 }),
  makeEHClient("New client whitespace", "TBC",     "Russ",    {},                          { Jul: 108271 }),
];

export const EVIDENCE_HUB_CLIENT_COUNT = EVIDENCE_HUB_CLIENTS.length;

export function overwriteEvidenceHubClients(): { added: number } {
  const store: InputStore = loadStore() ?? createEmptyStore();
  store.clients["Evidence Hub"] = {};
  for (const client of EVIDENCE_HUB_CLIENTS) {
    store.clients["Evidence Hub"][client.name] = client;
  }
  syncProductTotalsToMonthly(store, "Evidence Hub");
  saveStore(store);
  window.dispatchEvent(new Event("focus"));
  return { added: EVIDENCE_HUB_CLIENTS.length };
}

/**
 * Overwrite all three products at once from the seed data.
 * Called by the single "Load All Data" button on the Client Input page.
 */
export function overwriteAllProducts(): { nuro: number; accessHub: number; evidenceHub: number } {
  const store: InputStore = loadStore() ?? createEmptyStore();

  store.clients["Nuro"] = {};
  for (const client of EXCEL_CLIENTS) store.clients["Nuro"][client.name] = client;
  syncClientTotalsToMonthly(store);

  store.clients["Access Hub"] = {};
  for (const client of ACCESS_HUB_CLIENTS) store.clients["Access Hub"][client.name] = client;
  syncProductTotalsToMonthly(store, "Access Hub");

  store.clients["Evidence Hub"] = {};
  for (const client of EVIDENCE_HUB_CLIENTS) store.clients["Evidence Hub"][client.name] = client;
  syncProductTotalsToMonthly(store, "Evidence Hub");

  saveStore(store);
  window.dispatchEvent(new Event("focus"));
  return {
    nuro: EXCEL_CLIENTS.length,
    accessHub: ACCESS_HUB_CLIENTS.length,
    evidenceHub: EVIDENCE_HUB_CLIENTS.length,
  };
}

/**
 * Auto-initialize all products with seed data if they have no clients yet.
 * Call once on app startup so published sites are pre-populated.
 */
export function autoInitializeAllProducts(): void {
  const store: InputStore = loadStore() ?? createEmptyStore();
  let changed = false;

  // Always refresh seed data to reflect the latest client list
  // (removes Jazz, GSK-AH, AstraZeneca-EH, adds AM field correctly)
  const nuroNames = Object.keys(store.clients["Nuro"]);
  const needNuroRefresh = nuroNames.includes("Jazz") || nuroNames.length === 0;
  if (needNuroRefresh) {
    store.clients["Nuro"] = {};
    for (const client of EXCEL_CLIENTS) {
      store.clients["Nuro"][client.name] = client;
    }
    syncClientTotalsToMonthly(store);
    changed = true;
  }

  const ahNames = Object.keys(store.clients["Access Hub"]);
  const needAHRefresh = ahNames.includes("GSK") || ahNames.length === 0;
  if (needAHRefresh) {
    store.clients["Access Hub"] = {};
    for (const client of ACCESS_HUB_CLIENTS) {
      store.clients["Access Hub"][client.name] = client;
    }
    syncProductTotalsToMonthly(store, "Access Hub");
    changed = true;
  }

  const ehNames = Object.keys(store.clients["Evidence Hub"]);
  const needEHRefresh = ehNames.includes("AstraZeneca") || ehNames.length === 0;
  if (needEHRefresh) {
    store.clients["Evidence Hub"] = {};
    for (const client of EVIDENCE_HUB_CLIENTS) {
      store.clients["Evidence Hub"][client.name] = client;
    }
    syncProductTotalsToMonthly(store, "Evidence Hub");
    changed = true;
  }

  if (changed) {
    saveStore(store);
  }
}

function cloneClientRecord(client: ClientRecord): ClientRecord {
  const months = {} as Record<Month, ClientMonthData>;
  for (const month of MONTHS) {
    months[month] = { ...client.months[month] };
  }
  return {
    ...client,
    months,
  };
}

function createWorkbookClientRecord(seed: WorkbookTargetSeed): ClientRecord {
  const months = {} as Record<Month, ClientMonthData>;
  let erTarget = 0;
  let enTarget = 0;
  let nnTarget = 0;

  for (const month of MONTHS) {
    const values = seed.months[month];
    const er = values?.er ?? null;
    const en = values?.en ?? null;
    const nn = values?.nn ?? null;

    months[month] = {
      ...emptyClientMonth(),
      erTarget: er,
      enTarget: en,
      nnTarget: nn,
    };

    erTarget += er ?? 0;
    enTarget += en ?? 0;
    nnTarget += nn ?? 0;
  }

  return {
    name: seed.name,
    csm: seed.csm,
    am: seed.am,
    erTarget: erTarget || null,
    enTarget: enTarget || null,
    nnTarget: nnTarget || null,
    months,
  };
}

function applyWorkbookTargetsToProduct(store: InputStore, product: Product): boolean {
  const seeds = WORKBOOK_TARGET_SEEDS.filter((seed) => seed.product === product);
  const seedMap = new Map(seeds.map((seed) => [seed.name, createWorkbookClientRecord(seed)]));
  const nextClients: Record<string, ClientRecord> = {};
  let changed = false;

  for (const [clientName, existing] of Object.entries(store.clients[product] ?? {})) {
    const seeded = seedMap.get(clientName);

    if (!seeded) {
      const cleared = cloneClientRecord(existing);
      cleared.erTarget = null;
      cleared.enTarget = null;
      cleared.nnTarget = null;
      for (const month of MONTHS) {
        cleared.months[month] = {
          ...cleared.months[month],
          erTarget: null,
          enTarget: null,
          nnTarget: null,
        };
      }
      nextClients[clientName] = cleared;
      if (JSON.stringify(existing) !== JSON.stringify(cleared)) {
        changed = true;
      }
      continue;
    }

    const next = cloneClientRecord(seeded);
    next.name = clientName;

    for (const month of MONTHS) {
      next.months[month] = {
        ...next.months[month],
        erActual: existing.months[month]?.erActual ?? null,
        enActual: existing.months[month]?.enActual ?? null,
        nnActual: existing.months[month]?.nnActual ?? null,
      };
    }

    nextClients[clientName] = next;
    if (JSON.stringify(existing) !== JSON.stringify(next)) {
      changed = true;
    }
    seedMap.delete(clientName);
  }

  for (const [clientName, seeded] of seedMap.entries()) {
    nextClients[clientName] = cloneClientRecord(seeded);
    changed = true;
  }

  store.clients[product] = nextClients;
  recalculateProductMonthlyTargetsFromClients(store, product);
  return changed;
}

function applyOwnerMappingsToProduct(store: InputStore, product: Product): boolean {
  const mappings = FY26_OWNER_MAPPING[product] ?? {};
  let changed = false;

  for (const [clientName, record] of Object.entries(store.clients[product] ?? {})) {
    const ownerMapping = mappings[clientName];
    if (!ownerMapping) continue;

    const nextAm = ownerMapping.am ?? record.am;
    const nextCsm = ownerMapping.csm ?? record.csm;

    if (record.am !== nextAm || record.csm !== nextCsm) {
      record.am = nextAm;
      record.csm = nextCsm;
      changed = true;
    }
  }

  return changed;
}

export function restoreSeedTargetsOnce(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(TARGET_RESTORE_VERSION_KEY) === "done") return;

  const store: InputStore = loadStore() ?? createEmptyStore();
  let changed = false;

  for (const product of PRODUCTS) {
    changed = applyWorkbookTargetsToProduct(store, product) || changed;
    changed = applyOwnerMappingsToProduct(store, product) || changed;
  }

  if (changed) {
    saveStore(store);
    window.dispatchEvent(new Event("focus"));
  }

  localStorage.setItem(TARGET_RESTORE_VERSION_KEY, "done");
}
