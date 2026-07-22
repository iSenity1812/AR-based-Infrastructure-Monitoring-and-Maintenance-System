import { Injectable } from '@nestjs/common';

import {
  CollectorLivenessService,
  type CollectorLivenessView,
} from '../services/collector-liveness.service';

@Injectable()
export class GetCollectorLivenessUseCase {
  constructor(
    private readonly collectorLivenessService: CollectorLivenessService,
  ) {}

  async execute(nodeId: string): Promise<CollectorLivenessView> {
    return this.collectorLivenessService.getByNodeId(nodeId);
  }
}
