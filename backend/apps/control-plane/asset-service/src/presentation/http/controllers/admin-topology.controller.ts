import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import {
  ActivateNodeUseCase,
  ActivateRackUseCase,
  AssignDiscoveredNodeToRackUseCase,
  AssignNodeToRackUseCase,
  ConfirmRackReadyUseCase,
  CreateRackUseCase,
  DrainNodeUseCase,
  DrainRackUseCase,
  NormalizeNodeUseCase,
  RetireNodeUseCase,
  RetireRackUseCase,
  UpdateNodeUseCase,
  UpdateRackUseCase,
} from '@use-cases/commands/topology';
import { ListDiscoveredNodesUseCase } from '@use-cases/queries/discovered-node.queries';
import { ListPendingAssignmentNodesUseCase } from '@use-cases/queries/pending-assignment-node.queries';
import { ListUnassignedNodesUseCase } from '@use-cases/queries/unassigned-node.queries';
import {
  AssignNodeToRackRequestDto,
  CreateRackRequestDto,
  NormalizeNodeRequestDto,
  UnassignedNodesRequestDto,
  UpdateNodeRequestDto,
  UpdateRackRequestDto,
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

@ApiTags('Admin Topology')
@ApiBearerAuth()
@Controller('admin/topology')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTopologyController {
  private readonly logger = new Logger(AdminTopologyController.name);

  constructor(
    private readonly createRackUseCase: CreateRackUseCase,
    private readonly updateRackUseCase: UpdateRackUseCase,
    private readonly confirmRackReadyUseCase: ConfirmRackReadyUseCase,
    private readonly activateRackUseCase: ActivateRackUseCase,
    private readonly drainRackUseCase: DrainRackUseCase,
    private readonly retireRackUseCase: RetireRackUseCase,
    private readonly normalizeNodeUseCase: NormalizeNodeUseCase,
    private readonly updateNodeUseCase: UpdateNodeUseCase,
    private readonly assignNodeToRackUseCase: AssignNodeToRackUseCase,
    private readonly assignDiscoveredNodeToRackUseCase: AssignDiscoveredNodeToRackUseCase,
    private readonly activateNodeUseCase: ActivateNodeUseCase,
    private readonly drainNodeUseCase: DrainNodeUseCase,
    private readonly retireNodeUseCase: RetireNodeUseCase,
    private readonly listDiscoveredNodesUseCase: ListDiscoveredNodesUseCase,
    private readonly listPendingAssignmentNodesUseCase: ListPendingAssignmentNodesUseCase,
    private readonly listUnassignedNodesUseCase: ListUnassignedNodesUseCase,
  ) {}

  @Post('racks')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE)
  @ApiOperation({ summary: 'Create a new rack in CREATED state.' })
  async createRack(
    @Body() body: CreateRackRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.createRackUseCase.execute(body),
      responseMeta(request),
    );
  }

  @Patch('racks/:rackId')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE)
  @ApiOperation({ summary: 'Update rack business fields.' })
  async updateRack(
    @Param('rackId') rackId: string,
    @Body() body: UpdateRackRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.updateRackUseCase.execute(rackId, body),
      responseMeta(request),
    );
  }

  @Post('racks/:rackId/confirm-ready')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE)
  @ApiOperation({ summary: 'Confirm rack preparation and move to READY.' })
  async confirmRackReady(
    @Param('rackId') rackId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.confirmRackReadyUseCase.execute(rackId),
      responseMeta(request),
    );
  }

  @Post('racks/:rackId/activate')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE)
  @ApiOperation({
    summary: 'Activate a rack for node placement and operations.',
  })
  async activateRack(
    @Param('rackId') rackId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.activateRackUseCase.execute(rackId),
      responseMeta(request),
    );
  }

  @Post('racks/:rackId/drain')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE)
  @ApiOperation({ summary: 'Move a rack into DRAINING state.' })
  async drainRack(
    @Param('rackId') rackId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.drainRackUseCase.execute(rackId),
      responseMeta(request),
    );
  }

  @Post('racks/:rackId/retire')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_STRUCTURE_MANAGE)
  @ApiOperation({ summary: 'Retire a rack after it has been emptied.' })
  async retireRack(
    @Param('rackId') rackId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.retireRackUseCase.execute(rackId),
      responseMeta(request),
    );
  }

  @Post('nodes/normalize')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({
    summary: 'Normalize discovered node data into an asset record.',
  })
  async normalizeNode(
    @Body() body: NormalizeNodeRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.normalizeNodeUseCase.execute(body),
      responseMeta(request),
    );
  }

  @Get('nodes/unassigned')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({
    summary: 'List canonical nodes that have not been assigned to a rack.',
  })
  async listUnassignedNodes(
    @Query() query: UnassignedNodesRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return this.serializeUnassignedNodes(query, request);
  }

  @Get('discovered-nodes')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({
    summary: 'List discovered nodes stored in shared Redis state.',
  })
  async listDiscoveredNodes(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      await this.listDiscoveredNodesUseCase.execute(),
      responseMeta(request),
    );
  }

  @Get('nodes/pending-assignment')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({
    summary:
      'List nodes pending assignment by merging canonical Mongo and discovered Redis state.',
  })
  async listPendingAssignmentNodes(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      await this.listPendingAssignmentNodesUseCase.execute(),
      responseMeta(request),
    );
  }

  @Patch('nodes/:nodeId')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({ summary: 'Update node business fields.' })
  async updateNode(
    @Param('nodeId') nodeId: string,
    @Body() body: UpdateNodeRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.updateNodeUseCase.execute(nodeId, body),
      responseMeta(request),
    );
  }

  @Post('nodes/:nodeId/assign-rack')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({ summary: 'Assign or move a node into a rack.' })
  async assignNodeToRack(
    @Param('nodeId') nodeId: string,
    @Body() body: AssignNodeToRackRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.assignNodeToRackUseCase.execute(
        nodeId,
        body.rackId,
        body.positionCode,
        body.allowDraining,
      ),
      responseMeta(request),
    );
  }

  @Post('discovered-nodes/:agentId/assign-rack')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({
    summary:
      'Normalize a discovered Redis-backed node, assign it to a rack, and activate it.',
  })
  async assignDiscoveredNodeToRack(
    @Param('agentId') agentId: string,
    @Body() body: AssignNodeToRackRequestDto,
    @Req() request: HeaderRequest,
  ) {
    this.logger.log(
      `assignDiscoveredNodeToRack(agentId=${agentId}, rackId=${body.rackId}, positionCode=${body.positionCode}, allowDraining=${body.allowDraining})`,
    );
    return serializeEnvelope(
      await this.assignDiscoveredNodeToRackUseCase.execute(
        agentId,
        body.rackId,
        body.positionCode,
        body.allowDraining,
      ),
      responseMeta(request),
    );
  }

  private async serializeUnassignedNodes(
    query: UnassignedNodesRequestDto,
    request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.listUnassignedNodesUseCase.execute(query),
      responseMeta(request),
    );
  }

  @Post('nodes/:nodeId/activate')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({ summary: 'Activate a placed node.' })
  async activateNode(
    @Param('nodeId') nodeId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.activateNodeUseCase.execute(nodeId),
      responseMeta(request),
    );
  }

  @Post('nodes/:nodeId/drain')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({ summary: 'Move a node into DRAINING state.' })
  async drainNode(
    @Param('nodeId') nodeId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.drainNodeUseCase.execute(nodeId),
      responseMeta(request),
    );
  }

  @Post('nodes/:nodeId/retire')
  @RequirePermissions(PERMISSION_CODES.TOPOLOGY_NODES_MANAGE)
  @ApiOperation({ summary: 'Retire a node and release rack assignment.' })
  async retireNode(
    @Param('nodeId') nodeId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.retireNodeUseCase.execute(nodeId),
      responseMeta(request),
    );
  }
}
