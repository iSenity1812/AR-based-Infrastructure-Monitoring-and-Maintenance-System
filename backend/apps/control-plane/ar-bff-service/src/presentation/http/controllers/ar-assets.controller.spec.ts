import { Test } from '@nestjs/testing';

import {
  CREATE_AR_WORK_ORDER_USE_CASE,
  GET_AR_ASSET_OVERVIEW_USE_CASE,
  LIST_AR_WORK_ORDERS_USE_CASE,
} from '@infrastructure/di/use-case.tokens';
import { ArAssetsController } from './ar-assets.controller';

describe('ArAssetsController', () => {
  it('delegates overview, work-order list, and create actions to AR use cases', async () => {
    const getOverview = jest.fn().mockResolvedValue({ ok: 'overview' });
    const listWorkOrders = jest.fn().mockResolvedValue({ ok: 'list' });
    const createWorkOrder = jest.fn().mockResolvedValue({ ok: 'create' });
    const moduleRef = await Test.createTestingModule({
      controllers: [ArAssetsController],
      providers: [
        {
          provide: GET_AR_ASSET_OVERVIEW_USE_CASE,
          useValue: { execute: getOverview },
        },
        {
          provide: LIST_AR_WORK_ORDERS_USE_CASE,
          useValue: { execute: listWorkOrders },
        },
        {
          provide: CREATE_AR_WORK_ORDER_USE_CASE,
          useValue: { execute: createWorkOrder },
        },
      ],
    }).compile();
    const controller = moduleRef.get(ArAssetsController);
    const auth = { userId: 'user-1', permissions: [] };
    const headers = { authorization: 'Bearer token' };

    await expect(
      controller.getOverview('rack', 'rack-1', auth, headers),
    ).resolves.toEqual({ ok: 'overview' });
    await expect(
      controller.listWorkOrders('rack', 'rack-1', auth, headers),
    ).resolves.toEqual({ ok: 'list' });
    await expect(
      controller.createWorkOrder(
        'rack',
        'rack-1',
        { ticketCode: 'WO-1', title: 'Inspect rack', priority: 'HIGH' },
        auth,
        headers,
      ),
    ).resolves.toEqual({ ok: 'create' });
    expect(getOverview).toHaveBeenCalledWith('rack', 'rack-1', headers);
    expect(listWorkOrders).toHaveBeenCalledWith('rack', 'rack-1', headers);
    expect(createWorkOrder).toHaveBeenCalledWith(
      'rack',
      'rack-1',
      { ticketCode: 'WO-1', title: 'Inspect rack', priority: 'HIGH' },
      headers,
    );
  });
});
