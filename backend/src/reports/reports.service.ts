import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { PDFParse } from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

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

    // 4. Extract data from PDF (Primary: Fast Smart Text Extraction - 12k tokens = 2s execution & zero rate limits)
    let extractedData: any = null;
    try {
      try {
        console.log('[PDF Extraction] Extracting key financial statement pages (Groq-Only Mode)...');
        const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
        const pdfData = await parser.getText();
        
        let pdfText = '';
        const pages = pdfData.pages || [];
        
        const neracaPages: any[] = [];
        const labaRugiPages: any[] = [];
        const arusKasPages: any[] = [];
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
            textLower.includes('total equity') ||
            textLower.includes('balance sheet');
            
          const isLabaRugi = 
            textLower.includes('laba bersih') || 
            textLower.includes('net profit') || 
            textLower.includes('net income') || 
            textLower.includes('laba rugi') ||
            textLower.includes('laba usaha') ||
            textLower.includes('laba kotor') ||
            textLower.includes('laba bruto') ||
            textLower.includes('income statement') ||
            textLower.includes('statement of profit');

          const isArusKas =
            textLower.includes('arus kas') ||
            textLower.includes('cash flow') ||
            textLower.includes('cash flows') ||
            textLower.includes('aktivitas operasi') ||
            textLower.includes('operating activities') ||
            textLower.includes('aktivitas investasi') ||
            textLower.includes('investing activities') ||
            textLower.includes('aktivitas pendanaan') ||
            textLower.includes('financing activities') ||
            textLower.includes('kas bersih') ||
            textLower.includes('kas dan setara kas');

          const isSaham = 
            textLower.includes('saham beredar') ||
            textLower.includes('outstanding shares') ||
            textLower.includes('jumlah saham') ||
            textLower.includes('harga saham') ||
            textLower.includes('share price') ||
            textLower.includes('kapitalisasi pasar') ||
            textLower.includes('market capitalization') ||
            textLower.includes('harga penutupan') ||
            textLower.includes('closing price') ||
            textLower.includes('laba per saham') ||
            textLower.includes('earnings per share') ||
            textLower.includes('dividen') ||
            textLower.includes('dividend');
            
          if (isNeraca) neracaPages.push(page);
          if (isLabaRugi) labaRugiPages.push(page);
          if (isArusKas) arusKasPages.push(page);
          if (isSaham) sahamPages.push(page);
        }

        const selectedPages: any[] = [];
        selectedPages.push(...pages.slice(0, 4));
        selectedPages.push(...neracaPages.slice(0, 4));
        selectedPages.push(...labaRugiPages.slice(0, 4));
        selectedPages.push(...arusKasPages.slice(0, 5));
        selectedPages.push(...sahamPages.slice(0, 4));

        const uniqueSelected = Array.from(
          new Map(selectedPages.map(p => [p.num, p])).values()
        ).sort((a, b) => a.num - b.num);

        pdfText = uniqueSelected.map(p => `--- HALAMAN ${p.num} ---\n${p.text}\n\n`).join('');

        if (pdfText.trim() === '') {
          pdfText = pdfData.text.slice(0, 50000);
        }

        const groqApiKey = this.config.get<string>('GROQ_API_KEY');
        const geminiApiKey = this.config.get<string>('GEMINI_API_KEY');

        try {
          if (!groqApiKey || groqApiKey === 'your-groq-api-key' || groqApiKey.trim() === '') {
            throw new Error('GROQ_API_KEY tidak ditemukan.');
          }
          console.log('[PDF Extraction] Extracting via Groq API...');
          extractedData = await this.extractWithGroq(pdfText, company.name, company.ticker, year, quarter, groqApiKey);
          console.log('[PDF Extraction] Groq extraction complete & successful!');
        } catch (groqErr: any) {
          console.warn(`[PDF Extraction] Groq failed: ${groqErr.message || groqErr}. Falling back to Google Gemini...`);
          
          if (!geminiApiKey || geminiApiKey === 'your-gemini-api-key' || geminiApiKey.trim() === '') {
            throw new Error(`Groq gagal (${groqErr.message}) dan GEMINI_API_KEY tidak dikonfigurasi di file .env.`);
          }

          console.log('[PDF Extraction] Extracting via Google Gemini API (gemini-2.0-flash)...');
          extractedData = await this.extractWithGemini(pdfText, company.name, company.ticker, year, quarter, geminiApiKey);
          console.log('[PDF Extraction] Gemini extraction complete & successful!');
        }
      } catch (textErr: any) {
        console.error(`[PDF Extraction] Fallback pipeline failed: ${textErr.message || textErr}`);
        throw textErr;
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
    } catch (err: any) {
      const isQuotaError = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Quota exceeded') || err.message?.includes('rate_limit_exceeded');
      const userErrMsg = isQuotaError
        ? 'Batas kuota gratis AI (Groq/Gemini) terlampaui. Silakan tunggu 1 menit lalu coba upload kembali.'
        : `Ekstraksi PDF gagal: ${err.message}`;

      await this.supabase
        .getClient()
        .from('pdf_reports')
        .update({
          status: 'error',
          error_message: userErrMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      throw new BadRequestException(userErrMsg);
    }

    return {
      reportId: report.id,
      fileUrl: urlData.publicUrl,
      status: 'extracted',
      extractedData,
    };
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

PENTING: Ekstrak data keuangan dalam format JSON berikut. SEMUA NILAI KEUANGAN (Aset, Liabilitas, Ekuitas, Pendapatan, Laba, Arus Kas) WAJIB DALAM SATUAN JUTAAN RUPIAH (nilai riil dibagi 1.000.000).

PERHATIKAN SATUAN PELAPORAN PADA HEADER/JUDUL LAPORAN:
1. Jika laporan tertulis "disajikan dalam MILIAR RUPIAH" / "in BILLIONS of Rupiah":
   - Contoh: Total Ekuitas 13.052 (miliar) -> tulis 13052000 (Jutaan Rupiah).
   - Contoh: Total Aset 19.570 (miliar) -> tulis 19570000 (Jutaan Rupiah).
2. Jika laporan tertulis "disajikan dalam JUTAAN RUPIAH" / "in MILLIONS of Rupiah":
   - Tulis angka apa adanya.
3. Jika laporan tertulis "disajikan dalam RIBUAN RUPIAH" / "in THOUSANDS of Rupiah":
   - Bagi angka dengan 1.000.

PETUNJUK SPESIFIK TIAP FIELD:
- Arus Kas (operatingCashFlow, investingCashFlow, financingCashFlow):
  - Ekstrak Arus Kas Bersih dari Aktivitas Operasi (operatingCashFlow), Aktivitas Investasi (investingCashFlow), dan Aktivitas Pendanaan (financingCashFlow) pada Laporan Arus Kas.
  - Wajib disajikan dalam SATUAN JUTAAN RUPIAH. Jika angka bernilai negatif atau dalam kurung (misal: (2.450.000)), beri tanda minus (contoh: -2450000).
- Saham Beredar (sharesOutstanding):
  - Wajib ditulis dalam SATUAN LEMBAR UTUH (contoh: 4820000000 lembar, BUKAN 4820 atau disingkat juta/ribu lembar). Jika tertulis 4.820 juta lembar, kalikan 1.000.000 menjadi 4820000000.
- Harga Pasar Saham (marketPrice) & Dividen per Saham (dividend):
  - Jika laporan mencantumkan Harga Pasar Saham / Harga Penutupan (closing price) atau Dividen per Saham (DPS / dividen kas), masukkan angkanya (dalam Rupiah utuh). Jika tidak dicantumkan, berikan null.

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
  "dividend": null,
  "currency": "IDR",
  "unit": "jutaan",
  "confidence": 0.0,
  "notes": "catatan ekstraksi"
}
`;

    const models = [
      'llama-3.3-70b-versatile',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];
    
    let lastError: Error | null = null;
    
    for (const modelName of models) {
      let retries = 3;
      while (retries > 0) {
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
          retries--;
          const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('quota');
          if (isRateLimit && retries > 0) {
            let waitSeconds = 15;
            const match = err.message?.match(/try again in ([0-9.]+)s/i) || err.message?.match(/please wait ([0-9.]+)s/i) || err.message?.match(/retry in ([0-9.]+)s/i);
            if (match && match[1]) {
              waitSeconds = Math.ceil(parseFloat(match[1])) + 2;
            }
            console.warn(`[Groq Extraction] Model ${modelName} rate limited (429). Waiting ${waitSeconds}s automatically in background...`);
            await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
          } else {
            console.warn(`[Groq Extraction] Model ${modelName} failed: ${err.message || err}`);
            lastError = err;
            break; // Go to next model
          }
        }
      }
    }
    
    throw lastError || new Error('All Groq models failed');
  }

  private async extractWithGemini(
    pdfText: string,
    companyName: string,
    ticker: string,
    year: number,
    quarter: number,
    apiKey: string,
  ) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
Kamu adalah ahli analisis laporan keuangan Indonesia. Ekstrak data keuangan dari laporan tahunan perusahaan berikut.

Perusahaan: ${companyName} (${ticker})
Tahun: ${year}
Kuartal: Q${quarter}

Teks laporan keuangan:
---
${pdfText}
---

PENTING: Ekstrak data keuangan dalam format JSON berikut. SEMUA NILAI KEUANGAN (Aset, Liabilitas, Ekuitas, Pendapatan, Laba, Arus Kas) WAJIB DALAM SATUAN JUTAAN RUPIAH (nilai riil dibagi 1.000.000).

PERHATIKAN SATUAN PELAPORAN PADA HEADER/JUDUL LAPORAN:
1. Jika laporan tertulis "disajikan dalam MILIAR RUPIAH" / "in BILLIONS of Rupiah":
   - Contoh: Total Ekuitas 13.052 (miliar) -> tulis 13052000 (Jutaan Rupiah).
   - Contoh: Total Aset 19.570 (miliar) -> tulis 19570000 (Jutaan Rupiah).
2. Jika laporan tertulis "disajikan dalam JUTAAN RUPIAH" / "in MILLIONS of Rupiah":
   - Tulis angka apa adanya.
3. Jika laporan tertulis "disajikan dalam RIBUAN RUPIAH" / "in THOUSANDS of Rupiah":
   - Bagi angka dengan 1.000.

PETUNJUK SPESIFIK TIAP FIELD:
- Arus Kas (operatingCashFlow, investingCashFlow, financingCashFlow):
  - Ekstrak Arus Kas Bersih dari Aktivitas Operasi (operatingCashFlow), Aktivitas Investasi (investingCashFlow), dan Aktivitas Pendanaan (financingCashFlow) pada Laporan Arus Kas.
  - Wajib disajikan dalam SATUAN JUTAAN RUPIAH. Jika angka bernilai negatif atau dalam kurung (misal: (2.450.000)), beri tanda minus (contoh: -2450000).
- Saham Beredar (sharesOutstanding):
  - Wajib ditulis dalam SATUAN LEMBAR UTUH (contoh: 4820000000 lembar, BUKAN 4820 atau disingkat juta/ribu lembar). Jika tertulis 4.820 juta lembar, kalikan 1.000.000 menjadi 4820000000.
- Harga Pasar Saham (marketPrice) & Dividen per Saham (dividend):
  - Jika laporan mencantumkan Harga Pasar Saham / Harga Penutupan (closing price) atau Dividen per Saham (DPS / dividen kas), masukkan angkanya (dalam Rupiah utuh). Jika tidak dicantumkan, berikan null.

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
  "dividend": null,
  "currency": "IDR",
  "unit": "jutaan",
  "confidence": 0.0,
  "notes": "catatan ekstraksi"
}
`;

    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
    let lastError: Error | null = null;

    for (const modelName of geminiModels) {
      let retries = 3;
      while (retries > 0) {
        try {
          console.log(`[Gemini Extraction] Attempting model: ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
            },
          });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error(`AI (Gemini ${modelName}) tidak berhasil mengekstrak data JSON`);
          console.log(`[Gemini Extraction] Successfully extracted using ${modelName}!`);
          return JSON.parse(jsonMatch[0].trim());
        } catch (err: any) {
          retries--;
          const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('resource_exhausted');
          if (isRateLimit && retries > 0) {
            let waitSeconds = 10;
            const match = err.message?.match(/retry in ([0-9.]+)s/i) || err.message?.match(/please retry in ([0-9.]+)s/i) || err.message?.match(/retryDelay\"?\s*:\s*\"?([0-9.]+)/i);
            if (match && match[1]) {
              waitSeconds = Math.ceil(parseFloat(match[1])) + 2;
            }
            console.warn(`[Gemini Extraction] Model ${modelName} rate limited. Waiting ${waitSeconds}s automatically...`);
            await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
          } else {
            console.warn(`[Gemini Extraction] Model ${modelName} failed: ${err.message || err}`);
            lastError = err;
            break;
          }
        }
      }
    }

    throw lastError || new Error('Gemini extraction failed across all models');
  }

  async confirmExtraction(reportId: string, userId: string, customExtractedData?: any) {
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

    let extractedData = report.extracted_data;
    if (customExtractedData) {
      extractedData = customExtractedData;
      await this.supabase
        .getClient()
        .from('pdf_reports')
        .update({
          extracted_data: customExtractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    }

    if (!extractedData) throw new BadRequestException('Tidak ada data yang diekstrak');

    // Save to financial_data
    const payload = {
      ...extractedData,
      company_id: report.company_id,
      source_pdf_id: reportId,
    };

    const totalEquity = this.parseBigInt(extractedData.totalEquity);
    const netProfit = this.parseBigInt(extractedData.netProfit);
    const sharesOutstanding = this.parseBigInt(extractedData.sharesOutstanding);
    const marketPrice = this.parseDecimal(extractedData.marketPrice);

    let eps = this.parseDecimal(extractedData.eps);
    if ((eps === null || eps === undefined) && netProfit && sharesOutstanding) {
      eps = parseFloat(((netProfit * 1000000) / sharesOutstanding).toFixed(4));
    }

    let bvps = this.parseDecimal(extractedData.bvps);
    if ((bvps === null || bvps === undefined) && totalEquity && sharesOutstanding) {
      bvps = parseFloat(((totalEquity * 1000000) / sharesOutstanding).toFixed(4));
    }

    let fairValue: number | null = null;
    if (eps && bvps && eps > 0 && bvps > 0) {
      fairValue = parseFloat(Math.sqrt(22.5 * eps * bvps).toFixed(2));
    }

    let marketCap: number | null = null;
    if (sharesOutstanding && marketPrice) {
      marketCap = Math.round((sharesOutstanding * marketPrice) / 1000000);
    }

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
      total_equity: totalEquity,
      working_capital: this.parseBigInt(extractedData.workingCapital),
      revenue: this.parseBigInt(extractedData.revenue),
      cost_of_goods_sold: this.parseBigInt(extractedData.costOfGoodsSold),
      gross_profit: this.parseBigInt(extractedData.grossProfit),
      operating_expenses: this.parseBigInt(extractedData.operatingExpenses),
      operating_profit: this.parseBigInt(extractedData.operatingProfit),
      ebitda: this.parseBigInt(extractedData.ebitda),
      net_profit: netProfit,
      operating_cash_flow: this.parseBigInt(extractedData.operatingCashFlow),
      investing_cash_flow: this.parseBigInt(extractedData.investingCashFlow),
      financing_cash_flow: this.parseBigInt(extractedData.financingCashFlow),
      shares_outstanding: sharesOutstanding,
      eps,
      bvps,
      market_price: marketPrice,
      fair_value: fairValue,
      market_cap: marketCap,
      dividend: this.parseDecimal(extractedData.dividend),
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
