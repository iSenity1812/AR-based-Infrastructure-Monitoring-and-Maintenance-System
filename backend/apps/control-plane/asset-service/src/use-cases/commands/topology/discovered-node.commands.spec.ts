import { NodeAssignmentState, NodeLifecycleState } from '@domain/entities/asset-context.entities';

import { AssignDiscoveredNodeToRackUseCase } from './discovered-node.commands';

describe('AssignDiscoveredNodeToRackUseCase', () => {
  it('propagates discovery source and vendor metadata into node normalization', async () => {
    const discoveredNode = {
      agentId: 'agent-123',
      hostname: 'node-01',
      deviceType: 'WORKSTATION',
      source: 'windows_exporter',
      lifecycleState: NodeLifecycleState.DISCOVERED,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      hardware: {
        primaryIpv4: '10.0.0.10',
        hardwareSerial: 'SER-123',
        vendor: 'Dell Inc.',
        model: 'PowerEdge R740',
      },
      createdAt: '2026-06-17T08:00:00.000Z',
      updatedAt: '2026-06-17T08:00:00.000Z',
    };

    const normalizedNode = { id: 'node-1' };
    const discoveredNodeRepository = {
      findByAgentId: jest.fn().mockResolvedValue(discoveredNode),
      save: jest.fn().mockResolvedValue(discoveredNode),
    };
    const rackRepository = {
      findById: jest.fn().mockResolvedValue({ siteCode: 'site-a' }),
    };
    const normalizeNodeUseCase = {
      execute: jest.fn().mockResolvedValue(normalizedNode),
    };
    const assignNodeToRackUseCase = {
      execute: jest.fn().mockResolvedValue(normalizedNode),
    };
    const activateNodeUseCase = {
      execute: jest.fn().mockResolvedValue({ ...normalizedNode, lifecycleState: NodeLifecycleState.ACTIVE }),
    };

    const useCase = new AssignDiscoveredNodeToRackUseCase(
      discoveredNodeRepository as any,
      rackRepository as any,
      normalizeNodeUseCase as any,
      assignNodeToRackUseCase as any,
      activateNodeUseCase as any,
    );

    await useCase.execute('agent-123', 'rack-a', 'U22');

    expect(normalizeNodeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'windows_exporter',
        vendor: 'Dell Inc.',
        model: 'PowerEdge R740',
        metadata: expect.objectContaining({
          discoveredNode: expect.objectContaining({
            source: 'windows_exporter',
          }),
        }),
      }),
    );
    expect(discoveredNodeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'windows_exporter',
        logicalRackId: 'rack-a',
      }),
    );
  });
});
