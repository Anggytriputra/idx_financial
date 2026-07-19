const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
        ? JSON.stringify(body)
        : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.message || data.error || `Request gagal: ${res.status}`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, formData, true),
};

// ── Type helpers ─────────────────────────────────────────────
export interface Company {
  id: string;
  ticker: string;
  name: string;
  sector?: string;
  description?: string;
  created_at: string;
}

export interface FinancialData {
  id: string;
  company_id: string;
  year: number;
  quarter: number;
  total_assets?: number;
  current_assets?: number;
  non_current_assets?: number;
  total_liabilities?: number;
  current_liabilities?: number;
  long_term_liabilities?: number;
  total_equity?: number;
  working_capital?: number;
  revenue?: number;
  cost_of_goods_sold?: number;
  gross_profit?: number;
  operating_expenses?: number;
  operating_profit?: number;
  ebitda?: number;
  net_profit?: number;
  operating_cash_flow?: number;
  investing_cash_flow?: number;
  financing_cash_flow?: number;
  shares_outstanding?: number;
  eps?: number;
  bvps?: number;
  market_price?: number;
  fair_value?: number;
  market_cap?: number;
  source_pdf_id?: string;
  notes?: string;
  created_at: string;
}

export interface FinancialRatios {
  year: number;
  quarter: number;
  gpm: number | null;
  opm: number | null;
  npm: number | null;
  roa: number | null;
  roe: number | null;
  der: number | null;
  pbv: number | null;
  per: number | null;
  tato: number | null;
  currentRatio: number | null;
  eps: number | null;
  bvps: number | null;
}

export interface PdfReport {
  id: string;
  company_id: string;
  year: number;
  quarter: number;
  original_name: string;
  file_url: string;
  status: "pending" | "processing" | "extracted" | "confirmed" | "error";
  extracted_data?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
}
