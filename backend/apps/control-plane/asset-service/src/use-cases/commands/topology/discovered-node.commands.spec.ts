/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment */
import {
  NodeAssignmentState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import type {
  DiscoveredNodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';

import { ActivateNodeUseCase } from './node-topology.commands';
import { AssignDiscoveredNodeToRackUseCase } from './discovered-node.commands';
import { AssignNodeToRackUseCase, NormalizeNodeUseCase } from './topology';
/* eslint-enable @typescript-eslint/no-unused-vars */

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
      listAll: jest.fn().mockResolvedValue([]),
    };
    const rackRepository = {
      findById: jest.fn().mockResolvedValue({ siteCode: 'site-a' }),
      create: jest.fn(),
      update: jest.fn(),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };
    const normalizeNodeUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue(normalizedNode) as NormalizeNodeUseCase['execute'],
    };
    const assignNodeToRackUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue(
          normalizedNode,
        ) as AssignNodeToRackUseCase['execute'],
    };
    const activateNodeUseCase = {
      execute: jest.fn().mockResolvedValue({
        ...normalizedNode,
        lifecycleState: NodeLifecycleState.ACTIVE,
      }) as ActivateNodeUseCase['execute'],
    };

    const useCase = new AssignDiscoveredNodeToRackUseCase(
      discoveredNodeRepository,
      rackRepository,
      normalizeNodeUseCase,
      assignNodeToRackUseCase,
      activateNodeUseCase,
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
      {
        publishNodeMapping: false,
      },
    );
    expect(discoveredNodeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'windows_exporter',
        logicalRackId: 'rack-a',
      }),
    );
  });
});
