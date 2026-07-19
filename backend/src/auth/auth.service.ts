import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async register(dto: RegisterDto) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      user_metadata: { full_name: dto.fullName },
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw new BadRequestException(error.message);
    }

    // Sign in immediately after register to get session
    const { data: session, error: signInError } =
      await client.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (signInError) throw new BadRequestException(signInError.message);

    return {
      message: 'Registrasi berhasil',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
      },
      accessToken: session.session?.access_token,
      refreshToken: session.session?.refresh_token,
    };
  }

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return {
      message: 'Login berhasil',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async logout(accessToken: string) {
    const userClient = this.supabase.getUserClient(accessToken);
    await userClient.auth.signOut();
    return { message: 'Logout berhasil' };
  }

  async validateUser(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error || !data.user) return null;
    return data.user;
  }
}
