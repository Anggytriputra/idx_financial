# IDX Financial Analyzer

A web application designed to analyze public company financial statements from the Indonesia Stock Exchange (IDX / Bursa Efek Indonesia).
Upload PDF reports → AI extracts data automatically → View YOY charts, key financial ratios, and valuation analysis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + Tailwind CSS + Recharts |
| Backend | NestJS + TypeScript |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth (JWT) |
| AI | Groq API (Llama-3.3-70b & Llama-3.1-8b) |

## Quick Start

### 1. Setup Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `supabase/schema.sql` via the Supabase SQL Editor
3. Create a Storage Bucket named `pdf-reports` (Private)
4. Retrieve and note down your credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`

### 2. Setup Backend
```bash
cd backend
copy .env.example .env
# Edit .env and fill in your Supabase credentials and Groq API Key
npm run start:dev
```

### 3. Setup Frontend
```bash
cd frontend
copy .env.local.example .env.local
# Edit .env.local and fill in your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-----------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access) |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase Dashboard > Settings > API |
| `GROQ_API_KEY` | Groq API key from [Groq Console](https://console.groq.com/) |
| `FRONTEND_URL` | Frontend URL (default: http://localhost:3000) |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:3001/api) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |

## Key Features

- 🔐 **Authentication** — Secure login and registration powered by Supabase Auth.
- 🏢 **Watchlist Management** — Easily add or remove IDX tickers in your watchlist.
- 📤 **Drag & Drop Upload** — Simple PDF financial statement uploader.
- 🤖 **AI Extraction & Verification** — Groq API (Llama 3.3) extracts financial numbers automatically with an interactive, editable preview grid for direct verification before database insertion.
- 📊 **YOY Trend Charts** — Visual representation of Balance Sheet, Income Statement, and Cash Flow metrics.
- 🔢 **Financial Ratios** — Automatically calculates key metrics including GPM, OPM, NPM, ROA, ROE, DER, PBV, PER, and TATO.
- 💰 **Valuation & Dividens** — Calculates Graham Number Fair Value vs Market Price, auto-computes BVPS, and logs historical Dividend Per Share (DPS).

## Project Structure
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
│       │   ├── (auth)/       # Login, Register
│       │   └── (dashboard)/  # Dashboard, Companies, Upload
│       ├── components/
│       │   ├── charts/
│       │   └── layout/
│       └── lib/
└── supabase/
    └── schema.sql    # Database schema
```
