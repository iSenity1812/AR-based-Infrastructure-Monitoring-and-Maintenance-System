import { Injectable } from '@nestjs/common';

import {
  NodeOverviewComposerService,
  type NodeOverviewResponseView,
} from '../services/node-overview-composer.service';

@Injectable()
export class GetNodeOverviewUseCase {
  constructor(
    private readonly nodeOverviewComposerService: NodeOverviewComposerService,
  ) {}

  async execute(nodeId: string): Promise<NodeOverviewResponseView> {
    return this.nodeOverviewComposerService.buildOverview(nodeId);
  }
}
