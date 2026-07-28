import { of } from 'rxjs';
import type { ClientGrpc } from '@nestjs/microservices';

import { AssetRackContextGrpcProvider } from './asset-rack-context-grpc.provider';

describe('AssetRackContextGrpcProvider', () => {
  it('uses camelCase rackIds and maps all rack context fields from the gRPC response', async () => {
    const batchGetRacks = jest.fn().mockReturnValue(
      of({
        racks: [
          {
            id: '6a2f7998e30806b008ecb293',
            rackCode: 'RACK-A1',
            displayName: 'Rack A1',
            lifecycleState: 'ACTIVE',
            capacityState: 'AVAILABLE',
            siteCode: 'DC01',
            roomCode: 'ROOM-A',
            zoneCode: 'ZONE-1',
            rowCode: 'ROW-02',
            positionCode: 'P-08',
            capacityLimit: 42,
            notes: 'Primary compute rack',
            vendor: 'Dell',
            metadata: {
              arAnchorId: 'anchor-17',
            },
          },
        ],
      }),
    );
    const grpcClient = {
      getService: jest.fn().mockReturnValue({
        BatchGetRacks: batchGetRacks,
      }),
    } as unknown as ClientGrpc;

    const provider = new AssetRackContextGrpcProvider(grpcClient);
    provider.onModuleInit();

    const result = await provider.batchGetRacks([
      '6a2f7998e30806b008ecb293',
      '6a2f7998e30806b008ecb293',
    ]);

    expect(batchGetRacks).toHaveBeenCalledWith({
      rackIds: ['6a2f7998e30806b008ecb293'],
    });
    expect(result.get('6a2f7998e30806b008ecb293')).toEqual({
      id: '6a2f7998e30806b008ecb293',
      rackCode: 'RACK-A1',
      displayName: 'Rack A1',
      lifecycleState: 'ACTIVE',
      capacityState: 'AVAILABLE',
      siteCode: 'DC01',
      roomCode: 'ROOM-A',
      zoneCode: 'ZONE-1',
      rowCode: 'ROW-02',
      positionCode: 'P-08',
      capacityLimit: 42,
      notes: 'Primary compute rack',
      vendor: 'Dell',
      metadata: {
        arAnchorId: 'anchor-17',
      },
    });
  });

  it('drops placeholder rack ids before calling the asset service', async () => {
    const batchGetRacks = jest.fn().mockReturnValue(
      of({
        racks: [],
      }),
    );
    const grpcClient = {
      getService: jest.fn().mockReturnValue({
        BatchGetRacks: batchGetRacks,
      }),
    } as unknown as ClientGrpc;

    const provider = new AssetRackContextGrpcProvider(grpcClient);
    provider.onModuleInit();

    await provider.batchGetRacks([
      'rack-a1',
      'null',
      '   ',
      'undefined',
      'rack-a1',
    ]);

    expect(batchGetRacks).toHaveBeenCalledWith({
      rackIds: ['rack-a1'],
    });
  });
});
