import { NodeAssignmentState } from '@domain/entities/asset-context.entities';
import type { Model } from 'mongoose';

import { NodeDocumentModel } from './asset-context.models';
import { MongooseNodeRepository } from './mongoose-node.repository';

describe('MongooseNodeRepository.listUnassigned', () => {
  function buildRepository(findImpl: jest.Mock) {
    const sort = jest.fn().mockReturnValue({ exec: () => findImpl() });
    const find = jest.fn().mockReturnValue({ sort });
    const nodeModel = { find } as unknown as Model<NodeDocumentModel>;
    return { repository: new MongooseNodeRepository(nodeModel), find, sort };
  }

  it('filters by assignmentState UNASSIGNED without a lifecycle filter', async () => {
    const rows: never[] = [];
    const { repository, find, sort } = buildRepository(
      jest.fn().mockResolvedValue(rows),
    );

    const result = await repository.listUnassigned();

    expect(find).toHaveBeenCalledWith({
      assignmentState: NodeAssignmentState.UNASSIGNED,
    });
    expect(sort).toHaveBeenCalledWith({ nodeCode: 1 });
    expect(result).toEqual([]);
  });

  it('adds lifecycleState to the query when provided', async () => {
    const { repository, find } = buildRepository(
      jest.fn().mockResolvedValue([]),
    );

    await repository.listUnassigned({ lifecycleState: 'READY' });

    expect(find).toHaveBeenCalledWith({
      assignmentState: NodeAssignmentState.UNASSIGNED,
      lifecycleState: 'READY',
    });
  });
});
