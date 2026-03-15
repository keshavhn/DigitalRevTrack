export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface QuarterTarget {
  quarter: Quarter;
  renewal: number;
  expansion: number;
  churn: number;
  netNew: number;
}

export interface QuarterActual {
  quarter: Quarter;
  renewal: number;
  expansion: number;
  churn: number;
  netNew: number;
  isProjected?: boolean;
}

export interface ClientQuarterData {
  erTarget: number;
  erActual: number | null;
  enTarget: number;
  enActual: number | null;
  nnTarget: number;
  nnActual: number | null;
}

export interface ClientExpansion {
  id: string;
  name: string;
  industry: string;
  csm: string;
  am: string;
  // Legacy single-value fields (kept for backward compat)
  q1Target: number;
  q1Actual: number | null;
  q2Target: number;
  q2Actual: number | null;
  q3Target: number;
  q3Actual: number | null;
  q4Target: number;
  q4Actual: number | null;
  // ER / EN breakdown per quarter
  q1: ClientQuarterData;
  q2: ClientQuarterData;
  q3: ClientQuarterData;
  q4: ClientQuarterData;
  hubspotActuals?: Partial<Record<Quarter, number>>;
  hubspotDealId?: string;
}

export interface FY26Data {
  targets: QuarterTarget[];
  actuals: QuarterActual[];
  clients: ClientExpansion[];
}
