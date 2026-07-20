import { NodeLifecycleState } from '@domain/entities/asset-context.entities';
import type { NodeRepositoryPort } from '@domain/ports/repositories.port';

import { ListUnassignedNodesUseCase } from './unassigned-node.queries';

function buildPort(listUnassigned: NodeRepositoryPort['listUnassigned']) {
  return { listUnassigned } as NodeRepositoryPort;
}

describe('ListUnassignedNodesUseCase', () => {
  it('returns the unassigned nodes from the repository', async () => {
    const nodes = [
      {
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: 'UNASSIGNED' as const,
        metadata: {},
      },
    ];
    const listUnassigned = jest.fn().mockResolvedValue(nodes);
    const useCase = new ListUnassignedNodesUseCase(buildPort(listUnassigned));

    const result = await useCase.execute();

    expect(listUnassigned).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(nodes);
  });

  it('forwards an optional lifecycleState filter to the repository', async () => {
    const listUnassigned = jest.fn().mockResolvedValue([]);
    const useCase = new ListUnassignedNodesUseCase(buildPort(listUnassigned));

    await useCase.execute({ lifecycleState: NodeLifecycleState.DISCOVERED });

    expect(listUnassigned).toHaveBeenCalledWith({
      lifecycleState: NodeLifecycleState.DISCOVERED,
    });
  });
});
