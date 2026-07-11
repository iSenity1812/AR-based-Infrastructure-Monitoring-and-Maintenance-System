import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

import {
  MonitoringRealtimePort,
  type NodeMetricsUpdatedEvent,
  type NodeMetricsWorkloadsChangedEvent,
  type NodeOverviewRealtimeUpdatedEvent,
  type RackMonitoringStateChangedEvent,
} from '../../../application/ports/monitoring-realtime.port';

export const MONITORING_RACK_STATE_CHANGED_EVENT =
  'monitoring.rack.state.changed';
export const MONITORING_NODE_OVERVIEW_UPDATED_EVENT =
  'monitoring.node.overview.updated';
export const MONITORING_NODE_METRICS_UPDATED_EVENT =
  'monitoring.node.metrics.updated';
export const MONITORING_NODE_METRICS_WORKLOADS_CHANGED_EVENT =
  'monitoring.node.metrics.workloads.changed';

@Injectable()
@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: '*',
  },
})
export class MonitoringRealtimeGateway implements MonitoringRealtimePort {
  @WebSocketServer()
  private server?: Server;

  async emitRackStateChanged(
    payload: RackMonitoringStateChangedEvent,
  ): Promise<void> {
    this.server?.emit(MONITORING_RACK_STATE_CHANGED_EVENT, payload);
  }

  async emitNodeOverviewUpdated(
    payload: NodeOverviewRealtimeUpdatedEvent,
  ): Promise<void> {
    this.server?.emit(MONITORING_NODE_OVERVIEW_UPDATED_EVENT, payload);
  }

  async emitNodeMetricsUpdated(
    payload: NodeMetricsUpdatedEvent,
  ): Promise<void> {
    this.server?.emit(MONITORING_NODE_METRICS_UPDATED_EVENT, payload);
  }

  async emitNodeMetricsWorkloadsChanged(
    payload: NodeMetricsWorkloadsChangedEvent,
  ): Promise<void> {
    this.server?.emit(
      MONITORING_NODE_METRICS_WORKLOADS_CHANGED_EVENT,
      payload,
    );
  }
}
