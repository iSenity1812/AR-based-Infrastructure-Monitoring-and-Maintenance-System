import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { RackOverviewController } from './rack-overview.controller';

describe('RackOverviewController', () => {
  it('declares dashboard read permission on the rack overview endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      RackOverviewController.prototype.getRackOverview,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates overview payload generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      data: [],
      meta: {
        generatedAt: new Date().toISOString(),
      },
    });
    const controller = new RackOverviewController({ execute } as never);

    await expect(controller.getRackOverview()).resolves.toEqual({
      data: [],
      meta: {
        generatedAt: expect.any(String),
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
