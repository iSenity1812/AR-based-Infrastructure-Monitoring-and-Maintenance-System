import { Inject, Injectable } from '@nestjs/common';

import { DISCOVERED_NODE_REPOSITORY } from '@domain/ports/port.tokens';
import type { DiscoveredNodeRepositoryPort } from '@domain/ports/repositories.port';

@Injectable()
export class ListDiscoveredNodesUseCase {
  constructor(
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
  ) {}

  async execute() {
    return this.discoveredNodeRepository.listAll();
  }
}
