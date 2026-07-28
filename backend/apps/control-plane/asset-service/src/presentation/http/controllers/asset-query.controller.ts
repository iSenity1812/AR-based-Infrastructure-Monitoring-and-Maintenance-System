import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import { AssetType } from '@domain/constants/asset-type.enum';
import {
  GetAssetByIdUseCase,
  GetAssetByCodeUseCase,
  GetNodeContextUseCase,
  GetRackTopologyUseCase,
  GetTopologyTreeUseCase,
  ResolveMarkerUseCase,
  SearchAssetsUseCase,
} from '@use-cases/queries/topology.queries';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { CurrentAuthContext } from '@presentation/http/decorators/current-auth-context.decorator';
import { RequirePermissions } from '@presentation/http/decorators/require-permissions.decorator';
import { SearchAssetsQueryDto } from '@presentation/http/dto';
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

@ApiTags('Asset Queries')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetQueryController {
  constructor(
    private readonly getTopologyTreeUseCase: GetTopologyTreeUseCase,
    private readonly getRackTopologyUseCase: GetRackTopologyUseCase,
    private readonly getNodeContextUseCase: GetNodeContextUseCase,
    private readonly getAssetByCodeUseCase: GetAssetByCodeUseCase,
    private readonly getAssetByIdUseCase: GetAssetByIdUseCase,
    private readonly resolveMarkerUseCase: ResolveMarkerUseCase,
    private readonly searchAssetsUseCase: SearchAssetsUseCase,
  ) {}

  @Get('topology/tree')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Get the full rack and node topology tree.' })
  async getTopologyTree(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      await this.getTopologyTreeUseCase.execute(),
      responseMeta(request),
    );
  }

  @Get('racks/:rackId/topology')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Get rack-level topology details.' })
  async getRackTopology(
    @Param('rackId') rackId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.getRackTopologyUseCase.execute(rackId),
      responseMeta(request),
    );
  }

  @Get('nodes/:nodeId/context')
  @RequirePermissions(PERMISSION_CODES.ASSETS_HEALTH_READ)
  @ApiOperation({
    summary: 'Get node context without embedded workload truth.',
  })
  async getNodeContext(
    @Param('nodeId') nodeId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.getNodeContextUseCase.execute(nodeId),
      responseMeta(request),
    );
  }

  @Get('assets/by-code/:code')
  @RequirePermissions(PERMISSION_CODES.ASSETS_HEALTH_READ)
  @ApiOperation({ summary: 'Find an asset summary by code.' })
  async getAssetByCode(
    @Param('code') code: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.getAssetByCodeUseCase.execute(code),
      responseMeta(request),
    );
  }

  @Get('assets/:assetType/:assetId')
  @RequirePermissions(PERMISSION_CODES.ASSETS_HEALTH_READ)
  @ApiOperation({ summary: 'Find an asset summary by type and id.' })
  async getAssetById(
    @Param('assetType') assetType: AssetType,
    @Param('assetId') assetId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.getAssetByIdUseCase.execute(assetType, assetId),
      responseMeta(request),
    );
  }

  @Get('markers/resolve/:markerCode')
  @RequirePermissions(PERMISSION_CODES.AR_ASSETS_IDENTIFY)
  @ApiOperation({ summary: 'Resolve a marker to asset context only.' })
  async resolveMarker(
    @Param('markerCode') markerCode: string,
    @CurrentAuthContext() _context: CurrentAuthContextDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.resolveMarkerUseCase.execute(markerCode),
      responseMeta(request),
    );
  }

  @Get('assets/search')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Search racks, nodes, and markers.' })
  async searchAssets(
    @Query() query: SearchAssetsQueryDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.searchAssetsUseCase.execute(query.q, query.type),
      responseMeta(request),
    );
  }
}
