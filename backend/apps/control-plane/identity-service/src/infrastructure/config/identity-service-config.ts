import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class IdentityServiceConfig {
  constructor(private readonly configService: ConfigService) {}

  get mongodbUri(): string {
    return (
      this.configService.get<string>("IDENTITY_MONGODB_URI") ??
      "mongodb://127.0.0.1:27017/identity_db"
    );
  }

  get port(): number {
    return Number(this.configService.get<string>("PORT") ?? "3001");
  }

  get accessTokenSecret(): string {
    return (
      this.configService.get<string>("JWT_ACCESS_SECRET") ??
      "change-me-access-secret"
    );
  }

  get refreshTokenTtl(): string {
    return this.configService.get<string>("JWT_REFRESH_TTL") ?? "7d";
  }

  get accessTokenTtl(): string {
    return this.configService.get<string>("JWT_ACCESS_TTL") ?? "15m";
  }

  get refreshTokenSecret(): string {
    return (
      this.configService.get<string>("JWT_REFRESH_SECRET") ??
      "change-me-refresh-secret"
    );
  }

  get adminUsername(): string {
    return this.configService.get<string>("ADMIN_USERNAME") ?? "admin";
  }

  get adminEmail(): string {
    return this.configService.get<string>("ADMIN_EMAIL") ?? "admin@example.com";
  }

  get adminPassword(): string {
    return this.configService.get<string>("ADMIN_PASSWORD") ?? "Admin@123456";
  }

  get operatorUsername(): string {
    return this.configService.get<string>("OPERATOR_USERNAME") ?? "operator01";
  }

  get operatorEmail(): string {
    return (
      this.configService.get<string>("OPERATOR_EMAIL") ??
      "operator01@example.com"
    );
  }

  get operatorPassword(): string {
    return (
      this.configService.get<string>("OPERATOR_PASSWORD") ?? "Operator@123456"
    );
  }

  get technicianUsername(): string {
    return (
      this.configService.get<string>("TECHNICIAN_USERNAME") ?? "technician01"
    );
  }

  get technicianEmail(): string {
    return (
      this.configService.get<string>("TECHNICIAN_EMAIL") ??
      "technician01@example.com"
    );
  }

  get technicianPassword(): string {
    return (
      this.configService.get<string>("TECHNICIAN_PASSWORD") ??
      "Technician@123456"
    );
  }
}
