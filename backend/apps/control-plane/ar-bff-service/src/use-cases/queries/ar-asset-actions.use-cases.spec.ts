import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import type { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import type { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import { CreateArWorkOrderUseCase } from './create-ar-work-order.use-case';
import { GetArAssetOverviewUseCase } from './get-ar-asset-overview.use-case';
import { ListArWorkOrdersUseCase } from './list-ar-work-orders.use-case';

describe('AR asset overview and work-order use cases', () => {
  const rackAsset = {
    assetId: 'rack-1',
    assetType: 'rack' as const,
    assetCode: 'RACK-A1',
    displayName: 'Rack A1',
  };
  const nodeAsset = {
    assetId: 'node-1',
    assetType: 'node' as const,
    assetCode: 'NODE-A1-01',
    displayName: 'Node A1-01',
    parentRack: {
      rackId: 'rack-1',
      rackCode: 'RACK-A1',
      displayName: 'Rack A1',
    },
  };
  const assetClient = {
    serviceName: 'asset-service',
    resolveMarker: jest.fn(),
    resolveAssetById: jest.fn(),
    resolveAssetByCode: jest.fn(),
  } satisfies jest.Mocked<AssetServiceClientPort>;
  const monitoringClient = {
    serviceName: 'monitoring-service',
    getAssetOverview: jest.fn(),
  } satisfies jest.Mocked<MonitoringServiceClientPort>;
  const incidentClient = {
    serviceName: 'incident-workflow-service',
    listWorkOrders: jest.fn(),
    createWorkOrder: jest.fn(),
  } satisfies jest.Mocked<IncidentWorkflowServiceClientPort>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes rack asset overview with Monitoring Service data', async () => {
    assetClient.resolveAssetById.mockResolvedValue(rackAsset);
    monitoringClient.getAssetOverview.mockResolvedValue({
      state: 'healthy',
      activeAlertCount: 0,
    });

    const useCase = new GetArAssetOverviewUseCase(
      assetClient,
      monitoringClient,
    );

    await expect(useCase.execute('rack', 'rack-1')).resolves.toEqual({
      asset: rackAsset,
      monitoring: {
        availability: { status: 'available' },
        summary: { state: 'healthy', activeAlertCount: 0 },
      },
    });
    expect(monitoringClient.getAssetOverview).toHaveBeenCalledWith(
      rackAsset,
      {},
    );
    expect(assetClient.resolveAssetById).toHaveBeenCalledWith(
      'rack',
      'rack-1',
      {},
    );
  });

  it('returns node identity when Monitoring Service is unavailable', async () => {
    assetClient.resolveAssetById.mockResolvedValue(nodeAsset);
    monitoringClient.getAssetOverview.mockRejectedValue(
      new DownstreamServiceError(
        'monitoring-service',
        'UNAVAILABLE',
        'Monitoring Service is unavailable.',
      ),
    );

    const useCase = new GetArAssetOverviewUseCase(
      assetClient,
      monitoringClient,
    );

    await expect(useCase.execute('node', 'node-1')).resolves.toEqual({
      asset: nodeAsset,
      monitoring: {
        availability: {
          status: 'unavailable',
          reason: 'Monitoring Service is unavailable.',
        },
      },
    });
  });

  it('does not call Monitoring Service when asset verification fails', async () => {
    assetClient.resolveAssetById.mockRejectedValue(
      new DownstreamServiceError(
        'asset-service',
        'NOT_FOUND',
        'Missing asset.',
      ),
    );

    const useCase = new GetArAssetOverviewUseCase(
      assetClient,
      monitoringClient,
    );

    await expect(useCase.execute('rack', 'UNKNOWN')).rejects.toThrow(
      NotFoundException,
    );
    expect(monitoringClient.getAssetOverview).not.toHaveBeenCalled();
  });

  it('lists work orders linked to a node assetRef', async () => {
    assetClient.resolveAssetById.mockResolvedValue(nodeAsset);
    incidentClient.listWorkOrders.mockResolvedValue([
      {
        ticketId: 'ticket-1',
        ticketCode: 'WO-1',
        title: 'Replace fan',
        priority: 'HIGH',
        status: 'OPEN',
        assignee: { userId: 'tech-1' },
        assetRef: {
          type: 'node',
          assetId: 'node-1',
          code: 'NODE-A1-01',
          displayName: 'Node A1-01',
          rackId: 'rack-1',
          rackCode: 'RACK-A1',
        },
      },
    ]);

    const useCase = new ListArWorkOrdersUseCase(assetClient, incidentClient);

    await expect(useCase.execute('node', 'node-1')).resolves.toMatchObject({
      asset: nodeAsset,
      availability: { status: 'available' },
      workOrders: [{ ticketCode: 'WO-1' }],
    });
    expect(incidentClient.listWorkOrders).toHaveBeenCalledWith(
      {
        type: 'node',
        assetId: 'node-1',
        code: 'NODE-A1-01',
        displayName: 'Node A1-01',
        rackId: 'rack-1',
        rackCode: 'RACK-A1',
      },
      {},
    );
  });

  it('returns an empty work-order list when no tickets are linked', async () => {
    assetClient.resolveAssetById.mockResolvedValue(rackAsset);
    incidentClient.listWorkOrders.mockResolvedValue([]);

    const useCase = new ListArWorkOrdersUseCase(assetClient, incidentClient);

    await expect(useCase.execute('rack', 'rack-1')).resolves.toEqual({
      asset: rackAsset,
      availability: { status: 'available' },
      workOrders: [],
    });
  });

  it('does not call Incident Workflow when asset verification fails', async () => {
    assetClient.resolveAssetById.mockRejectedValue(
      new DownstreamServiceError(
        'asset-service',
        'NOT_FOUND',
        'Missing asset.',
      ),
    );

    const useCase = new CreateArWorkOrderUseCase(assetClient, incidentClient);

    await expect(
      useCase.execute('rack', 'missing-rack', {
        ticketCode: 'WO-1',
        title: 'Inspect rack',
        priority: 'HIGH',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(incidentClient.createWorkOrder).not.toHaveBeenCalled();
  });

  it('creates a work order with the resolved rack assetRef', async () => {
    assetClient.resolveAssetById.mockResolvedValue(rackAsset);
    incidentClient.createWorkOrder.mockResolvedValue({
      ticketId: 'ticket-1',
      ticketCode: 'WO-1',
      title: 'Inspect rack',
      priority: 'HIGH',
      status: 'OPEN',
      assetRef: {
        type: 'rack',
        assetId: 'rack-1',
        code: 'RACK-A1',
        displayName: 'Rack A1',
      },
    });

    const useCase = new CreateArWorkOrderUseCase(assetClient, incidentClient);

    await expect(
      useCase.execute('rack', 'rack-1', {
        ticketCode: 'WO-1',
        title: 'Inspect rack',
        priority: 'HIGH',
      }),
    ).resolves.toMatchObject({
      asset: rackAsset,
      workOrder: { ticketCode: 'WO-1' },
    });
    expect(incidentClient.createWorkOrder).toHaveBeenCalledWith(
      {
        ticketCode: 'WO-1',
        title: 'Inspect rack',
        priority: 'HIGH',
        assetRef: {
          type: 'rack',
          assetId: 'rack-1',
          code: 'RACK-A1',
          displayName: 'Rack A1',
          rackId: undefined,
          rackCode: undefined,
        },
      },
      {},
    );
  });

  it('creates a work order with node rack context when available', async () => {
    assetClient.resolveAssetById.mockResolvedValue(nodeAsset);
    incidentClient.createWorkOrder.mockResolvedValue({
      ticketId: 'ticket-2',
      ticketCode: 'WO-2',
      title: 'Replace node fan',
      priority: 'HIGH',
      status: 'OPEN',
      assetRef: {
        type: 'node',
        assetId: 'node-1',
        code: 'NODE-A1-01',
        displayName: 'Node A1-01',
        rackId: 'rack-1',
        rackCode: 'RACK-A1',
      },
    });

    const useCase = new CreateArWorkOrderUseCase(assetClient, incidentClient);

    await expect(
      useCase.execute('node', 'node-1', {
        ticketCode: 'WO-2',
        title: 'Replace node fan',
        priority: 'HIGH',
      }),
    ).resolves.toMatchObject({
      asset: nodeAsset,
      workOrder: { ticketCode: 'WO-2' },
    });
    expect(incidentClient.createWorkOrder).toHaveBeenCalledWith(
      {
        ticketCode: 'WO-2',
        title: 'Replace node fan',
        priority: 'HIGH',
        assetRef: {
          type: 'node',
          assetId: 'node-1',
          code: 'NODE-A1-01',
          displayName: 'Node A1-01',
          rackId: 'rack-1',
          rackCode: 'RACK-A1',
        },
      },
      {},
    );
  });

  it('maps forbidden work-order creation from Incident Workflow Service', async () => {
    assetClient.resolveAssetById.mockResolvedValue(rackAsset);
    incidentClient.createWorkOrder.mockRejectedValue(
      new DownstreamServiceError(
        'incident-workflow-service',
        'FORBIDDEN',
        'Forbidden.',
      ),
    );

    const useCase = new CreateArWorkOrderUseCase(assetClient, incidentClient);

    await expect(
      useCase.execute('rack', 'rack-1', {
        ticketCode: 'WO-3',
        title: 'Inspect rack',
        priority: 'HIGH',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('maps conflicting work-order creation from Incident Workflow Service', async () => {
    assetClient.resolveAssetById.mockResolvedValue(rackAsset);
    incidentClient.createWorkOrder.mockRejectedValue(
      new DownstreamServiceError(
        'incident-workflow-service',
        'CONFLICT',
        'Ticket already exists.',
      ),
    );

    const useCase = new CreateArWorkOrderUseCase(assetClient, incidentClient);

    await expect(
      useCase.execute('rack', 'rack-1', {
        ticketCode: 'WO-1',
        title: 'Inspect rack',
        priority: 'HIGH',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps Incident Workflow unavailable behavior for listing', async () => {
    assetClient.resolveAssetById.mockResolvedValue(rackAsset);
    incidentClient.listWorkOrders.mockRejectedValue(
      new DownstreamServiceError(
        'incident-workflow-service',
        'UNAVAILABLE',
        'Incident Workflow Service is unavailable.',
      ),
    );

    const useCase = new ListArWorkOrdersUseCase(assetClient, incidentClient);

    await expect(useCase.execute('rack', 'rack-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
