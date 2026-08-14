"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Company, FinancialData, FinancialRatios } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, BarChart3, Upload, FileText, TrendingUp,
  Scale, DollarSign, Activity, RefreshCw
} from "lucide-react";
import { FinancialTrendChart } from "@/components/charts/financial-trend-chart";
import { RatioBarChart } from "@/components/charts/ratio-bar-chart";
import {
  formatCurrency, formatPercent, formatRatio, formatPrice, formatNumber,
  yoyChange, getChangeColor, getChangePrefix
} from "@/lib/utils-financial";

type Tab = "balance" | "income" | "ratios" | "valuation" | "cashflow";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "balance", label: "Balance Sheet", icon: Scale },
  { id: "income", label: "Laba Rugi", icon: TrendingUp },
  { id: "ratios", label: "Rasio Keuangan", icon: BarChart3 },
  { id: "valuation", label: "Valuasi", icon: DollarSign },
  { id: "cashflow", label: "Arus Kas", icon: Activity },
];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [financials, setFinancials] = useState<FinancialData[]>([]);
  const [ratios, setRatios] = useState<FinancialRatios[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("balance");

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companyData, financialData] = await Promise.all([
        api.get<Company>(`/companies/${id}`),
        api.get<{ financials: FinancialData[]; ratios: FinancialRatios[] }>(
          `/financials/company/${id}`
        ),
      ]);
      setCompany(companyData);
      setFinancials(financialData.financials.filter(f => f.quarter === 4));
      setRatios(financialData.ratios.filter(r => r.quarter === 4));
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat data");
      router.push("/companies");
    } finally {
      setLoading(false);
    }
  };

  const chartData = financials.map((f) => ({ ...f }));
  const ratioChartData = (key: keyof FinancialRatios) =>
    ratios.map((r) => ({ year: r.year, value: r[key] as number | null }));

  const latest = financials[financials.length - 1];
  const prev = financials[financials.length - 2];
  const latestRatio = ratios[ratios.length - 1];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/companies" className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-primary/20 text-primary font-bold border border-primary/20 text-lg">
                {company.ticker}
              </span>
              {company.sector && (
                <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs text-muted-foreground border border-border">
                  {company.sector}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground mt-1">{company.name}</h1>
          </div>
        </div>
        <Link
          href={`/upload?companyId=${id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium shadow-lg shadow-primary/25"
        >
          <Upload className="w-4 h-4" />
          Upload PDF
        </Link>
      </div>

      {/* KPI Summary cards */}
      {latest ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Total Aset",
              value: formatCurrency(latest.total_assets),
              change: yoyChange(latest.total_assets, prev?.total_assets),
              year: latest.year,
            },
            {
              label: "Pendapatan",
              value: formatCurrency(latest.revenue),
              change: yoyChange(latest.revenue, prev?.revenue),
              year: latest.year,
            },
            {
              label: "Laba Bersih",
              value: formatCurrency(latest.net_profit),
              change: yoyChange(latest.net_profit, prev?.net_profit),
              year: latest.year,
            },
            {
              label: "ROE",
              value: formatPercent(latestRatio?.roe),
              change: latestRatio?.roe && ratios[ratios.length - 2]?.roe
                ? latestRatio.roe - (ratios[ratios.length - 2]?.roe ?? 0)
                : null,
              year: latest.year,
              isRaw: true,
            },
          ].map((kpi) => (
            <div key={kpi.label} className="glass rounded-2xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">{kpi.label} {kpi.year}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              {kpi.change !== null && kpi.change !== undefined && (
                <p className={`text-xs mt-1 ${getChangeColor(kpi.change)}`}>
                  {getChangePrefix(kpi.change)}{kpi.isRaw ? kpi.change.toFixed(2) : kpi.change.toFixed(1)}
                  {kpi.isRaw ? "pp" : "%"} YOY
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 border border-border/50 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">Belum ada data keuangan</p>
          <p className="text-muted-foreground text-sm mb-4">
            Upload PDF laporan keuangan untuk mulai analisis
          </p>
          <Link
            href={`/upload?companyId=${id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Sekarang
          </Link>
        </div>
      )}

      {/* Tabs */}
      {financials.length > 0 && (
        <div className="glass rounded-2xl border border-border/50 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-border/50">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  tab === t.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Balance Sheet Tab */}
            {tab === "balance" && (
              <div className="space-y-6">
                <FinancialTrendChart
                  data={chartData}
                  title="Balance Sheet YOY (Juta Rupiah)"
                  series={[
                    { key: "total_assets", label: "Total Aset", color: "oklch(0.55 0.22 264)" },
                    { key: "total_equity", label: "Total Ekuitas", color: "oklch(0.65 0.18 145)" },
                    { key: "total_liabilities", label: "Total Liabilitas", color: "oklch(0.62 0.22 25)" },
                  ]}
                />
                <FinancialDataTable financials={financials} type="balance" />
              </div>
            )}

            {/* Income Statement Tab */}
            {tab === "income" && (
              <div className="space-y-6">
                <FinancialTrendChart
                  data={chartData}
                  title="Laba Rugi YOY (Juta Rupiah)"
                  series={[
                    { key: "revenue", label: "Pendapatan", color: "oklch(0.55 0.22 264)" },
                    { key: "gross_profit", label: "Laba Bruto", color: "oklch(0.75 0.18 75)" },
                    { key: "net_profit", label: "Laba Bersih", color: "oklch(0.65 0.18 145)" },
                  ]}
                />
                <FinancialDataTable financials={financials} type="income" />
              </div>
            )}

            {/* Ratios Tab */}
            {tab === "ratios" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[
                    { key: "gpm" as keyof FinancialRatios, label: "Gross Profit Margin", desc: "Laba Bruto / Pendapatan" },
                    { key: "opm" as keyof FinancialRatios, label: "Operating Profit Margin", desc: "Laba Operasional / Pendapatan" },
                    { key: "npm" as keyof FinancialRatios, label: "Net Profit Margin", desc: "Laba Bersih / Pendapatan" },
                    { key: "roa" as keyof FinancialRatios, label: "Return on Assets", desc: "Laba Bersih / Total Aset" },
                    { key: "roe" as keyof FinancialRatios, label: "Return on Equity", desc: "Laba Bersih / Total Ekuitas" },
                    { key: "der" as keyof FinancialRatios, label: "Debt-to-Equity Ratio", desc: "Total Liabilitas / Ekuitas", unit: "ratio" as const },
                    { key: "tato" as keyof FinancialRatios, label: "Total Asset Turnover", desc: "Pendapatan / Total Aset", unit: "ratio" as const },
                    { key: "currentRatio" as keyof FinancialRatios, label: "Current Ratio", desc: "Aset Lancar / Liabilitas Lancar", unit: "ratio" as const },
                  ].map((r) => {
                    const latestVal = latestRatio?.[r.key] as number | null;
                    return (
                      <div key={r.key} className="bg-secondary/30 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.label}</p>
                            <p className="text-xs text-muted-foreground">{r.desc}</p>
                          </div>
                          <span className={`text-lg font-bold ${getChangeColor(latestVal)}`}>
                            {r.unit === "ratio" ? formatRatio(latestVal) : formatPercent(latestVal)}
                          </span>
                        </div>
                        <RatioBarChart
                          data={ratioChartData(r.key)}
                          label={r.label}
                          unit={r.unit ?? "percent"}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Valuation Tab */}
            {tab === "valuation" && (
              <div className="space-y-6">
                <FinancialTrendChart
                  data={chartData}
                  title="Harga Wajar vs Harga Pasar (Rp)"
                  series={[
                    { key: "fair_value", label: "Harga Wajar", color: "oklch(0.65 0.18 145)" },
                    { key: "market_price", label: "Harga Pasar", color: "oklch(0.62 0.22 25)" },
                  ]}
                  unit="ratio"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "PBV", value: formatRatio(latestRatio?.pbv), desc: "Price/Book Value" },
                    { label: "PER", value: formatRatio(latestRatio?.per), desc: "Price/Earnings" },
                    { label: "EPS", value: formatPrice(latestRatio?.eps), desc: "Earnings Per Share" },
                    { label: "BVPS", value: formatPrice(latestRatio?.bvps), desc: "Book Value Per Share" },
                  ].map((v) => (
                    <div key={v.label} className="bg-secondary/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{v.desc}</p>
                      <p className="text-2xl font-bold text-foreground">{v.label}</p>
                      <p className="text-primary font-semibold mt-1">{v.value}</p>
                    </div>
                  ))}
                </div>
                <FinancialDataTable financials={financials} type="valuation" />
              </div>
            )}

            {/* Cash Flow Tab */}
            {tab === "cashflow" && (
              <div className="space-y-6">
                <FinancialTrendChart
                  data={chartData}
                  title="Arus Kas YOY (Juta Rupiah)"
                  series={[
                    { key: "operating_cash_flow", label: "Kas Operasi", color: "oklch(0.55 0.22 264)" },
                    { key: "investing_cash_flow", label: "Kas Investasi", color: "oklch(0.75 0.18 75)" },
                    { key: "financing_cash_flow", label: "Kas Pendanaan", color: "oklch(0.62 0.22 25)" },
                  ]}
                />
                <FinancialDataTable financials={financials} type="cashflow" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-component: Data Table ───────────────────────────────── */
function FinancialDataTable({
  financials,
  type,
}: {
  financials: FinancialData[];
  type: "balance" | "income" | "cashflow" | "valuation";
}) {
  const rows = {
    balance: [
      { label: "Total Aset", key: "total_assets" },
      { label: "Aset Lancar", key: "current_assets" },
      { label: "Aset Tidak Lancar", key: "non_current_assets" },
      { label: "Total Liabilitas", key: "total_liabilities" },
      { label: "Liabilitas Jk. Pendek", key: "current_liabilities" },
      { label: "Liabilitas Jk. Panjang", key: "long_term_liabilities" },
      { label: "Total Ekuitas", key: "total_equity" },
      { label: "Modal Kerja Bersih", key: "working_capital" },
    ],
    income: [
      { label: "Pendapatan Bersih", key: "revenue" },
      { label: "Beban Pokok", key: "cost_of_goods_sold" },
      { label: "Laba Bruto", key: "gross_profit" },
      { label: "Beban Operasional", key: "operating_expenses" },
      { label: "Laba Operasional", key: "operating_profit" },
      { label: "EBITDA", key: "ebitda" },
      { label: "Laba Bersih", key: "net_profit" },
    ],
    cashflow: [
      { label: "Arus Kas Operasi", key: "operating_cash_flow" },
      { label: "Arus Kas Investasi", key: "investing_cash_flow" },
      { label: "Arus Kas Pendanaan", key: "financing_cash_flow" },
    ],
    valuation: [
      { label: "Saham Beredar", key: "shares_outstanding" },
      { label: "EPS (Rp)", key: "eps" },
      { label: "BVPS (Rp)", key: "bvps" },
      { label: "Harga Pasar (Rp)", key: "market_price" },
      { label: "Harga Wajar (Rp)", key: "fair_value" },
      { label: "Dividen per Saham (Rp)", key: "dividend" },
      { label: "Market Cap", key: "market_cap" },
    ],
  }[type] as { label: string; key: keyof FinancialData }[];

  const years = financials.map((f) => f.year);

  const formatValue = (key: keyof FinancialData, val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    if (key === "shares_outstanding") return formatNumber(val);
    if (["eps", "bvps", "market_price", "fair_value", "dividend"].includes(key)) return formatPrice(val);
    return formatCurrency(val);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-secondary/30">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium sticky left-0 bg-secondary/30">
              Keterangan
            </th>
            {years.map((y) => (
              <th key={y} className="px-4 py-3 text-right text-muted-foreground font-medium">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
            >
              <td className="px-4 py-2.5 text-foreground font-medium sticky left-0 bg-card">
                {row.label}
              </td>
              {financials.map((f) => {
                const val = f[row.key] as number | null | undefined;
                const prev = financials[financials.indexOf(f) - 1];
                const prevVal = prev ? (prev[row.key] as number | null | undefined) : null;
                const change = yoyChange(val, prevVal);
                return (
                  <td key={f.year} className="px-4 py-2.5 text-right">
                    <div>
                      <span className={`font-medium ${val && val < 0 ? "value-negative" : "text-foreground"}`}>
                        {formatValue(row.key, val)}
                      </span>
                      {change !== null && prev && (
                        <div className={`text-xs ${getChangeColor(change)}`}>
                          {getChangePrefix(change)}{change.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
