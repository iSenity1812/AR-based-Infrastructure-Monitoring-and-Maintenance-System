import { applyDecorators, SetMetadata } from '@nestjs/common';

import { Public } from './public.decorator';

export const INTERNAL_ALERT_SYNC_ROUTE_KEY = 'internal-alert-sync-route';

export const InternalAlertSyncRoute = () =>
  applyDecorators(
    Public(),
    SetMetadata(INTERNAL_ALERT_SYNC_ROUTE_KEY, true),
  );
