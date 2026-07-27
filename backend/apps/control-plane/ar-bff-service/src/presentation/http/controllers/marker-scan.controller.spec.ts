import { Test } from '@nestjs/testing';

import { SCAN_MARKER_USE_CASE } from '@infrastructure/di/use-case.tokens';
import { MarkerScanController } from './marker-scan.controller';

describe('MarkerScanController', () => {
  it('submits marker scans to the use case with AR request headers', async () => {
    const execute = jest.fn().mockResolvedValue({
      markerCode: 'MK-RACK-A1',
      asset: {
        assetId: 'rack-1',
        assetType: 'rack',
        assetCode: 'RACK-A1',
        displayName: 'Rack A1',
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [MarkerScanController],
      providers: [
        {
          provide: SCAN_MARKER_USE_CASE,
          useValue: { execute },
        },
      ],
    }).compile();

    const controller = moduleRef.get(MarkerScanController);
    const headers = {
      authorization: 'Bearer access-token',
      requestId: 'req-1',
      correlationId: 'corr-1',
    };

    await expect(
      controller.scanMarker(
        { markerCode: 'MK-RACK-A1' },
        { userId: 'user-1', permissions: ['ar.assets.identify'] },
        headers,
      ),
    ).resolves.toEqual({
      markerCode: 'MK-RACK-A1',
      asset: {
        assetId: 'rack-1',
        assetType: 'rack',
        assetCode: 'RACK-A1',
        displayName: 'Rack A1',
      },
    });
    expect(execute).toHaveBeenCalledWith('MK-RACK-A1', headers);
  });
});
