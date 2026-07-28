import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import {
  ActivateMarkerUseCase,
  CreateMarkerUseCase,
  DeactivateMarkerUseCase,
  RemapMarkerUseCase,
  UpdateMarkerUseCase,
} from '@use-cases/commands/marker.commands';
import {
  CreateMarkerRequestDto,
  RemapMarkerTargetRequestDto,
  UpdateMarkerRequestDto,
} from '@presentation/http/dto';
import { RequirePermissions } from '@presentation/http/decorators/require-permissions.decorator';
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

@ApiTags('Admin Markers')
@ApiBearerAuth()
@Controller('admin/markers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSION_CODES.MARKERS_MANAGE)
export class AdminMarkersController {
  constructor(
    private readonly createMarkerUseCase: CreateMarkerUseCase,
    private readonly updateMarkerUseCase: UpdateMarkerUseCase,
    private readonly activateMarkerUseCase: ActivateMarkerUseCase,
    private readonly deactivateMarkerUseCase: DeactivateMarkerUseCase,
    private readonly remapMarkerUseCase: RemapMarkerUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an inactive marker record.' })
  async createMarker(
    @Body() body: CreateMarkerRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.createMarkerUseCase.execute(body),
      responseMeta(request),
    );
  }

  @Patch(':markerId')
  @ApiOperation({ summary: 'Update editable marker fields.' })
  async updateMarker(
    @Param('markerId') markerId: string,
    @Body() body: UpdateMarkerRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.updateMarkerUseCase.execute(markerId, body),
      responseMeta(request),
    );
  }

  @Post(':markerId/activate')
  async activateMarker(
    @Param('markerId') markerId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.activateMarkerUseCase.execute(markerId),
      responseMeta(request),
    );
  }

  @Post(':markerId/deactivate')
  async deactivateMarker(
    @Param('markerId') markerId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.deactivateMarkerUseCase.execute(markerId),
      responseMeta(request),
    );
  }

  @Post(':markerId/remap')
  async remapMarker(
    @Param('markerId') markerId: string,
    @Body() body: RemapMarkerTargetRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.remapMarkerUseCase.execute(
        markerId,
        body.targetType,
        body.targetId,
      ),
      responseMeta(request),
    );
  }
}
