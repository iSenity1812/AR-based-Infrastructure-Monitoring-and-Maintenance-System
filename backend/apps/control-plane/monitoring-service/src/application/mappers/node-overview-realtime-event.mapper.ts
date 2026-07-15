import type {
  NodeOverviewRealtimeUpdatedEvent,
} from '../ports/monitoring-realtime.port';
import type { NodeOverviewResponseView } from '../services/node-overview-composer.service';

export function mapNodeOverviewToRealtimeEvent(
  overview: NodeOverviewResponseView,
): NodeOverviewRealtimeUpdatedEvent {
  return {
    nodeId: overview.node.nodeId,
    emittedAt: new Date().toISOString(),
    node: overview.node,
    summaryMetrics: overview.summaryMetrics,
    workloadSummary: overview.workloadSummary,
    workloads: overview.workloads,
  };
}
