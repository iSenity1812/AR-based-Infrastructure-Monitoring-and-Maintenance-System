import { Module } from '@nestjs/common';

import { AlertDeliveryPort } from '../../application/ports/alert-delivery.port';
import { MonitoringServiceConfigModule } from '../config/monitoring-service-config.module';
import { AlertmanagerHttpAdapter } from './alertmanager-http.adapter';

@Module({
  imports: [MonitoringServiceConfigModule],
  providers: [
    AlertmanagerHttpAdapter,
    {
      provide: AlertDeliveryPort,
      useExisting: AlertmanagerHttpAdapter,
    },
  ],
  exports: [AlertDeliveryPort],
})
export class AlertmanagerModule {}
