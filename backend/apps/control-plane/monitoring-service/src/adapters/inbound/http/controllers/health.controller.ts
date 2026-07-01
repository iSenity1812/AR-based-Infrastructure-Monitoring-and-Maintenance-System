import { Controller, Get, Req } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';
import { responseMeta } from '../serializers/response-meta';

type HeaderRequest = { headers: Record<string, string | undefined> };

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      {
        service: 'monitoring-service',
        status: 'ok',
      },
      responseMeta(request),
    );
  }
}
