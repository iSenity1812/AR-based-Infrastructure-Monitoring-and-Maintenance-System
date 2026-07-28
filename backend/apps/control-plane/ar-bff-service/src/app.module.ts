import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import { ArBffServiceModule } from '@infrastructure/di/ar-bff-service.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    ArBffServiceModule,
  ],
  providers: [ArBffServiceConfig],
})
export class AppModule {}
