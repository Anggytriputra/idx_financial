import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFinancialDto } from './dto/create-financial.dto';

export interface FinancialRatios {
  year: number;
  quarter: number;
  gpm: number | null;       // Gross Profit Margin
  opm: number | null;       // Operating Profit Margin
  npm: number | null;       // Net Profit Margin
  roa: number | null;       // Return on Assets
  roe: number | null;       // Return on Equity
  der: number | null;       // Debt-to-Equity Ratio
  pbv: number | null;       // Price-to-Book Value
  per: number | null;       // Price-to-Earnings Ratio
  tato: number | null;      // Total Asset Turnover
  currentRatio: number | null;
  eps: number | null;
  bvps: number | null;
}

@Injectable()
export class FinancialsService {
  constructor(private readonly supabase: SupabaseService) { }

  private toSnakeCase(dto: CreateFinancialDto) {
    const raw = {
      company_id: dto.companyId,
      year: dto.year,
      quarter: dto.quarter ?? 4,
      total_assets: dto.totalAssets,
      current_assets: dto.currentAssets,
      non_current_assets: dto.nonCurrentAssets,
      total_liabilities: dto.totalLiabilities,
      current_liabilities: dto.currentLiabilities,
      long_term_liabilities: dto.longTermLiabilities,
      total_equity: dto.totalEquity,
      working_capital: dto.workingCapital,
      revenue: dto.revenue,
      cost_of_goods_sold: dto.costOfGoodsSold,
      gross_profit: dto.grossProfit,
      operating_expenses: dto.operatingExpenses,
      operating_profit: dto.operatingProfit,
      ebitda: dto.ebitda,
      net_profit: dto.netProfit,
      operating_cash_flow: dto.operatingCashFlow,
      investing_cash_flow: dto.investingCashFlow,
      financing_cash_flow: dto.financingCashFlow,
      shares_outstanding: dto.sharesOutstanding,
      eps: dto.eps,
      bvps: dto.bvps,
      market_price: dto.marketPrice,
      fair_value: dto.fairValue,
      market_cap: dto.marketCap,
      notes: dto.notes,
      source_pdf_id: dto.sourcePdfId,
    };
    return this.calculateDerivedFields(raw);
  }

  private calculateDerivedFields(row: any) {
    if (!row) return row;

    // Normalize shares_outstanding if entered/extracted in Millions of shares (e.g., 4820 instead of 4820000000)
    const rawShares = row.shares_outstanding ? Number(row.shares_outstanding) : null;
    const effectiveShares =
      rawShares && rawShares > 0 && rawShares < 100000
        ? rawShares * 1000000
        : rawShares;

    // Normalize total_equity if extracted in Billions instead of Millions (e.g., total_equity < net_profit)
    const rawEquity = row.total_equity ? Number(row.total_equity) : null;
    const rawNetProfit = row.net_profit ? Number(row.net_profit) : null;
    const effectiveEquity =
      rawEquity && rawNetProfit && rawEquity > 0 && rawEquity < rawNetProfit
        ? rawEquity * 1000
        : rawEquity;

    // EPS calculation (net_profit is in millions, effectiveShares is in raw units)
    const eps =
      row.eps !== null && row.eps !== undefined
        ? parseFloat(Number(row.eps).toFixed(4))
        : row.net_profit && effectiveShares
          ? parseFloat(((row.net_profit * 1000000) / effectiveShares).toFixed(4))
          : null;

    // BVPS calculation (effectiveEquity is in millions, effectiveShares is in raw units)
    const bvps =
      effectiveEquity && effectiveShares
        ? parseFloat(((effectiveEquity * 1000000) / effectiveShares).toFixed(4))
        : row.bvps !== null && row.bvps !== undefined
          ? parseFloat(Number(row.bvps).toFixed(4))
          : null;

    // Fair Value calculation using Graham Number: sqrt(22.5 * EPS * BVPS)
    let fair_value = row.fair_value;
    if (
      (fair_value === null || fair_value === undefined) &&
      eps &&
      bvps &&
      eps > 0 &&
      bvps > 0
    ) {
      fair_value = parseFloat(Math.sqrt(22.5 * eps * bvps).toFixed(2));
    }

    // Market Capitalization: effectiveShares * market_price scaled to millions of Rupiah
    let market_cap = row.market_cap;
    if (
      (market_cap === null || market_cap === undefined || market_cap < 1000) &&
      effectiveShares &&
      row.market_price
    ) {
      market_cap = Math.round((effectiveShares * row.market_price) / 1000000);
    }

    return {
      ...row,
      total_equity: effectiveEquity ?? row.total_equity,
      shares_outstanding: effectiveShares ?? row.shares_outstanding,
      eps,
      bvps,
      fair_value,
      market_cap,
    };
  }

  private computeRatios(row: any): FinancialRatios {
    const safe = (num: number, den: number, mult = 1): number | null => {
      if (num === null || num === undefined || !den || den === 0) return null;
      return parseFloat(((num / den) * mult).toFixed(4));
    };

    return {
      year: row.year,
      quarter: row.quarter,
      gpm: safe(row.gross_profit, row.revenue, 100),
      opm: safe(row.operating_profit, row.revenue, 100),
      npm: safe(row.net_profit, row.revenue, 100),
      roa: safe(row.net_profit, row.total_assets, 100),
      roe: safe(row.net_profit, row.total_equity, 100),
      der: safe(row.total_liabilities, row.total_equity),
      pbv: row.bvps ? safe(row.market_price, row.bvps) : null,
      per: row.eps ? safe(row.market_price, row.eps) : null,
      tato: safe(row.revenue, row.total_assets),
      currentRatio: safe(row.current_assets, row.current_liabilities),
      eps: row.eps,
      bvps: row.bvps,
    };
  }

  async findByCompany(companyId: string, userId: string) {
    // Verify ownership
    const { data: company } = await this.supabase
      .getClient()
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', userId)
      .single();

    if (!company) throw new NotFoundException('Perusahaan tidak ditemukan');

    const { data, error } = await this.supabase
      .getClient()
      .from('financial_data')
      .select('*')
      .eq('company_id', companyId)
      .order('year', { ascending: true })
      .order('quarter', { ascending: true });

    if (error) throw new Error(error.message);

    const financialsWithCalculated = data.map((row) => this.calculateDerivedFields(row));

    return {
      financials: financialsWithCalculated,
      ratios: financialsWithCalculated.map((row) => this.computeRatios(row)),
    };
  }

  async create(userId: string, dto: CreateFinancialDto) {
    // Verify ownership of the company
    const { data: company } = await this.supabase
      .getClient()
      .from('companies')
      .select('id')
      .eq('id', dto.companyId)
      .eq('user_id', userId)
      .single();

    if (!company) throw new NotFoundException('Perusahaan tidak ditemukan');

    const payload = this.toSnakeCase(dto);

    const { data, error } = await this.supabase
      .getClient()
      .from('financial_data')
      .upsert(payload, { onConflict: 'company_id,year,quarter' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const calculated = this.calculateDerivedFields(data);
    return { ...calculated, ratios: this.computeRatios(calculated) };
  }

  async update(id: string, userId: string, dto: Partial<CreateFinancialDto>) {
    // Verify ownership
    const { data: existing } = await this.supabase
      .getClient()
      .from('financial_data')
      .select('*, companies!inner(user_id)')
      .eq('id', id)
      .single();

    if (!existing || existing.companies?.user_id !== userId) {
      throw new NotFoundException('Data tidak ditemukan');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('financial_data')
      .update({ ...this.toSnakeCase(dto as CreateFinancialDto), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    const calculated = this.calculateDerivedFields(data);
    return { ...calculated, ratios: this.computeRatios(calculated) };
  }

  async remove(id: string, userId: string) {
    const { data: existing } = await this.supabase
      .getClient()
      .from('financial_data')
      .select('*, companies!inner(user_id)')
      .eq('id', id)
      .single();

    if (!existing || existing.companies?.user_id !== userId) {
      throw new NotFoundException('Data tidak ditemukan');
    }

    await this.supabase.getClient().from('financial_data').delete().eq('id', id);
    return { message: 'Data berhasil dihapus' };
  }

  async getRatios(companyId: string, userId: string) {
    const result = await this.findByCompany(companyId, userId);
    return result.ratios;
  }
}
