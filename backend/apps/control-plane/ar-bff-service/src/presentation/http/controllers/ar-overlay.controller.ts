import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import { GET_AR_OVERLAY_USE_CASE } from '@infrastructure/di/use-case.tokens';
import { CurrentAuthContext } from '@presentation/http/decorators/current-auth-context.decorator';
import { RequirePermissions } from '@presentation/http/decorators/require-permissions.decorator';
import {
  type ArRequestHeaders,
  RequestHeaders,
} from '@presentation/http/decorators/request-headers.decorator';
import { GetArOverlayRequestDto } from '@presentation/http/dto/get-ar-overlay.request.dto';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { GetArOverlayUseCase } from '@use-cases/queries/get-ar-overlay.use-case';

@ApiTags('AR Overlay')
@ApiBearerAuth()
@Controller('ar/overlay')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArOverlayController {
  constructor(
    @Inject(GET_AR_OVERLAY_USE_CASE)
    private readonly getOverlayUseCase: GetArOverlayUseCase,
  ) {}

  @Post()
  @RequirePermissions(
    PERMISSION_CODES.AR_ASSETS_IDENTIFY,
    PERMISSION_CODES.DASHBOARD_READ,
    PERMISSION_CODES.TICKETS_READ,
  )
  @ApiOperation({ summary: 'Compose the v1 AR scan-to-overlay payload.' })
  async getOverlay(
    @Body() body: GetArOverlayRequestDto,
    @CurrentAuthContext() _context: CurrentAuthContextDto,
    @RequestHeaders() headers: ArRequestHeaders,
  ) {
    return this.getOverlayUseCase.execute(body, headers);
  }
}
