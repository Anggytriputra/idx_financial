"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import { SECTORS } from "@/lib/utils-financial";

export default function NewCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    ticker: "",
    name: "",
    sector: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "ticker" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const company = await api.post<{ id: string }>("/companies", form);
      toast.success(`${form.ticker} berhasil ditambahkan!`);
      router.push(`/companies/${company.id}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan saham");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/companies"
          className="p-2 rounded-xl hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tambah Saham</h1>
          <p className="text-muted-foreground text-sm">
            Tambahkan perusahaan BEI ke watchlist Anda
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-8 border border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Informasi Perusahaan</h2>
            <p className="text-xs text-muted-foreground">
              Masukkan kode saham dan nama perusahaan
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ticker" className={labelClass}>
                Kode Saham (Ticker) *
              </label>
              <input
                id="ticker"
                name="ticker"
                type="text"
                value={form.ticker}
                onChange={handleChange}
                placeholder="Contoh: AUTO, BBCA, TLKM"
                required
                maxLength={10}
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kode saham BEI (huruf kapital)
              </p>
            </div>

            <div>
              <label htmlFor="sector" className={labelClass}>
                Sektor
              </label>
              <select
                id="sector"
                name="sector"
                value={form.sector}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Pilih sektor...</option>
                {Object.entries(SECTORS).map(([key, label]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="name" className={labelClass}>
              Nama Perusahaan *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Contoh: PT Astra Otoparts Tbk"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Catatan (Opsional)
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Catatan tentang perusahaan ini..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/companies"
              className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-all text-center text-sm font-medium"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-primary/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {loading ? "Menyimpan..." : "Tambah Saham"}
            </button>
          </div>
        </form>
      </div>

      <div className="glass rounded-2xl p-5 border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          💡 Saham Populer BEI
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { ticker: "BBCA", name: "Bank Central Asia" },
            { ticker: "BBRI", name: "Bank Rakyat Indonesia" },
            { ticker: "TLKM", name: "Telkom Indonesia" },
            { ticker: "ASII", name: "Astra International" },
            { ticker: "AUTO", name: "Astra Otoparts" },
            { ticker: "UNVR", name: "Unilever Indonesia" },
          ].map((s) => (
            <button
              key={s.ticker}
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  ticker: s.ticker,
                  name: s.name,
                }))
              }
              className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium hover:bg-accent hover:border-primary/30 transition-all"
            >
              {s.ticker}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
