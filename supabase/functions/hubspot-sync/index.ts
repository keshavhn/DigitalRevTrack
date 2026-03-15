import { corsHeaders } from "../_shared/cors.ts";

type Product = "Nuro" | "Access Hub" | "Evidence Hub";
type RevenueCategory = "renewal" | "expansion" | "netNew";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface MappingConfig {
  properties: string[];
  renewal: string[];
  expansion: string[];
  netNew: string[];
  pipelineProperties: string[];
  pipelines: {
    renewal: string[];
    bd: string[];
  };
  productProperties: string[];
  products: Record<Product, string[]>;
}

type ClientNamesByProduct = Record<Product, string[]>;

interface HubSpotPipeline {
  id: string;
  label?: string;
  stages?: Array<{ id: string; label?: string; metadata?: { isClosed?: string; probability?: string } }>;
}

const DEFAULT_MAPPING: MappingConfig = {
  properties: ["hs_deal_category", "deal_category", "dealtype"],
  renewal: ["renewal", "existing_renewal", "existingbusiness"],
  expansion: ["expansion"],
  netNew: ["new_business", "new business", "net_new", "netnew", "newbusiness"],
  pipelineProperties: ["pipeline"],
  pipelines: {
    renewal: ["digital - renewal pipeline", "renewal", "renewals"],
    bd: ["digital - bd pipeline", "bd", "business_development", "business development"],
  },
  productProperties: ["product", "product_line", "line_of_business", "business_unit"],
  products: {
    "Nuro": ["nuro"],
    "Access Hub": ["access_hub", "access hub"],
    "Evidence Hub": ["evidence_hub", "evidence hub"],
  },
};

const PRODUCTS: Product[] = ["Nuro", "Access Hub", "Evidence Hub"];
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

const FY26_QUARTERS: Record<Quarter, { start: Date; end: Date }> = {
  Q1: { start: new Date("2025-08-01T00:00:00.000Z"), end: new Date("2025-10-31T23:59:59.999Z") },
  Q2: { start: new Date("2025-11-01T00:00:00.000Z"), end: new Date("2026-01-31T23:59:59.999Z") },
  Q3: { start: new Date("2026-02-01T00:00:00.000Z"), end: new Date("2026-04-30T23:59:59.999Z") },
  Q4: { start: new Date("2026-05-01T00:00:00.000Z"), end: new Date("2026-07-31T23:59:59.999Z") },
};

const EXACT_ER_FILTER_GROUPS = [
  {
    filters: [
      { propertyName: "pipeline", operator: "EQ", value: "109299553" },
      { propertyName: "dealstage", operator: "EQ", value: "196061246" },
    ],
  },
];

function normalizeTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean);
}

function normalizeValue(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

function fuzzyMatch(raw: unknown, values: string[]): boolean {
  const normalized = normalizeValue(raw);
  if (!normalized) return false;

  return values.some((value) => {
    const token = normalizeValue(value);
    return normalized === token || normalized.includes(token) || token.includes(normalized);
  });
}

function normalizeMapping(raw: Partial<MappingConfig> | null | undefined): MappingConfig {
  const properties = normalizeTokens(raw?.properties);
  const renewal = normalizeTokens(raw?.renewal);
  const expansion = normalizeTokens(raw?.expansion);
  const netNew = normalizeTokens(raw?.netNew);
  const pipelineProperties = normalizeTokens(raw?.pipelineProperties);
  const renewalPipelines = normalizeTokens(raw?.pipelines?.renewal);
  const bdPipelines = normalizeTokens(raw?.pipelines?.bd);
  const productProperties = normalizeTokens(raw?.productProperties);

  return {
    properties: properties.length ? properties : DEFAULT_MAPPING.properties,
    renewal: renewal.length ? renewal : DEFAULT_MAPPING.renewal,
    expansion: expansion.length ? expansion : DEFAULT_MAPPING.expansion,
    netNew: netNew.length ? netNew : DEFAULT_MAPPING.netNew,
    pipelineProperties: pipelineProperties.length ? pipelineProperties : DEFAULT_MAPPING.pipelineProperties,
    pipelines: {
      renewal: renewalPipelines.length ? renewalPipelines : DEFAULT_MAPPING.pipelines.renewal,
      bd: bdPipelines.length ? bdPipelines : DEFAULT_MAPPING.pipelines.bd,
    },
    productProperties: productProperties.length ? productProperties : DEFAULT_MAPPING.productProperties,
    products: {
      "Nuro": normalizeTokens(raw?.products?.["Nuro"]).length ? normalizeTokens(raw?.products?.["Nuro"]) : DEFAULT_MAPPING.products["Nuro"],
      "Access Hub": normalizeTokens(raw?.products?.["Access Hub"]).length ? normalizeTokens(raw?.products?.["Access Hub"]) : DEFAULT_MAPPING.products["Access Hub"],
      "Evidence Hub": normalizeTokens(raw?.products?.["Evidence Hub"]).length ? normalizeTokens(raw?.products?.["Evidence Hub"]) : DEFAULT_MAPPING.products["Evidence Hub"],
    },
  };
}

function getQuarter(closeDate: string): Quarter | null {
  const date = new Date(closeDate);
  if (Number.isNaN(date.getTime())) return null;

  for (const [quarter, range] of Object.entries(FY26_QUARTERS) as [Quarter, { start: Date; end: Date }][]) {
    if (date >= range.start && date <= range.end) return quarter;
  }
  return null;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findClientMatch(dealName: unknown, clientNames: string[]): string | null {
  const normalizedDealName = normalizeName(String(dealName ?? ""));
  if (!normalizedDealName) return null;

  const sortedNames = [...clientNames].sort((a, b) => b.length - a.length);
  for (const clientName of sortedNames) {
    const normalizedClientName = normalizeName(clientName);
    if (!normalizedClientName) continue;
    if (
      normalizedDealName === normalizedClientName ||
      normalizedDealName.includes(normalizedClientName) ||
      normalizedClientName.includes(normalizedDealName)
    ) {
      return clientName;
    }
  }

  return null;
}

async function searchDeals(
  apiKey: string,
  properties: string[],
  filterGroups?: Array<{ filters: Array<{ propertyName: string; operator: string; value: string }> }>,
  after?: string,
): Promise<{ results: any[]; paging?: any }> {
  const body = {
    filterGroups: filterGroups ?? [
      {
        filters: [
          { propertyName: "closedate", operator: "GTE", value: "2025-08-01" },
          { propertyName: "closedate", operator: "LTE", value: "2026-07-31" },
        ],
      },
    ],
    properties,
    limit: 100,
    ...(after ? { after } : {}),
  };

  const resp = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HubSpot API error ${resp.status}: ${text}`);
  }

  return resp.json();
}

async function fetchDealIdSet(
  apiKey: string,
  properties: string[],
  filterGroups: Array<{ filters: Array<{ propertyName: string; operator: string; value: string }> }>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  let after: string | undefined;

  do {
    const page = await searchDeals(apiKey, properties, filterGroups, after);
    for (const deal of page.results ?? []) {
      if (deal?.id) ids.add(String(deal.id));
    }
    after = page.paging?.next?.after;
  } while (after);

  return ids;
}

async function fetchPipelines(apiKey: string): Promise<HubSpotPipeline[]> {
  const resp = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HubSpot pipeline metadata error ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  return Array.isArray(json.results) ? json.results : [];
}

function createQuarterTotals() {
  return { renewal: 0, expansion: 0, netNew: 0, dealCount: 0 };
}

function createProductAccumulator() {
  return {
    totalDeals: 0,
    skipped: 0,
    clientActuals: {} as Record<string, Record<Quarter, number>>,
    actuals: {
      Q1: createQuarterTotals(),
      Q2: createQuarterTotals(),
      Q3: createQuarterTotals(),
      Q4: createQuarterTotals(),
    },
  };
}

function buildPipelineLookup(pipelines: HubSpotPipeline[]) {
  const byId = new Map<string, { id: string; label: string; closedWonStageIds: Set<string> }>();

  for (const pipeline of pipelines) {
    const label = String(pipeline.label ?? pipeline.id ?? "");
    const closedWonStageIds = new Set(
      (pipeline.stages ?? [])
        .filter((stage) => {
          const normalizedLabel = normalizeValue(stage.label);
          const labelMatch = normalizedLabel.includes("closed_won") || normalizedLabel.includes("won");
          const closedFlag = String(stage.metadata?.isClosed ?? "").toLowerCase() === "true";
          const wonProbability = String(stage.metadata?.probability ?? "") === "1.0";
          return labelMatch || (closedFlag && wonProbability) || (closedFlag && normalizedLabel.includes("closed"));
        })
        .map((stage) => String(stage.id)),
    );

    byId.set(String(pipeline.id), { id: String(pipeline.id), label, closedWonStageIds });
  }

  return byId;
}

function getPipelineInfo(
  props: Record<string, unknown>,
  mapping: MappingConfig,
  pipelineLookup: Map<string, { id: string; label: string; closedWonStageIds: Set<string> }>,
) {
  for (const propName of mapping.pipelineProperties) {
    const raw = props[propName];
    if (!raw) continue;

    const rawValue = String(raw);
    const directMatch = pipelineLookup.get(rawValue);
    if (directMatch) {
      return directMatch;
    }

    for (const pipeline of pipelineLookup.values()) {
      if (fuzzyMatch(rawValue, [pipeline.id, pipeline.label])) {
        return pipeline;
      }
    }

    return { id: rawValue, label: rawValue, closedWonStageIds: new Set<string>() };
  }

  return null;
}

function categoriseRevenue(
  props: Record<string, unknown>,
  mapping: MappingConfig,
  pipelineInfo: { id: string; label: string; closedWonStageIds: Set<string> } | null,
): RevenueCategory | null {
  const pipelineTokens = pipelineInfo ? [pipelineInfo.id, pipelineInfo.label] : [];

  if (pipelineTokens.length > 0 && pipelineTokens.some((token) => fuzzyMatch(token, mapping.pipelines.renewal))) {
    return "renewal";
  }

  if (pipelineTokens.length > 0 && pipelineTokens.some((token) => fuzzyMatch(token, mapping.pipelines.bd))) {
    for (const propName of mapping.properties) {
      const raw = props[propName];
      if (!raw) continue;
      if (fuzzyMatch(raw, mapping.netNew)) return "netNew";
      if (fuzzyMatch(raw, mapping.expansion)) return "expansion";
    }
    return "expansion";
  }

  return null;
}

function categoriseProduct(
  props: Record<string, unknown>,
  mapping: MappingConfig,
  clientNamesByProduct?: ClientNamesByProduct,
): Product | null {
  for (const propName of mapping.productProperties) {
    const raw = props[propName];
    if (!raw) continue;
    for (const product of PRODUCTS) {
      if (fuzzyMatch(raw, mapping.products[product])) {
        return product;
      }
    }
  }

  const dealName = props.dealname;
  if (dealName) {
    for (const product of PRODUCTS) {
      if (fuzzyMatch(dealName, mapping.products[product])) {
        return product;
      }
    }
  }

  if (clientNamesByProduct) {
    for (const product of PRODUCTS) {
      const matchedClient = findClientMatch(props.dealname, clientNamesByProduct[product] ?? []);
      if (matchedClient) {
        return product;
      }
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY");
    if (!HUBSPOT_API_KEY) {
      throw new Error("HUBSPOT_API_KEY not configured");
    }

    let mapping = DEFAULT_MAPPING;
    let clientNamesByProduct: ClientNamesByProduct = {
      "Nuro": [],
      "Access Hub": [],
      "Evidence Hub": [],
    };

    try {
      const body = await req.json();
      mapping = normalizeMapping(body?.mappingConfig as Partial<MappingConfig>);
      if (body?.clientNamesByProduct) {
        clientNamesByProduct = {
          "Nuro": Array.isArray(body.clientNamesByProduct["Nuro"]) ? body.clientNamesByProduct["Nuro"].map(String) : [],
          "Access Hub": Array.isArray(body.clientNamesByProduct["Access Hub"]) ? body.clientNamesByProduct["Access Hub"].map(String) : [],
          "Evidence Hub": Array.isArray(body.clientNamesByProduct["Evidence Hub"]) ? body.clientNamesByProduct["Evidence Hub"].map(String) : [],
        };
      }
    } catch {
      mapping = DEFAULT_MAPPING;
    }

    const pipelineLookup = buildPipelineLookup(await fetchPipelines(HUBSPOT_API_KEY));
    const propertySet = new Set<string>([
      "dealname",
      "amount",
      "closedate",
      "dealstage",
      "pipeline",
      ...mapping.properties,
      ...mapping.pipelineProperties,
      ...mapping.productProperties,
    ]);
    const exactErDealIds = await fetchDealIdSet(
      HUBSPOT_API_KEY,
      ["dealname", "pipeline", "dealstage", "amount", "closedate"],
      EXACT_ER_FILTER_GROUPS,
    );

    let allDeals: any[] = [];
    let after: string | undefined;

    do {
      const page = await searchDeals(HUBSPOT_API_KEY, [...propertySet], undefined, after);
      allDeals = allDeals.concat(page.results ?? []);
      after = page.paging?.next?.after;
    } while (after);

    const productTotals = {
      "Nuro": createProductAccumulator(),
      "Access Hub": createProductAccumulator(),
      "Evidence Hub": createProductAccumulator(),
    };

    let skipped = 0;
    const skipReasons = {
      missingQuarter: 0,
      missingPipeline: 0,
      notClosedWon: 0,
      missingProduct: 0,
      missingCategory: 0,
    };

    for (const deal of allDeals) {
      const props = (deal.properties ?? {}) as Record<string, unknown>;
      const quarter = getQuarter(String(props.closedate ?? ""));
      const pipelineInfo = getPipelineInfo(props, mapping, pipelineLookup);
      const stageId = String(props.dealstage ?? "");
      const exactErMatch = exactErDealIds.has(String(deal.id ?? ""));
      const isClosedWon = exactErMatch || (!!pipelineInfo && pipelineInfo.closedWonStageIds.size > 0 && pipelineInfo.closedWonStageIds.has(stageId));
      const product = categoriseProduct(props, mapping, clientNamesByProduct);
      const category = exactErMatch ? "renewal" : categoriseRevenue(props, mapping, pipelineInfo);
      const amount = parseFloat(String(props.amount ?? "0")) || 0;

      if (!quarter || !product || !pipelineInfo || !isClosedWon) {
        if (!quarter) skipReasons.missingQuarter++;
        if (!pipelineInfo) skipReasons.missingPipeline++;
        else if (!isClosedWon) skipReasons.notClosedWon++;
        if (!product) skipReasons.missingProduct++;
        skipped++;
        continue;
      }

      productTotals[product].totalDeals++;

      if (!category) {
        productTotals[product].skipped++;
        skipReasons.missingCategory++;
        skipped++;
        continue;
      }

      productTotals[product].actuals[quarter][category] += amount;
      productTotals[product].actuals[quarter].dealCount++;

      const matchedClient = findClientMatch(props.dealname, clientNamesByProduct[product]);
      if (matchedClient) {
        const existing = productTotals[product].clientActuals[matchedClient] ?? { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
        existing[quarter] += amount;
        productTotals[product].clientActuals[matchedClient] = existing;
      }
    }

    const payload = {
      syncedAt: new Date().toISOString(),
      totalDeals: allDeals.length,
      skipped,
      skipReasons,
      mappingUsed: mapping,
      actualsByProduct: PRODUCTS.map((product) => ({
        product,
        totalDeals: productTotals[product].totalDeals,
        skipped: productTotals[product].skipped,
        clientActuals: productTotals[product].clientActuals,
        actuals: QUARTERS.map((quarter) => ({
          quarter,
          renewal: Math.round(productTotals[product].actuals[quarter].renewal),
          expansion: Math.round(productTotals[product].actuals[quarter].expansion),
          netNew: Math.round(productTotals[product].actuals[quarter].netNew),
          churn: 0,
          dealCount: productTotals[product].actuals[quarter].dealCount,
          isLive: true,
        })),
      })),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("hubspot-sync error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
