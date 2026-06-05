import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IdentityServiceConfig {
  constructor(private readonly configService: ConfigService) {}

  get mongodbUri(): string {
    return (
      this.configService.get<string>('MONGODB_URI') ??
      'mongodb://127.0.0.1:27017/identity_db'
    );
  }

  get port(): number {
    return Number(this.configService.get<string>('PORT') ?? '3001');
  }

  get accessTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'change-me-access-secret'
    );
  }

  get refreshTokenTtl(): string {
    return this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d';
  }

  get accessTokenTtl(): string {
    return this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m';
  }

  get refreshTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'change-me-refresh-secret'
    );
  }

  get adminUsername(): string {
    return this.configService.get<string>('ADMIN_USERNAME') ?? 'admin';
  }

  get adminEmail(): string {
    return this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@example.com';
  }

  get adminPassword(): string {
    return this.configService.get<string>('ADMIN_PASSWORD') ?? 'Admin@123456';
  }
}
