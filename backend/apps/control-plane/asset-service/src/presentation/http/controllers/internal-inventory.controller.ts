import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import { serializeEnvelope } from '@presentation/http/serializers/api-envelope.serializer';

type HeaderRequest = { headers: Record<string, string | undefined> };

function responseMeta(request: HeaderRequest) {
  return {
    requestId: request.headers['x-request-id'],
    correlationId:
      request.headers['x-correlation-id'] ?? request.headers['x-request-id'],
  };
}

@ApiTags('Internal Inventory')
@ApiBearerAuth()
@Controller('internal/inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InternalInventoryController {
  @Post('sync')
  @ApiOperation({
    summary:
      'Deprecated compatibility endpoint. Asset inventory sync is no longer owned here.',
  })
  sync(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      {
        deprecated: true,
        message:
          'Inventory sync no longer mutates asset truth in asset-service. Use monitoring or workload ownership flows instead.',
      },
      responseMeta(request),
    );
  }
}
