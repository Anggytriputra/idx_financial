export function formatCurrency(
  value: number | null | undefined,
  unit: "juta" | "miliar" | "triliun" = "juta",
): string {
  if (value === null || value === undefined) return "—";

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (unit === "juta") {
    if (absValue >= 1_000_000) {
      return `${sign}Rp ${(absValue / 1_000_000).toFixed(1)}T`;
    }
    if (absValue >= 1_000) {
      return `${sign}Rp ${(absValue / 1_000).toFixed(1)}M`;
    }
    return `${sign}Rp ${absValue.toLocaleString("id-ID")}Jt`;
  }

  return `${sign}Rp ${value.toLocaleString("id-ID")}`;
}

export function formatPercent(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatRatio(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(decimals)}x`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("id-ID");
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function getChangeColor(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  if (value > 0) return "value-positive";
  if (value < 0) return "value-negative";
  return "text-muted-foreground";
}

export function getChangePrefix(value: number | null): string {
  if (value === null) return "";
  return value > 0 ? "+" : "";
}

/** Calculate YOY change as percentage */
export function yoyChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (!current || !previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Short sector names */
export const SECTORS: Record<string, string> = {
  FINANCE: "Keuangan",
  CONSUMER: "Konsumer",
  PROPERTY: "Properti",
  INFRASTRUCTURE: "Infrastruktur",
  MINING: "Pertambangan",
  AGRICULTURE: "Pertanian",
  MANUFACTURING: "Manufaktur",
  TRADE: "Perdagangan",
  TECHNOLOGY: "Teknologi",
  AUTOMOTIVE: "Otomotif",
  HEALTHCARE: "Kesehatan",
  ENERGY: "Energi",
  TELECOM: "Telekomunikasi",
  OTHER: "Lainnya",
};

export const QUARTER_LABELS: Record<number, string> = {
  1: "Q1",
  2: "Q2",
  3: "Q3",
  4: "Q4 / Annual",
};
