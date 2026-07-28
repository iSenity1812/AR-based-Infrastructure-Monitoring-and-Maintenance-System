import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { AssetServiceClientError } from '@application/errors/asset-service-client.error';
import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import type { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import type { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import { GetArOverlayUseCase } from './get-ar-overlay.use-case';

describe('GetArOverlayUseCase', () => {
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

  it('composes a full rack overlay from marker scan', async () => {
    assetClient.resolveMarker.mockResolvedValue({
      marker: { markerCode: 'MK-RACK-A1', isActive: true },
      target: {
        id: 'rack-1',
        type: 'RACK',
        code: 'RACK-A1',
        name: 'Rack A1',
      },
      rack: { id: 'rack-1', rackCode: 'RACK-A1', displayName: 'Rack A1' },
    });
    monitoringClient.getAssetOverview.mockResolvedValue({ state: 'healthy' });
    incidentClient.listWorkOrders.mockResolvedValue([
      {
        ticketId: 'ticket-1',
        ticketCode: 'WO-1',
        title: 'Inspect rack',
        priority: 'HIGH',
        status: 'OPEN',
      },
    ]);

    const useCase = new GetArOverlayUseCase(
      assetClient,
      monitoringClient,
      incidentClient,
    );

    await expect(
      useCase.execute({ markerCode: 'MK-RACK-A1' }),
    ).resolves.toEqual({
      source: { markerCode: 'MK-RACK-A1', assetCode: 'RACK-A1' },
      asset: rackAsset,
      monitoring: {
        availability: { status: 'available' },
        summary: { state: 'healthy' },
      },
      workOrders: {
        availability: { status: 'available' },
        items: [
          {
            ticketId: 'ticket-1',
            ticketCode: 'WO-1',
            title: 'Inspect rack',
            priority: 'HIGH',
            status: 'OPEN',
          },
        ],
      },
    });
  });

  it('composes a full node overlay from an already resolved asset reference', async () => {
    assetClient.resolveAssetByCode.mockResolvedValue(nodeAsset);
    monitoringClient.getAssetOverview.mockResolvedValue({ state: 'alerting' });
    incidentClient.listWorkOrders.mockResolvedValue([]);

    const useCase = new GetArOverlayUseCase(
      assetClient,
      monitoringClient,
      incidentClient,
    );

    await expect(
      useCase.execute({
        asset: { assetType: 'node', assetCode: 'NODE-A1-01' },
      }),
    ).resolves.toMatchObject({
      source: { assetCode: 'NODE-A1-01' },
      asset: nodeAsset,
      monitoring: { availability: { status: 'available' } },
      workOrders: { availability: { status: 'available' }, items: [] },
    });
    expect(assetClient.resolveMarker).not.toHaveBeenCalled();
  });

  it('returns partial metadata when monitoring is unavailable', async () => {
    assetClient.resolveAssetByCode.mockResolvedValue(rackAsset);
    monitoringClient.getAssetOverview.mockRejectedValue(
      new DownstreamServiceError(
        'monitoring-service',
        'UNAVAILABLE',
        'Monitoring unavailable.',
      ),
    );
    incidentClient.listWorkOrders.mockResolvedValue([]);

    const useCase = new GetArOverlayUseCase(
      assetClient,
      monitoringClient,
      incidentClient,
    );

    await expect(
      useCase.execute({ asset: { assetType: 'rack', assetCode: 'RACK-A1' } }),
    ).resolves.toMatchObject({
      asset: rackAsset,
      monitoring: {
        availability: {
          status: 'unavailable',
          reason: 'Monitoring unavailable.',
        },
      },
      workOrders: { availability: { status: 'available' }, items: [] },
    });
  });

  it('returns partial metadata when work orders are unavailable', async () => {
    assetClient.resolveAssetByCode.mockResolvedValue(rackAsset);
    monitoringClient.getAssetOverview.mockResolvedValue({ state: 'healthy' });
    incidentClient.listWorkOrders.mockRejectedValue(
      new DownstreamServiceError(
        'incident-workflow-service',
        'UNAVAILABLE',
        'Tickets unavailable.',
      ),
    );

    const useCase = new GetArOverlayUseCase(
      assetClient,
      monitoringClient,
      incidentClient,
    );

    await expect(
      useCase.execute({ asset: { assetType: 'rack', assetCode: 'RACK-A1' } }),
    ).resolves.toMatchObject({
      asset: rackAsset,
      monitoring: { availability: { status: 'available' } },
      workOrders: {
        availability: {
          status: 'unavailable',
          reason: 'Tickets unavailable.',
        },
        items: [],
      },
    });
  });

  it('treats marker failure as a hard overlay failure', async () => {
    assetClient.resolveMarker.mockRejectedValue(
      new AssetServiceClientError('MARKER_NOT_FOUND', 'Marker was not found.'),
    );

    const useCase = new GetArOverlayUseCase(
      assetClient,
      monitoringClient,
      incidentClient,
    );

    await expect(useCase.execute({ markerCode: 'UNKNOWN' })).rejects.toThrow(
      NotFoundException,
    );
    expect(monitoringClient.getAssetOverview).not.toHaveBeenCalled();
    expect(incidentClient.listWorkOrders).not.toHaveBeenCalled();
    expect(incidentClient.createWorkOrder).not.toHaveBeenCalled();
  });

  it('treats asset resolution failure as a hard overlay failure', async () => {
    assetClient.resolveAssetByCode.mockRejectedValue(
      new DownstreamServiceError(
        'asset-service',
        'UNAVAILABLE',
        'Asset Service is unavailable.',
      ),
    );

    const useCase = new GetArOverlayUseCase(
      assetClient,
      monitoringClient,
      incidentClient,
    );

    await expect(
      useCase.execute({ asset: { assetType: 'rack', assetCode: 'RACK-A1' } }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(monitoringClient.getAssetOverview).not.toHaveBeenCalled();
    expect(incidentClient.listWorkOrders).not.toHaveBeenCalled();
    expect(incidentClient.createWorkOrder).not.toHaveBeenCalled();
  });
});
