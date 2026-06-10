import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { serializeEnvelope } from '@presentation/http/serializers/api-envelope.serializer';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check asset service health.' })
  getHealth() {
    return serializeEnvelope({
      service: 'asset-service',
      status: 'ok',
    });
  }
}
