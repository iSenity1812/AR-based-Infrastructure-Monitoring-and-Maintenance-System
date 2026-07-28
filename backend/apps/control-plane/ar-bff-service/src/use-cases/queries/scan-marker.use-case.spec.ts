import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { AssetServiceClientError } from '@application/errors/asset-service-client.error';
import type { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import type { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import { ScanMarkerUseCase } from './scan-marker.use-case';

describe('ScanMarkerUseCase', () => {
  const assetClient = {
    serviceName: 'asset-service',
    resolveMarker: jest.fn(),
  } satisfies jest.Mocked<AssetServiceClientPort>;

  const monitoringClient = {
    serviceName: 'monitoring-service',
  } satisfies jest.Mocked<MonitoringServiceClientPort>;

  const incidentClient = {
    serviceName: 'incident-workflow-service',
  } satisfies jest.Mocked<IncidentWorkflowServiceClientPort>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized rack asset identity for a rack marker scan', async () => {
    assetClient.resolveMarker.mockResolvedValue({
      marker: {
        markerCode: 'MK-RACK-A1',
        lifecycleState: 'ACTIVE',
        bindingStatus: 'MOUNTED',
        isActive: true,
        isVisibleInAr: true,
      },
      target: {
        id: 'rack-1',
        type: 'RACK',
        code: 'RACK-A1',
        name: 'Rack A1',
      },
      rack: {
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
      },
    });

    const useCase = new ScanMarkerUseCase(assetClient);

    await expect(useCase.execute('MK-RACK-A1')).resolves.toEqual({
      markerCode: 'MK-RACK-A1',
      asset: {
        assetId: 'rack-1',
        assetType: 'rack',
        assetCode: 'RACK-A1',
        displayName: 'Rack A1',
      },
    });
    expect(assetClient.resolveMarker).toHaveBeenCalledWith('MK-RACK-A1', {});
  });

  it('returns normalized node asset identity with parent rack context', async () => {
    assetClient.resolveMarker.mockResolvedValue({
      marker: {
        markerCode: 'MK-NODE-A1-01',
        lifecycleState: 'ACTIVE',
        bindingStatus: 'MOUNTED',
        isActive: true,
        isVisibleInAr: true,
      },
      target: {
        id: 'node-1',
        type: 'NODE',
        code: 'NODE-A1-01',
        name: 'Node A1-01',
      },
      rack: {
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
      },
      node: {
        id: 'node-1',
        nodeCode: 'NODE-A1-01',
        displayName: 'Node A1-01',
      },
      topologyPath: {
        rackId: 'rack-1',
        rackCode: 'RACK-A1',
      },
    });

    const useCase = new ScanMarkerUseCase(assetClient);

    await expect(useCase.execute('MK-NODE-A1-01')).resolves.toEqual({
      markerCode: 'MK-NODE-A1-01',
      asset: {
        assetId: 'node-1',
        assetType: 'node',
        assetCode: 'NODE-A1-01',
        displayName: 'Node A1-01',
      },
      parentRack: {
        rackId: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
      },
    });
  });

  it('maps marker-not-found to an explicit AR-facing not-found error', async () => {
    assetClient.resolveMarker.mockRejectedValue(
      new AssetServiceClientError('MARKER_NOT_FOUND', 'Marker was not found.'),
    );

    const useCase = new ScanMarkerUseCase(assetClient);

    await expect(useCase.execute('UNKNOWN')).rejects.toThrow(NotFoundException);
    expect(monitoringClient).toEqual({ serviceName: 'monitoring-service' });
    expect(incidentClient).toEqual({
      serviceName: 'incident-workflow-service',
    });
  });

  it('maps Asset Service availability failure to service unavailable', async () => {
    assetClient.resolveMarker.mockRejectedValue(
      new AssetServiceClientError(
        'ASSET_SERVICE_UNAVAILABLE',
        'Asset Service is unavailable.',
      ),
    );

    const useCase = new ScanMarkerUseCase(assetClient);

    await expect(useCase.execute('MK-RACK-A1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
