import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class ReportsService {
  private gemini: GoogleGenerativeAI;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    this.gemini = new GoogleGenerativeAI(
      this.config.getOrThrow<string>('GEMINI_API_KEY'),
    );
  }

  async uploadAndExtract(
    userId: string,
    companyId: string,
    year: number,
    quarter: number,
    file: Express.Multer.File,
  ) {
    // 1. Verify company ownership
    const { data: company } = await this.supabase
      .getClient()
      .from('companies')
      .select('id, ticker, name')
      .eq('id', companyId)
      .eq('user_id', userId)
      .single();

    if (!company) throw new NotFoundException('Perusahaan tidak ditemukan');

    // 2. Upload PDF to Supabase Storage
    const fileName = `${userId}/${companyId}/${year}_Q${quarter}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await this.supabase
      .getClient()
      .storage.from('pdf-reports')
      .upload(fileName, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw new BadRequestException(`Upload gagal: ${uploadError.message}`);

    const { data: urlData } = this.supabase
      .getClient()
      .storage.from('pdf-reports')
      .getPublicUrl(fileName);

    // 3. Create report record
    const { data: report, error: reportError } = await this.supabase
      .getClient()
      .from('pdf_reports')
      .insert({
        company_id: companyId,
        user_id: userId,
        year,
        quarter,
        original_name: file.originalname,
        file_url: urlData.publicUrl,
        file_size: file.size,
        status: 'processing',
      })
      .select()
      .single();

    if (reportError) throw new Error(reportError.message);

    // 4. Extract text from PDF
    let extractedData: any = null;
    try {
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
      const pdfData = await parser.getText();
      
      // Selectively extract pages containing financial keywords to fit in context windows & avoid rate limits
      let pdfText = '';
      const pages = pdfData.pages || [];
      
      const neracaPages: any[] = [];
      const labaRugiPages: any[] = [];
      const sahamPages: any[] = [];

      for (const page of pages) {
        const textLower = page.text.toLowerCase();
        
        const isNeraca = 
          textLower.includes('total aset') || 
          textLower.includes('total assets') || 
          textLower.includes('posisi keuangan') || 
          textLower.includes('neraca') ||
          textLower.includes('skala usaha') ||
          textLower.includes('total liabilitas') ||
          textLower.includes('total liabilities') ||
          textLower.includes('total ekuitas') ||
          textLower.includes('total equity');
          
        const isLabaRugi = 
          textLower.includes('laba bersih') || 
          textLower.includes('net profit') || 
          textLower.includes('net income') || 
          textLower.includes('laba rugi') ||
          textLower.includes('laba usaha') ||
          textLower.includes('laba kotor') ||
          textLower.includes('laba bruto');

        const isSaham = 
          textLower.includes('saham beredar') ||
          textLower.includes('outstanding shares') ||
          textLower.includes('harga saham') ||
          textLower.includes('share price') ||
          textLower.includes('kapitalisasi pasar') ||
          textLower.includes('market capitalization');
          
        if (isNeraca) neracaPages.push(page);
        if (isLabaRugi) labaRugiPages.push(page);
        if (isSaham) sahamPages.push(page);
      }

      // Proportional selection to guarantee representation of all three categories within rate limits (total max 6-8 pages)
      const selectedPages: any[] = [];
      
      // Take the top 2 neraca pages (usually first 2 are the consolidated sheets)
      selectedPages.push(...neracaPages.slice(0, 2));
      
      // Take the top 2 laba rugi pages
      selectedPages.push(...labaRugiPages.slice(0, 2));
      
      // Take the top 2 saham pages (this ensures page 19/25 containing share info is captured!)
      selectedPages.push(...sahamPages.slice(0, 2));

      // Remove duplicates & sort by page number
      const uniqueSelected = Array.from(
        new Map(selectedPages.map(p => [p.num, p])).values()
      ).sort((a, b) => a.num - b.num);

      pdfText = uniqueSelected.map(p => `--- HALAMAN ${p.num} ---\n${p.text}\n\n`).join('');
      const finalMatchedNums = uniqueSelected.map(p => p.num);

      console.log(`[PDF Extraction] Categorized selection complete. Selected ${finalMatchedNums.length} pages: ${finalMatchedNums.join(', ')}`);

      // Fallback to first 40,000 characters if no page matched keywords
      if (pdfText.trim() === '') {
        console.log('[PDF Extraction] No pages matched. Falling back to first 40,000 characters.');
        pdfText = pdfData.text.slice(0, 40000);
      }

      // 5. Use Groq AI (if key is set) or Gemini AI to extract financial data
      const groqApiKey = this.config.get<string>('GROQ_API_KEY');
      if (groqApiKey && groqApiKey !== 'your-groq-api-key' && groqApiKey.trim() !== '') {
        try {
          console.log('[PDF Extraction] Attempting extraction with Groq...');
          extractedData = await this.extractWithGroq(
            pdfText,
            company.name,
            company.ticker,
            year,
            quarter,
            groqApiKey,
          );
        } catch (groqErr) {
          console.warn(`[PDF Extraction] Groq extraction failed: ${groqErr.message || groqErr}. Falling back to Gemini 2.0 Flash...`);
          extractedData = await this.extractWithGemini(
            pdfText,
            company.name,
            company.ticker,
            year,
            quarter,
          );
        }
      } else {
        console.log('[PDF Extraction] No Groq API Key found. Using Gemini...');
        extractedData = await this.extractWithGemini(
          pdfText,
          company.name,
          company.ticker,
          year,
          quarter,
        );
      }

      // 6. Update report as extracted
      await this.supabase
        .getClient()
        .from('pdf_reports')
        .update({
          status: 'extracted',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);
    } catch (err) {
      await this.supabase
        .getClient()
        .from('pdf_reports')
        .update({
          status: 'error',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      throw new BadRequestException(`Ekstraksi PDF gagal: ${err.message}`);
    }

    return {
      reportId: report.id,
      fileUrl: urlData.publicUrl,
      status: 'extracted',
      extractedData,
    };
  }

  private async extractWithGemini(
    pdfText: string,
    companyName: string,
    ticker: string,
    year: number,
    quarter: number,
  ) {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Kamu adalah ahli analisis laporan keuangan Indonesia. Ekstrak data keuangan dari laporan tahunan perusahaan berikut.

Perusahaan: ${companyName} (${ticker})
Tahun: ${year}
Kuartal: Q${quarter}

Teks laporan keuangan:
---
${pdfText}
---

PENTING: Ekstrak data keuangan dalam format JSON berikut. Semua nilai keuangan WAJIB dalam satuan JUTAAN RUPIAH (nilai riil dibagi 1.000.000). Jika laporan keuangan asli menggunakan satuan MILIAR RUPIAH (miliar) (contoh: Aset tertulis 19.570 atau 19.570.000.000), Anda WAJIB mengalikannya dengan 1.000 terlebih dahulu (menjadi 19.570.000) sebelum ditulis ke JSON agar satuannya konsisten dalam JUTAAN RUPIAH. Jika data tidak tersedia, gunakan null.

Kembalikan HANYA JSON tanpa markdown:
{
  "companyId": null,
  "year": ${year},
  "quarter": ${quarter},
  "totalAssets": null,
  "currentAssets": null,
  "nonCurrentAssets": null,
  "totalLiabilities": null,
  "currentLiabilities": null,
  "longTermLiabilities": null,
  "totalEquity": null,
  "workingCapital": null,
  "revenue": null,
  "costOfGoodsSold": null,
  "grossProfit": null,
  "operatingExpenses": null,
  "operatingProfit": null,
  "ebitda": null,
  "netProfit": null,
  "operatingCashFlow": null,
  "investingCashFlow": null,
  "financingCashFlow": null,
  "sharesOutstanding": null,
  "eps": null,
  "bvps": null,
  "marketPrice": null,
  "fairValue": null,
  "currency": "IDR",
  "unit": "jutaan",
  "confidence": 0.0,
  "notes": "catatan jika ada"
}
`;

    let result: any;
    let retries = 5;
    let delayMs = 10000;
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break; // success
      } catch (err: any) {
        retries--;
        const isRateLimit = err.message?.includes('429') || err.message?.includes('quota');
        if (isRateLimit && retries > 0) {
          console.warn(`Gemini rate limited (429). Retrying in ${delayMs / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs = Math.min(delayMs * 2, 30000);
        } else {
          throw err;
        }
      }
    }
    const text = result.response.text();

    // Clean and parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI tidak berhasil mengekstrak data keuangan');

    return JSON.parse(jsonMatch[0]);
  }

  private async extractWithGroq(
    pdfText: string,
    companyName: string,
    ticker: string,
    year: number,
    quarter: number,
    groqApiKey: string,
  ) {
    const prompt = `
Kamu adalah ahli analisis laporan keuangan Indonesia. Ekstrak data keuangan dari laporan tahunan perusahaan berikut.

Perusahaan: ${companyName} (${ticker})
Tahun: ${year}
Kuartal: Q${quarter}

Teks laporan keuangan:
---
${pdfText}
---

PENTING: Ekstrak data keuangan dalam format JSON berikut. Semua nilai keuangan WAJIB dalam satuan JUTAAN RUPIAH (nilai riil dibagi 1.000.000). Jika laporan keuangan asli menggunakan satuan MILIAR RUPIAH (miliar) (contoh: Aset tertulis 19.570 atau 19.570.000.000), Anda WAJIB mengalikannya dengan 1.000 terlebih dahulu (menjadi 19.570.000) sebelum ditulis ke JSON agar satuannya konsisten dalam JUTAAN RUPIAH. Jika data tidak tersedia, gunakan null.

Kembalikan HANYA JSON:
{
  "companyId": null,
  "year": ${year},
  "quarter": ${quarter},
  "totalAssets": null,
  "currentAssets": null,
  "nonCurrentAssets": null,
  "totalLiabilities": null,
  "currentLiabilities": null,
  "longTermLiabilities": null,
  "totalEquity": null,
  "workingCapital": null,
  "revenue": null,
  "costOfGoodsSold": null,
  "grossProfit": null,
  "operatingExpenses": null,
  "operatingProfit": null,
  "ebitda": null,
  "netProfit": null,
  "operatingCashFlow": null,
  "investingCashFlow": null,
  "financingCashFlow": null,
  "sharesOutstanding": null,
  "eps": null,
  "bvps": null,
  "marketPrice": null,
  "fairValue": null,
  "currency": "IDR",
  "unit": "jutaan",
  "confidence": 0.0,
  "notes": "catatan jika ada"
}
`;

    const models = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ];
    
    let lastError: Error | null = null;
    
    for (const modelName of models) {
      try {
        console.log(`[Groq Extraction] Attempting extraction with model: ${modelName}...`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Groq API Error: ${errorText}`);
        }

        const result: any = await response.json();
        const content = result.choices[0]?.message?.content;
        if (!content) throw new Error('Groq tidak mengembalikan data');
        
        // Clean and parse JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI (Groq) tidak berhasil mengekstrak data keuangan');

        console.log(`[Groq Extraction] Successfully extracted data using model: ${modelName}!`);
        return JSON.parse(jsonMatch[0]);
      } catch (err: any) {
        console.warn(`[Groq Extraction] Model ${modelName} failed: ${err.message || err}`);
        lastError = err;
      }
    }
    
    throw lastError || new Error('All Groq models failed');
  }

  async confirmExtraction(reportId: string, userId: string) {
    const { data: report } = await this.supabase
      .getClient()
      .from('pdf_reports')
      .select('*, companies!inner(user_id)')
      .eq('id', reportId)
      .single();

    if (!report || report.companies?.user_id !== userId) {
      throw new NotFoundException('Laporan tidak ditemukan');
    }

    if (report.status !== 'extracted') {
      throw new BadRequestException('Laporan belum selesai diekstrak');
    }

    const extractedData = report.extracted_data;
    if (!extractedData) throw new BadRequestException('Tidak ada data yang diekstrak');

    // Save to financial_data
    const payload = {
      ...extractedData,
      company_id: report.company_id,
      source_pdf_id: reportId,
    };

    // Convert camelCase to snake_case for DB with proper number sanitization/casting
    const dbPayload = {
      company_id: report.company_id,
      year: report.year,
      quarter: report.quarter,
      total_assets: this.parseBigInt(extractedData.totalAssets),
      current_assets: this.parseBigInt(extractedData.currentAssets),
      non_current_assets: this.parseBigInt(extractedData.nonCurrentAssets),
      total_liabilities: this.parseBigInt(extractedData.totalLiabilities),
      current_liabilities: this.parseBigInt(extractedData.currentLiabilities),
      long_term_liabilities: this.parseBigInt(extractedData.longTermLiabilities),
      total_equity: this.parseBigInt(extractedData.totalEquity),
      working_capital: this.parseBigInt(extractedData.workingCapital),
      revenue: this.parseBigInt(extractedData.revenue),
      cost_of_goods_sold: this.parseBigInt(extractedData.costOfGoodsSold),
      gross_profit: this.parseBigInt(extractedData.grossProfit),
      operating_expenses: this.parseBigInt(extractedData.operatingExpenses),
      operating_profit: this.parseBigInt(extractedData.operatingProfit),
      ebitda: this.parseBigInt(extractedData.ebitda),
      net_profit: this.parseBigInt(extractedData.netProfit),
      operating_cash_flow: this.parseBigInt(extractedData.operatingCashFlow),
      investing_cash_flow: this.parseBigInt(extractedData.investingCashFlow),
      financing_cash_flow: this.parseBigInt(extractedData.financingCashFlow),
      shares_outstanding: this.parseBigInt(extractedData.sharesOutstanding),
      eps: this.parseDecimal(extractedData.eps),
      bvps: this.parseDecimal(extractedData.bvps),
      market_price: this.parseDecimal(extractedData.marketPrice),
      source_pdf_id: reportId,
    };

    const { data: financial, error } = await this.supabase
      .getClient()
      .from('financial_data')
      .upsert(dbPayload, { onConflict: 'company_id,year,quarter' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mark report as confirmed
    await this.supabase
      .getClient()
      .from('pdf_reports')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', reportId);

    return { message: 'Data berhasil dikonfirmasi', financial };
  }

  private parseBigInt(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return Math.round(val);
    if (typeof val === 'string') {
      let cleaned = val.trim();
      if (cleaned === '' || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'n/a') return null;
      
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');
      
      if (hasComma && hasDot) {
        cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
      } else if (hasComma && !hasDot) {
        const matchThreeDigits = /,(\d{3})$/.test(cleaned);
        if (matchThreeDigits) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot && !hasComma) {
        const matchThreeDigits = /\.(\d{3})$/.test(cleaned);
        const parts = cleaned.split('.');
        if (matchThreeDigits || parts.length > 2) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      cleaned = cleaned.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : Math.round(parsed);
    }
    return null;
  }

  private parseDecimal(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      let cleaned = val.trim();
      if (cleaned === '' || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'n/a') return null;
      
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');
      
      if (hasComma && hasDot) {
        cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
      } else if (hasComma && !hasDot) {
        const matchThreeDigits = /,(\d{3})$/.test(cleaned);
        if (matchThreeDigits) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot && !hasComma) {
        const matchThreeDigits = /\.(\d{3})$/.test(cleaned);
        const parts = cleaned.split('.');
        if (matchThreeDigits || parts.length > 2) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      cleaned = cleaned.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  async findByCompany(companyId: string, userId: string) {
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
      .from('pdf_reports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}
