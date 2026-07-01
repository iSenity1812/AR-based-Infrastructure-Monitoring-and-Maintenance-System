import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a healthy status payload', () => {
    const controller = new HealthController();

    expect(
      controller.getHealth({
        headers: {},
      } as never),
    ).toMatchObject({
      data: {
        service: 'monitoring-service',
        status: 'ok',
      },
      meta: {
        version: 'v1',
      },
    });
  });
});
