import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import {
  CREATE_AR_WORK_ORDER_USE_CASE,
  GET_AR_ASSET_OVERVIEW_USE_CASE,
  LIST_AR_WORK_ORDERS_USE_CASE,
} from '@infrastructure/di/use-case.tokens';
import { CurrentAuthContext } from '@presentation/http/decorators/current-auth-context.decorator';
import { RequirePermissions } from '@presentation/http/decorators/require-permissions.decorator';
import {
  type ArRequestHeaders,
  RequestHeaders,
} from '@presentation/http/decorators/request-headers.decorator';
import { CreateArWorkOrderRequestDto } from '@presentation/http/dto/create-ar-work-order.request.dto';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import type { ArAssetType } from '@use-cases/dto/ar-asset.dto';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { CreateArWorkOrderUseCase } from '@use-cases/queries/create-ar-work-order.use-case';
import { GetArAssetOverviewUseCase } from '@use-cases/queries/get-ar-asset-overview.use-case';
import { ListArWorkOrdersUseCase } from '@use-cases/queries/list-ar-work-orders.use-case';

@ApiTags('AR Assets')
@ApiBearerAuth()
@Controller('ar/assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArAssetsController {
  constructor(
    @Inject(GET_AR_ASSET_OVERVIEW_USE_CASE)
    private readonly getOverviewUseCase: GetArAssetOverviewUseCase,
    @Inject(LIST_AR_WORK_ORDERS_USE_CASE)
    private readonly listWorkOrdersUseCase: ListArWorkOrdersUseCase,
    @Inject(CREATE_AR_WORK_ORDER_USE_CASE)
    private readonly createWorkOrderUseCase: CreateArWorkOrderUseCase,
  ) {}

  @Get(':assetType/:assetId/overview')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Get AR asset identity and monitoring overview.' })
  @ApiParam({ name: 'assetType', enum: ['rack', 'node'] })
  async getOverview(
    @Param('assetType') assetType: ArAssetType,
    @Param('assetId') assetId: string,
    @CurrentAuthContext() _context: CurrentAuthContextDto,
    @RequestHeaders() headers: ArRequestHeaders,
  ) {
    return this.getOverviewUseCase.execute(assetType, assetId, headers);
  }

  @Get(':assetType/:assetId/work-orders')
  @RequirePermissions(PERMISSION_CODES.TICKETS_READ)
  @ApiOperation({ summary: 'List work orders linked to an AR asset.' })
  @ApiParam({ name: 'assetType', enum: ['rack', 'node'] })
  async listWorkOrders(
    @Param('assetType') assetType: ArAssetType,
    @Param('assetId') assetId: string,
    @CurrentAuthContext() _context: CurrentAuthContextDto,
    @RequestHeaders() headers: ArRequestHeaders,
  ) {
    return this.listWorkOrdersUseCase.execute(assetType, assetId, headers);
  }

  @Post(':assetType/:assetId/work-orders')
  @RequirePermissions(PERMISSION_CODES.TICKETS_CREATE)
  @ApiOperation({ summary: 'Create a work order linked to an AR asset.' })
  @ApiParam({ name: 'assetType', enum: ['rack', 'node'] })
  async createWorkOrder(
    @Param('assetType') assetType: ArAssetType,
    @Param('assetId') assetId: string,
    @Body() body: CreateArWorkOrderRequestDto,
    @CurrentAuthContext() _context: CurrentAuthContextDto,
    @RequestHeaders() headers: ArRequestHeaders,
  ) {
    return this.createWorkOrderUseCase.execute(
      assetType,
      assetId,
      body,
      headers,
    );
  }
}
