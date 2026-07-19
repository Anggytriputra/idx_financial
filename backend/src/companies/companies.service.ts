import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .order('ticker');

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('companies')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Perusahaan tidak ditemukan');
    return data;
  }

  async create(userId: string, dto: CreateCompanyDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('companies')
      .insert({
        user_id: userId,
        ticker: dto.ticker.toUpperCase(),
        name: dto.name,
        sector: dto.sector,
        description: dto.description,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(`Saham ${dto.ticker} sudah ditambahkan`);
      }
      throw new Error(error.message);
    }
    return data;
  }

  async update(id: string, userId: string, dto: Partial<CreateCompanyDto>) {
    await this.findOne(id, userId);

    const { data, error } = await this.supabase
      .getClient()
      .from('companies')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    const { error } = await this.supabase
      .getClient()
      .from('companies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { message: 'Perusahaan berhasil dihapus' };
  }

  async getFinancialSummary(id: string, userId: string) {
    await this.findOne(id, userId);

    const { data, error } = await this.supabase
      .getClient()
      .from('financial_data')
      .select('*')
      .eq('company_id', id)
      .order('year', { ascending: true })
      .order('quarter', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }
}
