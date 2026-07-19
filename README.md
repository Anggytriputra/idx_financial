# IDX Financial Analyzer

Aplikasi web untuk menganalisis laporan keuangan perusahaan publik Bursa Efek Indonesia (BEI).
Upload PDF laporan keuangan → AI ekstrak data otomatis → Chart & rasio keuangan YOY.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16 + Tailwind CSS + Recharts |
| Backend | NestJS + TypeScript |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth (JWT) |
| AI | Google Gemini 1.5 Flash |

## Quick Start

### 1. Setup Supabase
1. Buat project di [supabase.com](https://supabase.com)
2. Jalankan SQL di `supabase/schema.sql` via Supabase SQL Editor
3. Buat Storage Bucket bernama `pdf-reports` (private)
4. Catat: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`

### 2. Setup Backend
```bash
cd backend
copy .env.example .env
# Edit .env dengan credentials Supabase dan Gemini API Key
npm run start:dev
```

### 3. Setup Frontend
```bash
cd frontend
copy .env.local.example .env.local
# Edit .env.local dengan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

### 4. Akses Aplikasi
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

## Environment Variables

### Backend (`backend/.env`)
| Variable | Keterangan |
|----------|-----------|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_JWT_SECRET` | JWT secret dari Supabase Dashboard > Settings > API |
| `GEMINI_API_KEY` | Google Gemini API key dari [Google AI Studio](https://aistudio.google.com/) |
| `FRONTEND_URL` | URL frontend (default: http://localhost:3000) |

### Frontend (`frontend/.env.local`)
| Variable | Keterangan |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL backend API (default: http://localhost:3001/api) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |

## Fitur Utama

- 🔐 **Login & Register** — autentikasi via Supabase
- 🏢 **Manajemen Perusahaan** — tambah/hapus saham BEI ke watchlist
- 📤 **Upload PDF** — drag & drop laporan keuangan tahunan
- 🤖 **AI Extraction** — Google Gemini membaca & ekstrak data keuangan dari PDF
- 📊 **Chart YOY** — grafik tren Balance Sheet, Laba Rugi, Arus Kas
- 🔢 **Rasio Keuangan Otomatis** — GPM, OPM, NPM, ROA, ROE, DER, PBV, PER, TATO
- 💰 **Valuasi** — perbandingan Harga Wajar vs Harga Pasar

## Struktur Proyek
```
idx_financial/
├── backend/          # NestJS API
│   └── src/
│       ├── auth/
│       ├── companies/
│       ├── financials/
│       ├── reports/  # PDF upload + AI extraction
│       └── supabase/
├── frontend/         # Next.js App
│   └── src/
│       ├── app/
│       │   ├── (auth)/       # login, register
│       │   └── (dashboard)/  # dashboard, companies, upload
│       ├── components/
│       │   ├── charts/
│       │   └── layout/
│       └── lib/
└── supabase/
    └── schema.sql    # Database schema
```
