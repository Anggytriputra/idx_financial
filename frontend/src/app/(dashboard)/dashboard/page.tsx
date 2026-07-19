"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Company, FinancialData } from "@/lib/api";
import { formatCurrency, yoyChange, getChangeColor, getChangePrefix } from "@/lib/utils-financial";
import { Building2, Plus, TrendingDown, TrendingUp, BarChart3, Upload } from "lucide-react";
import { toast } from "sonner";

interface CompanyWithLatest extends Company {
  latestRevenue?: number;
  latestNetProfit?: number;
  revenueChange?: number | null;
  netProfitChange?: number | null;
  latestYear?: number;
}

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanyWithLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const companiesData = await api.get<Company[]>("/companies");

      const enriched: CompanyWithLatest[] = await Promise.all(
        companiesData.map(async (c) => {
          try {
            const { financials } = await api.get<{ financials: FinancialData[] }>(
              `/financials/company/${c.id}`,
            );
            const annual = financials.filter((f) => f.quarter === 4);
            const latest = annual[annual.length - 1];
            const prev = annual[annual.length - 2];

            return {
              ...c,
              latestRevenue: latest?.revenue,
              latestNetProfit: latest?.net_profit,
              latestYear: latest?.year,
              revenueChange: yoyChange(latest?.revenue, prev?.revenue),
              netProfitChange: yoyChange(latest?.net_profit, prev?.net_profit),
            };
          } catch {
            return c;
          }
        }),
      );

      setCompanies(enriched);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const totalCompanies = companies.length;
  const profitable = companies.filter((c) => (c.latestNetProfit ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview portofolio saham Anda
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/upload"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-accent transition-all text-sm font-medium border border-border"
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </Link>
          <Link
            href="/companies/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4" />
            Tambah Saham
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Saham",
            value: totalCompanies,
            icon: Building2,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Perusahaan Profitable",
            value: profitable,
            icon: TrendingUp,
            color: "text-green-500",
            bg: "bg-green-500/10",
          },
          {
            label: "Perlu Review",
            value: totalCompanies - profitable,
            icon: TrendingDown,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="glass rounded-2xl p-5 border border-border/50 card-hover"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? (
                    <span className="skeleton inline-block w-12 h-8 rounded" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Companies list */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Daftar Saham Saya
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-border/50 space-y-3">
                <div className="skeleton h-6 w-24 rounded" />
                <div className="skeleton h-4 w-40 rounded" />
                <div className="skeleton h-10 w-full rounded" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="glass rounded-2xl p-12 border border-border/50 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Belum ada saham
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Tambahkan saham pertama Anda dan upload laporan keuangan PDF-nya
            </p>
            <Link
              href="/companies/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
            >
              <Plus className="w-5 h-5" />
              Tambah Saham Sekarang
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="glass rounded-2xl p-5 border border-border/50 card-hover block group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-sm font-bold border border-primary/20">
                        {company.ticker}
                      </span>
                      {company.latestYear && (
                        <span className="text-xs text-muted-foreground">
                          Data {company.latestYear}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground font-medium mt-2 text-sm leading-snug">
                      {company.name}
                    </p>
                    {company.sector && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {company.sector}
                      </p>
                    )}
                  </div>
                  <BarChart3 className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Pendapatan</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(company.latestRevenue)}
                    </p>
                    {company.revenueChange !== undefined &&
                      company.revenueChange !== null && (
                        <p
                          className={`text-xs mt-0.5 ${getChangeColor(company.revenueChange)}`}
                        >
                          {getChangePrefix(company.revenueChange)}
                          {company.revenueChange.toFixed(1)}%
                        </p>
                      )}
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Laba Bersih</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(company.latestNetProfit)}
                    </p>
                    {company.netProfitChange !== undefined &&
                      company.netProfitChange !== null && (
                        <p
                          className={`text-xs mt-0.5 ${getChangeColor(company.netProfitChange)}`}
                        >
                          {getChangePrefix(company.netProfitChange)}
                          {company.netProfitChange.toFixed(1)}%
                        </p>
                      )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
