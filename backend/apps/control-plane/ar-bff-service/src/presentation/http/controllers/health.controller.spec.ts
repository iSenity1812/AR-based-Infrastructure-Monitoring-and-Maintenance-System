import { Test } from '@nestjs/testing';

import { GET_HEALTH_USE_CASE } from '@infrastructure/di/use-case.tokens';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns AR BFF service health without downstream calls', async () => {
    const execute = jest.fn().mockReturnValue({
      status: 'ok',
      service: 'ar-bff-service',
      dependencies: {
        assetService: 'configured',
        monitoringService: 'configured',
        incidentWorkflowService: 'configured',
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: GET_HEALTH_USE_CASE,
          useValue: { execute },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'ar-bff-service',
      dependencies: {
        assetService: 'configured',
        monitoringService: 'configured',
        incidentWorkflowService: 'configured',
      },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
