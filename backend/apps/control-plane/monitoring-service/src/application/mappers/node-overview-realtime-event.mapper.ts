import type {
  NodeOverviewChangedEvent,
} from '../ports/monitoring-realtime.port';
import {
  buildNodeOverviewChangedChannel,
  type NodeOverviewResponseView,
} from '../services/node-overview-composer.service';

export function mapNodeOverviewToChangedEvent(
  overview: NodeOverviewResponseView,
  fingerprint: string,
): NodeOverviewChangedEvent {
  return {
    event: 'monitoring.node.overview.changed',
    nodeId: overview.node.nodeId,
    channel: buildNodeOverviewChangedChannel(overview.node.nodeId),
    changedAt: new Date().toISOString(),
    fingerprint,
  };
}
