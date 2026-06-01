import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { envValidation } from './config/env';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { CapabilitiesModule } from './modules/capabilities/capabilities.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    SessionsModule,
    CapabilitiesModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
