import { AssetNodeContextHttpProvider } from './asset-node-context-http.provider';
import { MonitoringServiceConfig } from '../config/monitoring-service-config';

describe('AssetNodeContextHttpProvider', () => {
  it('maps an available node context response', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            node: {
              id: 'node-1',
              nodeCode: 'node-msi-341b683e',
              displayName: 'Maintenance Node 01',
              hostname: 'msi-maintenance-01',
              rackId: 'rack-1',
              serialNumber: 'SER-001',
              vendor: 'MSI',
              model: 'MS-158L',
              managementIp: '10.10.10.10',
            },
            rack: {
              id: 'rack-1',
              rackCode: 'LOCAL-LAB-01',
              displayName: 'Local Lab Rack 01',
              siteCode: 'HCM',
              roomCode: 'LAB',
            },
          },
        }),
      } as Response);

    const provider = new AssetNodeContextHttpProvider(
      new MonitoringServiceConfig({}),
    );

    await expect(
      provider.getNodeContext({
        nodeId: 'node-1',
        authorizationHeader: 'Bearer token',
        correlationId: 'corr-1',
      }),
    ).resolves.toEqual({
      kind: 'available',
      context: {
        node: {
          id: 'node-1',
          nodeCode: 'node-msi-341b683e',
          displayName: 'Maintenance Node 01',
          hostname: 'msi-maintenance-01',
          rackId: 'rack-1',
          serialNumber: 'SER-001',
          vendor: 'MSI',
          model: 'MS-158L',
          managementIp: '10.10.10.10',
        },
        rack: {
          id: 'rack-1',
          rackCode: 'LOCAL-LAB-01',
          displayName: 'Local Lab Rack 01',
          siteCode: 'HCM',
          roomCode: 'LAB',
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4002/api/v1/nodes/node-1/context',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer token',
          'x-correlation-id': 'corr-1',
        }),
      }),
    );
    fetchMock.mockRestore();
  });

  it('returns unavailable for malformed payloads', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { node: { id: 'node-1' } } }),
      } as Response);

    const provider = new AssetNodeContextHttpProvider(
      new MonitoringServiceConfig({}),
    );

    await expect(
      provider.getNodeContext({
        nodeId: 'node-1',
        authorizationHeader: 'Bearer token',
      }),
    ).resolves.toEqual({
      kind: 'unavailable',
      reasonCode: 'INVALID_RESPONSE',
    });

    fetchMock.mockRestore();
  });

  it('returns unavailable reason codes for upstream status and timeout cases', async () => {
    const provider = new AssetNodeContextHttpProvider(
      new MonitoringServiceConfig({}),
    );

    const fetchMock = jest.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);
    await expect(
      provider.getNodeContext({
        nodeId: 'node-404',
        authorizationHeader: 'Bearer token',
      }),
    ).resolves.toEqual({
      kind: 'unavailable',
      reasonCode: 'NOT_FOUND',
    });

    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );
    await expect(
      provider.getNodeContext({
        nodeId: 'node-timeout',
        authorizationHeader: 'Bearer token',
      }),
    ).resolves.toEqual({
      kind: 'unavailable',
      reasonCode: 'TIMEOUT',
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);
    await expect(
      provider.getNodeContext({
        nodeId: 'node-forbidden',
        authorizationHeader: 'Bearer token',
      }),
    ).resolves.toEqual({
      kind: 'unavailable',
      reasonCode: 'FORBIDDEN',
    });

    fetchMock.mockRestore();
  });
});
