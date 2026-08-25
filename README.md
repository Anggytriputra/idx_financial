# 📈 IDX Financial Analyzer

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

A comprehensive, production-ready web application designed to analyze public company financial statements from the **Indonesia Stock Exchange (IDX / Bursa Efek Indonesia)**. 
Upload PDF reports → AI extracts data automatically → View YOY charts, key financial ratios, and valuation analysis.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 + Tailwind CSS + Recharts |
| **Backend** | NestJS + TypeScript |
| **Database & Auth** | Supabase (PostgreSQL, Storage, Auth JWT) |
| **AI Processing** | Groq API (Llama-3.3-70b) & Google Gemini API (Gemini 2.0 Flash fallback) |
| **DevOps / Deployment** | Docker Compose + GitHub Actions (CI/CD) + AWS EC2 |

---

## ✨ Key Features

- 🔐 **Authentication** — Secure login and registration powered by Supabase Auth.
- 🏢 **Watchlist Management** — Easily add or remove IDX tickers in your watchlist.
- 📤 **Drag & Drop Upload** — Simple PDF financial statement uploader.
- 🤖 **AI Extraction & Verification** — Groq API & Google Gemini API extract financial numbers automatically with an interactive, editable preview grid for direct verification before database insertion.
- 📊 **YOY Trend Charts** — Visual representation of Balance Sheet, Income Statement, and Cash Flow metrics.
- 🔢 **Financial Ratios** — Automatically calculates key metrics including GPM, OPM, NPM, ROA, ROE, DER, PBV, PER, and TATO.
- 💰 **Valuation & Dividends** — Calculates Graham Number Fair Value vs Market Price, auto-computes BVPS, and logs historical Dividend Per Share (DPS).
- 🚀 **Automated CI/CD** — Fully automated testing and deployment pipeline using GitHub Actions, deployed to AWS EC2 via Docker.

---

## 🚀 Quick Start (Local Development)

### 1. Setup Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `supabase/schema.sql` via the Supabase SQL Editor
3. Create a Storage Bucket named `pdf-reports` (Private)
4. Retrieve and note down your credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`

### 2. Setup Backend
```bash
cd backend
copy .env.example .env
# Edit .env and fill in your Supabase credentials, Groq API Key, and Gemini API Key
npm install
npm run start:dev
```

### 3. Setup Frontend
```bash
cd frontend
copy .env.local.example .env.local
# Edit .env.local and fill in your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

---

## 🐳 Deployment (Docker & AWS)

This project is fully dockerized and ready for production deployment on AWS EC2 or any Linux VPS.

```bash
# 1. Create global environment file
cat << 'EOF' > .env
DATABASE_URL=postgresql://postgres:rahasia_password@db:5432/idx_financial_db
FRONTEND_URL=http://your-server-ip:3000
EOF

# 2. Build and run containers
sudo docker compose up -d --build
```
> **Note:** The backend automatically sources the `.env` file from the `backend/` directory in production. Ensure your Supabase and AI keys are securely stored there.

---

## 🤖 CI/CD Pipeline (GitHub Actions)

This project utilizes a robust CI/CD pipeline defined in `.github/workflows`:

1. **Continuous Integration (CI):** 
   - `frontend-ci.yml` & `backend-ci.yml` run automatically on every Pull Request.
   - They verify code integrity, install dependencies, and build the applications to ensure no broken code is merged.
2. **Continuous Deployment (CD):**
   - `deploy-cd.yml` triggers automatically upon merging code to the `master` branch.
   - It securely SSHs into the production AWS EC2 instance, pulls the latest code, and restarts the Docker containers with zero downtime.
   - **Email Notifications:** The CD pipeline is configured to automatically email the engineering team if a deployment fails in production.

---

## 📂 Project Structure
```
idx_financial/
├── .github/          # CI/CD Workflows (Frontend CI, Backend CI, Deploy CD)
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
│       │   ├── (auth)/       
│       │   └── (dashboard)/  
│       ├── components/
│       └── lib/
├── supabase/         # Database Scripts
│   └── schema.sql    
└── docker-compose.yml # Production Container Orchestration
```
