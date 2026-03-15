export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}K`;
    return `£${value}`;
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function attainmentPct(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((actual / target) * 100);
}

export function attainmentColor(pct: number): string {
  if (pct >= 100) return "text-emerald-400";
  if (pct >= 85) return "text-amber-400";
  return "text-rose-400";
}

export function attainmentBg(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 85) return "bg-amber-400";
  return "bg-rose-500";
}
