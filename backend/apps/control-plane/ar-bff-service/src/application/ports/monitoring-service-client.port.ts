import type { ResolveMarkerOptions } from './asset-service-client.port';
import type { ArResolvedAssetDto } from '@use-cases/dto/ar-asset.dto';

export abstract class MonitoringServiceClientPort {
  abstract readonly serviceName: 'monitoring-service';

  abstract getAssetOverview(
    asset: ArResolvedAssetDto,
    options?: ResolveMarkerOptions,
  ): Promise<unknown>;
}
