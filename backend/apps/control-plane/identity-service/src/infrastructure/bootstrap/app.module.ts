import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

import { IdentityServiceConfig } from "../config/identity-service-config";
import { ConfigService } from "@nestjs/config";
import { IdentityServiceModule } from "../di/identity-service.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.example"],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>("IDENTITY_MONGODB_URI") ??
          "mongodb://127.0.0.1:27017/identity_db",
      }),
    }),
    IdentityServiceModule,
  ],
  providers: [IdentityServiceConfig],
})
export class AppModule {}
