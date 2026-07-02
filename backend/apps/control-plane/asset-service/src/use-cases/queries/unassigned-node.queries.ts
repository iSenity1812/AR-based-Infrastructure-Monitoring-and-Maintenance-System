import { Inject, Injectable } from '@nestjs/common';

import { NODE_REPOSITORY } from '@domain/ports/port.tokens';
import type { NodeLifecycleState } from '@domain/entities/asset-context.entities';
import type { NodeRepositoryPort } from '@domain/ports/repositories.port';

@Injectable()
export class ListUnassignedNodesUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
  ) {}

  execute(filter?: { lifecycleState?: NodeLifecycleState }) {
    return this.nodeRepository.listUnassigned(filter);
  }
}
