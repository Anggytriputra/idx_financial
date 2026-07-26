"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Company, PdfReport } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, FileText, CheckCircle2, XCircle,
  Loader2, Eye, AlertCircle, ChevronDown,
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "extracted" | "confirming" | "done" | "error";

interface ExtractedData {
  year: number;
  quarter: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  revenue?: number;
  grossProfit?: number;
  netProfit?: number;
  operatingProfit?: number;
  currency?: string;
  unit?: string;
  confidence?: number;
  notes?: string;
  [key: string]: unknown;
}

export default function UploadPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedCompanyId = searchParams.get("companyId");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(preselectedCompanyId || "");
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [quarter, setQuarter] = useState(4);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [recentReports, setRecentReports] = useState<PdfReport[]>([]);

  useEffect(() => {
    api.get<Company[]>("/companies").then(setCompanies).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      api.get<PdfReport[]>(`/reports/company/${selectedCompanyId}`)
        .then(setRecentReports)
        .catch(() => {});
    }
  }, [selectedCompanyId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
    } else {
      toast.error("Hanya file PDF yang diterima");
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !selectedCompanyId || !year) {
      toast.error("Lengkapi semua field terlebih dahulu");
      return;
    }

    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", selectedCompanyId);
      formData.append("year", String(year));
      formData.append("quarter", String(quarter));

      const result = await api.upload<{
        reportId: string;
        extractedData: ExtractedData;
        status: string;
      }>("/reports/upload", formData);

      setReportId(result.reportId);
      setExtractedData(result.extractedData);
      setUploadStatus("extracted");
      toast.success("PDF berhasil diekstrak oleh AI!");
    } catch (err: any) {
      setUploadStatus("error");
      toast.error(err.message || "Upload gagal");
    }
  };

  const handleFieldChange = (field: keyof ExtractedData, value: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: value === "" ? null : value,
    });
  };

  // Auto-calculate BVPS, EPS and Fair Value if dependencies are populated
  useEffect(() => {
    if (!extractedData) return;

    const totalEquity = Number(extractedData.totalEquity);
    const netProfit = Number(extractedData.netProfit);
    const shares = Number(extractedData.sharesOutstanding);

    let updated = false;
    const nextData = { ...extractedData };

    if (totalEquity && shares && (extractedData.bvps === null || extractedData.bvps === undefined || extractedData.bvps === "")) {
      nextData.bvps = parseFloat(((totalEquity * 1000000) / shares).toFixed(4));
      updated = true;
    }

    if (netProfit && shares && (extractedData.eps === null || extractedData.eps === undefined || extractedData.eps === "")) {
      nextData.eps = parseFloat(((netProfit * 1000000) / shares).toFixed(4));
      updated = true;
    }

    const epsVal = nextData.eps !== null && nextData.eps !== undefined ? Number(nextData.eps) : null;
    const bvpsVal = nextData.bvps !== null && nextData.bvps !== undefined ? Number(nextData.bvps) : null;

    if (epsVal !== null && bvpsVal !== null && epsVal > 0 && bvpsVal > 0) {
      const calculatedFairValue = parseFloat(Math.sqrt(22.5 * epsVal * bvpsVal).toFixed(2));
      if (nextData.fairValue !== calculatedFairValue) {
        nextData.fairValue = calculatedFairValue;
        updated = true;
      }
    } else if (epsVal !== null && epsVal <= 0) {
      if (nextData.fairValue !== null && nextData.fairValue !== "") {
        nextData.fairValue = null;
        updated = true;
      }
    }

    if (updated) {
      setExtractedData(nextData);
    }
  }, [extractedData?.totalEquity, extractedData?.netProfit, extractedData?.sharesOutstanding, extractedData?.eps, extractedData?.bvps]);

  const handleConfirm = async () => {
    if (!reportId) return;
    setUploadStatus("confirming");
    try {
      await api.post(`/reports/${reportId}/confirm`, { extractedData });
      setUploadStatus("done");
      toast.success("Data berhasil disimpan! Chart akan terupdate.");

      if (selectedCompanyId) {
        setTimeout(() => router.push(`/companies/${selectedCompanyId}`), 1500);
      }
    } catch (err: any) {
      setUploadStatus("extracted");
      toast.error(err.message || "Konfirmasi gagal");
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload PDF</h1>
          <p className="text-muted-foreground text-sm">
            Upload laporan keuangan — AI akan mengekstrak data otomatis
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["Pilih & Upload", "Verifikasi AI", "Selesai"].map((step, i) => {
          const stepStatus =
            uploadStatus === "idle" || uploadStatus === "uploading"
              ? i === 0 ? "active" : "pending"
              : uploadStatus === "extracted" || uploadStatus === "confirming"
                ? i === 0 ? "done" : i === 1 ? "active" : "pending"
                : i < 2 ? "done" : "active";
          return (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${stepStatus === "pending" ? "opacity-40" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  stepStatus === "done"
                    ? "bg-green-500 border-green-500 text-white"
                    : stepStatus === "active"
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                }`}>
                  {stepStatus === "done" ? "✓" : i + 1}
                </div>
                <span className={`text-sm font-medium ${stepStatus === "active" ? "text-foreground" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-border mx-2" />}
            </div>
          );
        })}
      </div>

      {/* Upload Form */}
      {(uploadStatus === "idle" || uploadStatus === "uploading" || uploadStatus === "error") && (
        <div className="glass rounded-2xl p-6 border border-border/50 space-y-5">
          {/* Company selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Perusahaan *
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih perusahaan...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ticker} — {c.name}
                </option>
              ))}
            </select>
            {companies.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Belum ada perusahaan.{" "}
                <Link href="/companies/new" className="text-primary hover:underline">
                  Tambah dulu
                </Link>
              </p>
            )}
          </div>

          {/* Year & Quarter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Tahun *
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={inputClass}
              >
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Periode
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className={inputClass}
              >
                <option value={4}>Q4 / Tahunan</option>
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
              </select>
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              File PDF *
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? "dropzone-active border-primary"
                  : file
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Hapus file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Drag & drop PDF di sini
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      atau klik untuk browse file
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF laporan keuangan BEI · Maks 50MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Info box */}
          <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Bagaimana AI bekerja?</p>
              <p className="text-muted-foreground mt-1">
                Setelah upload, Google Gemini AI akan membaca PDF dan mengekstrak data
                keuangan secara otomatis. Anda akan diminta verifikasi hasilnya sebelum
                disimpan ke database.
              </p>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || !selectedCompanyId || uploadStatus === "uploading"}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary/25"
          >
            {uploadStatus === "uploading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI sedang membaca PDF... (bisa 30–60 detik)
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload & Ekstrak dengan AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Extracted Data Review */}
      {(uploadStatus === "extracted" || uploadStatus === "confirming") && extractedData && (
        <div className="glass rounded-2xl p-6 border border-border/50 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/20 border border-green-500/30">
              <Eye className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                Hasil Ekstraksi AI — {selectedCompany?.ticker} {year}
              </h2>
              <p className="text-xs text-muted-foreground">
                Periksa data ini sebelum menyimpan ke database
                {extractedData.confidence && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-primary/20 text-primary text-xs">
                    Kepercayaan: {(extractedData.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Data preview sections */}
          <div className="space-y-6">
            {/* Neraca */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/30 pb-1">Neraca (Balance Sheet)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "Total Aset", field: "totalAssets", value: extractedData.totalAssets, unit: extractedData.unit || "juta" },
                  { label: "Aset Lancar", field: "currentAssets", value: extractedData.currentAssets, unit: extractedData.unit || "juta" },
                  { label: "Aset Tidak Lancar", field: "nonCurrentAssets", value: extractedData.nonCurrentAssets, unit: extractedData.unit || "juta" },
                  { label: "Total Liabilitas", field: "totalLiabilities", value: extractedData.totalLiabilities, unit: extractedData.unit || "juta" },
                  { label: "Liabilitas Jangka Pendek", field: "currentLiabilities", value: extractedData.currentLiabilities, unit: extractedData.unit || "juta" },
                  { label: "Liabilitas Jangka Panjang", field: "longTermLiabilities", value: extractedData.longTermLiabilities, unit: extractedData.unit || "juta" },
                  { label: "Total Ekuitas", field: "totalEquity", value: extractedData.totalEquity, unit: extractedData.unit || "juta" },
                  { label: "Modal Kerja (Working Capital)", field: "workingCapital", value: extractedData.workingCapital, unit: extractedData.unit || "juta" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/20 border border-border/20">
                    <span className="text-xs text-muted-foreground font-medium mr-2">{item.label}</span>
                    <div className="flex items-center gap-1.5 max-w-[60%]">
                      <input
                        type="text"
                        value={item.value !== null && item.value !== undefined ? String(item.value) : ""}
                        onChange={(e) => handleFieldChange(item.field as keyof ExtractedData, e.target.value)}
                        className="w-32 px-2 py-1 text-right text-xs font-semibold bg-background/40 border border-border/60 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                      <span className="text-[10px] text-muted-foreground font-medium min-w-[35px]">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Laba Rugi */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/30 pb-1">Laba Rugi (Income Statement)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "Pendapatan / Penjualan", field: "revenue", value: extractedData.revenue, unit: extractedData.unit || "juta" },
                  { label: "Beban Pokok Penjualan (COGS)", field: "costOfGoodsSold", value: extractedData.costOfGoodsSold, unit: extractedData.unit || "juta" },
                  { label: "Laba Kotor (Gross Profit)", field: "grossProfit", value: extractedData.grossProfit, unit: extractedData.unit || "juta" },
                  { label: "Beban Usaha (Operating Expenses)", field: "operatingExpenses", value: extractedData.operatingExpenses, unit: extractedData.unit || "juta" },
                  { label: "Laba Operasional", field: "operatingProfit", value: extractedData.operatingProfit, unit: extractedData.unit || "juta" },
                  { label: "EBITDA", field: "ebitda", value: extractedData.ebitda, unit: extractedData.unit || "juta" },
                  { label: "Laba Bersih", field: "netProfit", value: extractedData.netProfit, unit: extractedData.unit || "juta" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/20 border border-border/20">
                    <span className="text-xs text-muted-foreground font-medium mr-2">{item.label}</span>
                    <div className="flex items-center gap-1.5 max-w-[60%]">
                      <input
                        type="text"
                        value={item.value !== null && item.value !== undefined ? String(item.value) : ""}
                        onChange={(e) => handleFieldChange(item.field as keyof ExtractedData, e.target.value)}
                        className="w-32 px-2 py-1 text-right text-xs font-semibold bg-background/40 border border-border/60 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                      <span className="text-[10px] text-muted-foreground font-medium min-w-[35px]">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arus Kas & Saham */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/30 pb-1">Arus Kas & Informasi Saham</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "Arus Kas Operasi", field: "operatingCashFlow", value: extractedData.operatingCashFlow, unit: extractedData.unit || "juta" },
                  { label: "Arus Kas Investasi", field: "investingCashFlow", value: extractedData.investingCashFlow, unit: extractedData.unit || "juta" },
                  { label: "Arus Kas Pendanaan", field: "financingCashFlow", value: extractedData.financingCashFlow, unit: extractedData.unit || "juta" },
                  { label: "Jumlah Saham Beredar", field: "sharesOutstanding", value: extractedData.sharesOutstanding, unit: "lembar" },
                  { label: "Laba per Saham (EPS)", field: "eps", value: extractedData.eps, unit: "Rp" },
                  { label: "Nilai Buku per Saham (BVPS)", field: "bvps", value: extractedData.bvps, unit: "Rp" },
                  { label: "Harga Pasar Saham", field: "marketPrice", value: extractedData.marketPrice, unit: "Rp" },
                  { label: "Harga Wajar Graham", field: "fairValue", value: extractedData.fairValue, unit: "Rp" },
                  { label: "Dividen per Saham (DPS)", field: "dividend", value: extractedData.dividend, unit: "Rp" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/20 border border-border/20">
                    <span className="text-xs text-muted-foreground font-medium mr-2">{item.label}</span>
                    <div className="flex items-center gap-1.5 max-w-[60%]">
                      <input
                        type="text"
                        value={item.value !== null && item.value !== undefined ? String(item.value) : ""}
                        onChange={(e) => handleFieldChange(item.field as keyof ExtractedData, e.target.value)}
                        className="w-32 px-2 py-1 text-right text-xs font-semibold bg-background/40 border border-border/60 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                      <span className="text-[10px] text-muted-foreground font-medium min-w-[35px]">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {extractedData.notes && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-500/90">
              📝 {extractedData.notes}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setUploadStatus("idle"); setFile(null); setExtractedData(null); setReportId(null); }}
              className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-all text-sm font-medium"
            >
              Ulang Upload
            </button>
            <button
              onClick={handleConfirm}
              disabled={uploadStatus === "confirming"}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white hover:bg-green-600/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
            >
              {uploadStatus === "confirming" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Konfirmasi & Simpan</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Done state */}
      {uploadStatus === "done" && (
        <div className="glass rounded-2xl p-12 border border-green-500/30 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Data Berhasil Disimpan!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Data keuangan {selectedCompany?.ticker} {year} sudah masuk ke database.
            Anda akan dialihkan ke halaman detail...
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/companies/${selectedCompanyId}`}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium"
            >
              Lihat Analisis
            </Link>
            <button
              onClick={() => { setUploadStatus("idle"); setFile(null); setExtractedData(null); setReportId(null); }}
              className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-all text-sm font-medium"
            >
              Upload Lagi
            </button>
          </div>
        </div>
      )}

      {/* Recent reports */}
      {selectedCompanyId && recentReports.length > 0 && uploadStatus === "idle" && (
        <div className="glass rounded-2xl p-5 border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Riwayat Upload — {selectedCompany?.ticker}
          </h3>
          <div className="space-y-2">
            {recentReports.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-foreground">{report.original_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.year} Q{report.quarter} · {new Date(report.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  report.status === "confirmed" ? "bg-green-500/20 text-green-500" :
                  report.status === "extracted" ? "bg-yellow-500/20 text-yellow-500" :
                  report.status === "error" ? "bg-red-500/20 text-red-500" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {report.status === "confirmed" ? "✓ Tersimpan" :
                   report.status === "extracted" ? "Perlu Konfirmasi" :
                   report.status === "processing" ? "Diproses..." :
                   report.status === "error" ? "Error" : report.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
