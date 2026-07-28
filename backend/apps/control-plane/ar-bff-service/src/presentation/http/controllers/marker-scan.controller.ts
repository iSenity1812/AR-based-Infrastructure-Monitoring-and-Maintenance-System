import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import { SCAN_MARKER_USE_CASE } from '@infrastructure/di/use-case.tokens';
import { CurrentAuthContext } from '@presentation/http/decorators/current-auth-context.decorator';
import { RequirePermissions } from '@presentation/http/decorators/require-permissions.decorator';
import {
  type ArRequestHeaders,
  RequestHeaders,
} from '@presentation/http/decorators/request-headers.decorator';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import { ScanMarkerRequestDto } from '@presentation/http/dto/scan-marker.request.dto';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { ScanMarkerUseCase } from '@use-cases/queries/scan-marker.use-case';

@ApiTags('AR Marker Scan')
@ApiBearerAuth()
@Controller('ar/markers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MarkerScanController {
  constructor(
    @Inject(SCAN_MARKER_USE_CASE)
    private readonly scanMarkerUseCase: ScanMarkerUseCase,
  ) {}

  @Post('scan')
  @RequirePermissions(PERMISSION_CODES.AR_ASSETS_IDENTIFY)
  @ApiOperation({ summary: 'Resolve an AR marker to asset identity.' })
  async scanMarker(
    @Body() body: ScanMarkerRequestDto,
    @CurrentAuthContext() _context: CurrentAuthContextDto,
    @RequestHeaders() headers: ArRequestHeaders,
  ) {
    return this.scanMarkerUseCase.execute(body.markerCode, headers);
  }
}
