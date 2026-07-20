import { Injectable } from '@nestjs/common';

import {
  NodeMetricsComposerService,
  type NodeMetricsResponseView,
} from '../services/node-metrics-composer.service';
import type { NodeMetricsRangeInput } from '../ports/node-metrics-read.repository';

@Injectable()
export class GetNodeMetricsUseCase {
  constructor(
    private readonly nodeMetricsComposerService: NodeMetricsComposerService,
  ) {}

  async execute(
    nodeId: string,
    range?: NodeMetricsRangeInput,
  ): Promise<NodeMetricsResponseView> {
    return this.nodeMetricsComposerService.buildMetrics(nodeId, range);
  }

  async executeLive(
    nodeId: string,
    range?: NodeMetricsRangeInput,
  ): Promise<NodeMetricsResponseView> {
    return this.nodeMetricsComposerService.buildLiveMetrics(nodeId, range);
  }
}
