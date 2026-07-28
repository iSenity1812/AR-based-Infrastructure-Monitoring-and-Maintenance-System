import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';

import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env.example'),
    }),
  ],
  providers: [AssetServiceConfig],
  exports: [AssetServiceConfig],
})
export class AssetServiceConfigModule {}
