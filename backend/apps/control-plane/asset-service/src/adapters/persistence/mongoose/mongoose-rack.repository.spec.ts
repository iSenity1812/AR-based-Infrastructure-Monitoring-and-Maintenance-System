import {
  RackCapacityState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import type { Model } from 'mongoose';

import { RackDocumentModel } from './asset-context.models';
import { MongooseRackRepository } from './mongoose-rack.repository';

describe('MongooseRackRepository.update', () => {
  it('uses $unset for optional rack fields passed as undefined', async () => {
    const findByIdAndUpdate = jest.fn().mockResolvedValue({
      _id: { toString: () => 'rack-1' },
      rackCode: 'LOCAL-LAB-01',
      displayName: 'Local Lab 01',
      lifecycleState: RackLifecycleState.ACTIVE,
      capacityState: RackCapacityState.AVAILABLE,
      metadata: { seeded: true },
    });
    const rackModel = {
      findByIdAndUpdate,
    } as unknown as Model<RackDocumentModel>;

    const repository = new MongooseRackRepository(rackModel);

    await repository.update('rack-1', {
      rackCode: 'LOCAL-LAB-01',
      displayName: 'Local Lab 01',
      lifecycleState: RackLifecycleState.ACTIVE,
      capacityState: RackCapacityState.AVAILABLE,
      zoneCode: undefined,
      metadata: { seeded: true },
    });

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'rack-1',
      {
        $set: {
          rackCode: 'LOCAL-LAB-01',
          displayName: 'Local Lab 01',
          lifecycleState: RackLifecycleState.ACTIVE,
          capacityState: RackCapacityState.AVAILABLE,
          metadata: { seeded: true },
        },
        $unset: {
          zoneCode: 1,
        },
      },
      {
        new: true,
      },
    );
  });
});
