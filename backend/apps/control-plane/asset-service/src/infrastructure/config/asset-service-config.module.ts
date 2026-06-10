import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AssetServiceConfig],
  exports: [AssetServiceConfig],
})
export class AssetServiceConfigModule {}
