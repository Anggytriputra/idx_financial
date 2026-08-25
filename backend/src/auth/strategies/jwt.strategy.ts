import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private jwkCache: Map<string, crypto.KeyObject> = new Map();
  private jwksUrl: string;

  constructor(private config: ConfigServices) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKeyProvider: (request: any, rawJwtToken: string, done: any) => {
        this.getPublicKey(rawJwtToken)
          .then((key) => done(null, key))
          .catch((err) => done(err));
      },
    });

    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    this.jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  }

  private async getPublicKey(token: string): Promise<crypto.KeyObject | Buffer | string> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const kid = header.kid;

    // Fallback to symmetric HS256 key if no kid or HS256 is explicitly used
    if (header.alg === 'HS256' || !kid) {
      const secret = this.config.getOrThrow<string>('SUPABASE_JWT_SECRET');
      try {
        return Buffer.from(secret, 'base64');
      } catch {
        return secret;
      }
    }

    // Check cache for ES256 public key
    if (this.jwkCache.has(kid)) {
      return this.jwkCache.get(kid)!;
    }

    // Fetch JWKS from Supabase
    const jwks = await this.fetchJwks();
    const jwk = jwks.keys.find((k: any) => k.kid === kid);
    if (!jwk) {
      throw new Error(`JWK for kid ${kid} not found`);
    }

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    this.jwkCache.set(kid, publicKey);
    return publicKey;
  }

  private fetchJwks(): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(this.jwksUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  async validate(req: any, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      accessToken: token,
    };
  }
}


