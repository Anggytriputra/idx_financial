"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Company } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Plus, Search, Trash2, BarChart3, ChevronRight } from "lucide-react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await api.get<Company[]>("/companies");
      setCompanies(data);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, ticker: string) => {
    if (!confirm(`Hapus ${ticker}? Semua data keuangan akan ikut terhapus.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/companies/${id}`);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast.success(`${ticker} berhasil dihapus`);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.ticker.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perusahaan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {companies.length} saham di watchlist Anda
          </p>
        </div>
        <Link
          href="/companies/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Tambah Saham
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari ticker atau nama perusahaan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-border/50 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {search ? "Tidak ditemukan" : "Belum ada saham"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {search
              ? `Tidak ada saham dengan kata kunci "${search}"`
              : "Tambahkan saham BEI pertama Anda"}
          </p>
          {!search && (
            <Link
              href="/companies/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
              Tambah Sekarang
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((company) => (
            <div
              key={company.id}
              className="glass rounded-2xl border border-border/50 flex items-center card-hover overflow-hidden"
            >
              <Link
                href={`/companies/${company.id}`}
                className="flex-1 flex items-center gap-4 p-5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {company.ticker.slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-foreground">
                      {company.ticker}
                    </span>
                    {company.sector && (
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground">
                        {company.sector}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {company.name}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
              </Link>
              <div className="border-l border-border/50 flex">
                <Link
                  href={`/companies/${company.id}`}
                  className="p-4 hover:bg-accent transition-colors"
                  title="Lihat Analisis"
                >
                  <BarChart3 className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
                <button
                  onClick={() => handleDelete(company.id, company.ticker)}
                  disabled={deletingId === company.id}
                  className="p-4 hover:bg-destructive/10 transition-colors"
                  title="Hapus"
                >
                  {deletingId === company.id ? (
                    <div className="w-5 h-5 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
