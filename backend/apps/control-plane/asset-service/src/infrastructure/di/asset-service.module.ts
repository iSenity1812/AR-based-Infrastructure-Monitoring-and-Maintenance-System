import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { CacheManagerAssetQueryCacheAdapter } from '@adapters/cache/cache-manager-asset-query-cache.adapter';
import { KafkaNodeMappingPublisher } from '@adapters/messaging/kafka-node-mapping.publisher';
import { RedisDiscoveredNodeRepository } from '@adapters/integration/redis/redis-discovered-node.repository';
import {
  MarkerDocumentModel,
  MarkerSchema,
  NodeDocumentModel,
  NodeRuntimeSnapshotDocumentModel,
  NodeRuntimeSnapshotSchema,
  NodeSchema,
  RackDocumentModel,
  RackSchema,
} from '@adapters/persistence/mongoose/asset-context.models';
import {
  MongooseMarkerRepository,
  MongooseNodeRepository,
  MongooseNodeRuntimeSnapshotRepository,
  MongooseRackRepository,
} from '@adapters/persistence/mongoose';
import {
  ASSET_QUERY_CACHE,
  DISCOVERED_NODE_REPOSITORY,
  MARKER_REPOSITORY,
  NODE_REPOSITORY,
  NODE_RUNTIME_SNAPSHOT_REPOSITORY,
  NODE_MAPPING_EVENT_PUBLISHER,
  RACK_REPOSITORY,
} from '@domain/ports/port.tokens';
import {
  ActivateMarkerUseCase,
  CreateMarkerUseCase,
  GenerateMarkerUseCase,
  MountMarkerUseCase,
  PrintMarkerUseCase,
  RemapMarkerUseCase,
  RetireMarkerUseCase,
  UpdateMarkerUseCase,
  ValidateMarkerUseCase,
} from '@use-cases/commands/marker.commands';
import { SeedAssetContextUseCase } from '@use-cases/commands/seed-asset-context.use-case';
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
import {
  GetAssetByCodeUseCase,
  GetNodeContextUseCase,
  GetRackTopologyUseCase,
  GetRackSummaryByCodeUseCase,
  GetRackSummaryUseCase,
  GetTopologyTreeUseCase,
  BatchGetRackSummariesUseCase,
  ListRackSummariesUseCase,
  ResolveMarkerUseCase,
  SearchAssetsUseCase,
} from '@use-cases/queries/topology.queries';
import { ListDiscoveredNodesUseCase } from '@use-cases/queries/discovered-node.queries';
import { ListUnassignedNodesUseCase } from '@use-cases/queries/unassigned-node.queries';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';
import { AdminMarkersController } from '@presentation/http/controllers/admin-markers.controller';
import { AdminTopologyController } from '@presentation/http/controllers/admin-topology.controller';
import { AssetQueryController } from '@presentation/http/controllers/asset-query.controller';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { InternalInventoryController } from '@presentation/http/controllers/internal-inventory.controller';
import { RackQueryGrpcController } from '@presentation/grpc/controllers/rack-query.grpc.controller';
import { ProblemDetailsExceptionFilter } from '@presentation/http/filters/problem-details-exception.filter';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import { JwtStrategy } from '@presentation/http/strategies/jwt.strategy';
import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';
import { LoggingInterceptor } from '@presentation/interceptors/logging.interceptor';

@Module({
  imports: [
    PassportModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: RackDocumentModel.name, schema: RackSchema },
      { name: NodeDocumentModel.name, schema: NodeSchema },
      { name: MarkerDocumentModel.name, schema: MarkerSchema },
      {
        name: NodeRuntimeSnapshotDocumentModel.name,
        schema: NodeRuntimeSnapshotSchema,
      },
    ]),
  ],
  controllers: [
    AdminTopologyController,
    AdminMarkersController,
    InternalInventoryController,
    AssetQueryController,
    HealthController,
    RackQueryGrpcController,
  ],
  providers: [
    AssetServiceConfig,
    LoggingInterceptor,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsExceptionFilter,
    },
    AssetContextReadService,
    MongooseRackRepository,
    MongooseNodeRepository,
    MongooseMarkerRepository,
    MongooseNodeRuntimeSnapshotRepository,
    CacheManagerAssetQueryCacheAdapter,
    KafkaNodeMappingPublisher,
    RedisDiscoveredNodeRepository,
    {
      provide: RACK_REPOSITORY,
      useExisting: MongooseRackRepository,
    },
    {
      provide: NODE_REPOSITORY,
      useExisting: MongooseNodeRepository,
    },
    {
      provide: MARKER_REPOSITORY,
      useExisting: MongooseMarkerRepository,
    },
    {
      provide: NODE_RUNTIME_SNAPSHOT_REPOSITORY,
      useExisting: MongooseNodeRuntimeSnapshotRepository,
    },
    {
      provide: DISCOVERED_NODE_REPOSITORY,
      useExisting: RedisDiscoveredNodeRepository,
    },
    {
      provide: ASSET_QUERY_CACHE,
      useExisting: CacheManagerAssetQueryCacheAdapter,
    },
    {
      provide: NODE_MAPPING_EVENT_PUBLISHER,
      useExisting: KafkaNodeMappingPublisher,
    },
    CreateRackUseCase,
    UpdateRackUseCase,
    ConfirmRackReadyUseCase,
    ActivateRackUseCase,
    DrainRackUseCase,
    RetireRackUseCase,
    NormalizeNodeUseCase,
    UpdateNodeUseCase,
    AssignNodeToRackUseCase,
    AssignDiscoveredNodeToRackUseCase,
    ActivateNodeUseCase,
    DrainNodeUseCase,
    RetireNodeUseCase,
    CreateMarkerUseCase,
    UpdateMarkerUseCase,
    GenerateMarkerUseCase,
    PrintMarkerUseCase,
    MountMarkerUseCase,
    ValidateMarkerUseCase,
    ActivateMarkerUseCase,
    RemapMarkerUseCase,
    RetireMarkerUseCase,
    SeedAssetContextUseCase,
    GetTopologyTreeUseCase,
    GetRackTopologyUseCase,
    GetRackSummaryUseCase,
    GetRackSummaryByCodeUseCase,
    ListRackSummariesUseCase,
    BatchGetRackSummariesUseCase,
    GetNodeContextUseCase,
    ListDiscoveredNodesUseCase,
    ListUnassignedNodesUseCase,
    GetAssetByCodeUseCase,
    ResolveMarkerUseCase,
    SearchAssetsUseCase,
  ],
})
export class AssetServiceModule {}
