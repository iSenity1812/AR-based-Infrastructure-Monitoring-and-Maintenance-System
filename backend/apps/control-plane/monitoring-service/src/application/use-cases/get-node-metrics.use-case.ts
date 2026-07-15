import { Injectable } from '@nestjs/common';

import {
  NodeMetricsComposerService,
  type NodeMetricsResponseView,
} from '../services/node-metrics-composer.service';

@Injectable()
export class GetNodeMetricsUseCase {
  constructor(
    private readonly nodeMetricsComposerService: NodeMetricsComposerService,
  ) {}

  async execute(nodeId: string): Promise<NodeMetricsResponseView> {
    return this.nodeMetricsComposerService.buildMetrics(nodeId);
  }
}
