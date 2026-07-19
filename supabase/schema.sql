-- ============================================================
-- IDX Financial Analyzer — Supabase Database Schema
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Enable Row Level Security
-- Semua tabel pakai RLS agar data user terisolasi

-- ============================================================
-- TABLE: companies
-- Menyimpan daftar perusahaan yang di-watch user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker      VARCHAR(10) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  sector      VARCHAR(100),
  description TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own companies"
  ON public.companies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: financial_data
-- Data keuangan tahunan/kuartalan perusahaan
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_data (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year                INT NOT NULL,
  quarter             INT NOT NULL DEFAULT 4, -- 1=Q1, 2=Q2, 3=Q3, 4=Q4/Annual

  -- ── Balance Sheet ──────────────────────────────────────────
  total_assets        BIGINT,                 -- Total Aset
  current_assets      BIGINT,                 -- Aset Lancar
  non_current_assets  BIGINT,                 -- Aset Tidak Lancar
  total_liabilities   BIGINT,                 -- Total Liabilitas
  current_liabilities BIGINT,                 -- Liabilitas Jangka Pendek
  long_term_liabilities BIGINT,               -- Liabilitas Jangka Panjang
  total_equity        BIGINT,                 -- Total Ekuitas
  working_capital     BIGINT,                 -- Modal Kerja Bersih

  -- ── Income Statement ───────────────────────────────────────
  revenue             BIGINT,                 -- Pendapatan Bersih
  cost_of_goods_sold  BIGINT,                 -- Beban Pokok Penjualan
  gross_profit        BIGINT,                 -- Laba Bruto
  operating_expenses  BIGINT,                 -- Beban Operasional
  operating_profit    BIGINT,                 -- Laba Operasional (EBIT)
  ebitda              BIGINT,                 -- EBITDA
  net_profit          BIGINT,                 -- Laba Bersih

  -- ── Cash Flow ──────────────────────────────────────────────
  operating_cash_flow BIGINT,                 -- Arus Kas Operasi
  investing_cash_flow BIGINT,                 -- Arus Kas Investasi
  financing_cash_flow BIGINT,                 -- Arus Kas Pendanaan

  -- ── Per Share ──────────────────────────────────────────────
  shares_outstanding  BIGINT,                 -- Saham Beredar
  eps                 DECIMAL(15,4),           -- Earnings Per Share
  bvps                DECIMAL(15,4),           -- Book Value Per Share

  -- ── Market Data ────────────────────────────────────────────
  market_price        DECIMAL(15,2),           -- Harga Pasar Saham
  fair_value          DECIMAL(15,2),           -- Harga Wajar (Valuasi)
  market_cap          BIGINT,                  -- Market Kapitalisasi

  -- ── Source ─────────────────────────────────────────────────
  source_pdf_id       UUID,                    -- FK ke pdf_reports
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, year, quarter)
);

ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage financial data of their companies"
  ON public.financial_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = financial_data.company_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = financial_data.company_id AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: pdf_reports
-- Log upload dan hasil parsing PDF
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pdf_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year            INT NOT NULL,
  quarter         INT NOT NULL DEFAULT 4,
  original_name   VARCHAR(255) NOT NULL,
  file_url        TEXT NOT NULL,              -- Supabase Storage URL
  file_size       BIGINT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
                  -- pending | processing | extracted | confirmed | error
  extracted_data  JSONB,                      -- Raw data dari AI sebelum dikonfirmasi
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pdf_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pdf reports"
  ON public.pdf_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Tambah foreign key dari financial_data ke pdf_reports
-- ============================================================
ALTER TABLE public.financial_data
  ADD CONSTRAINT fk_financial_data_pdf
  FOREIGN KEY (source_pdf_id)
  REFERENCES public.pdf_reports(id)
  ON DELETE SET NULL;

-- ============================================================
-- FUNCTION: update updated_at otomatis
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER financial_data_updated_at
  BEFORE UPDATE ON public.financial_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER pdf_reports_updated_at
  BEFORE UPDATE ON public.pdf_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Supabase Storage Bucket (jalankan terpisah atau via Dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('pdf-reports', 'pdf-reports', false);
--
-- CREATE POLICY "Authenticated users can upload PDFs"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'pdf-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can read their own PDFs"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'pdf-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
