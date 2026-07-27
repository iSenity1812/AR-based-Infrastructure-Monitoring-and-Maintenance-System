import { Test } from '@nestjs/testing';

import { GET_AR_OVERLAY_USE_CASE } from '@infrastructure/di/use-case.tokens';
import { ArOverlayController } from './ar-overlay.controller';

describe('ArOverlayController', () => {
  it('delegates overlay composition to the use case with auth headers', async () => {
    const execute = jest.fn().mockResolvedValue({
      source: { markerCode: 'MK-RACK-A1', assetCode: 'RACK-A1' },
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [ArOverlayController],
      providers: [
        {
          provide: GET_AR_OVERLAY_USE_CASE,
          useValue: { execute },
        },
      ],
    }).compile();
    const controller = moduleRef.get(ArOverlayController);
    const headers = {
      authorization: 'Bearer token',
      requestId: 'req-1',
      correlationId: 'corr-1',
    };

    await expect(
      controller.getOverlay(
        { markerCode: 'MK-RACK-A1' },
        { userId: 'user-1', permissions: ['ar.assets.identify'] },
        headers,
      ),
    ).resolves.toEqual({
      source: { markerCode: 'MK-RACK-A1', assetCode: 'RACK-A1' },
    });
    expect(execute).toHaveBeenCalledWith({ markerCode: 'MK-RACK-A1' }, headers);
  });
});
