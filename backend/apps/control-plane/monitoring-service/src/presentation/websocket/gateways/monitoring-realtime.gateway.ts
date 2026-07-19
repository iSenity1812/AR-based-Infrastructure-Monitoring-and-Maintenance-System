import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

import {
  MonitoringRealtimePort,
  type NodeOverviewChangedEvent,
  type NodeMetricsUpdatedEvent,
  type NodeMetricsWorkloadsChangedEvent,
  type RackOverviewRealtimeUpdatedEvent,
  type RackMonitoringStateChangedEvent,
} from '../../../application/ports/monitoring-realtime.port';

export const MONITORING_RACK_STATE_CHANGED_EVENT =
  'monitoring.rack.state.changed';
export const MONITORING_RACK_OVERVIEW_UPDATED_EVENT =
  'monitoring.rack.overview.updated';
export const MONITORING_NODE_OVERVIEW_CHANGED_EVENT =
  'monitoring.node.overview.changed';
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

  async emitRackOverviewUpdated(
    payload: RackOverviewRealtimeUpdatedEvent,
  ): Promise<void> {
    this.server?.emit(MONITORING_RACK_OVERVIEW_UPDATED_EVENT, payload);
  }

  async emitNodeOverviewChanged(
    payload: NodeOverviewChangedEvent,
  ): Promise<void> {
    this.server?.emit(MONITORING_NODE_OVERVIEW_CHANGED_EVENT, payload);
    this.server?.emit(payload.channel, payload);
  }

  async emitNodeMetricsUpdated(
    payload: NodeMetricsUpdatedEvent,
  ): Promise<void> {
    this.server?.emit(MONITORING_NODE_METRICS_UPDATED_EVENT, payload);
    this.server?.emit(payload.channel, payload);
  }

  async emitNodeMetricsWorkloadsChanged(
    payload: NodeMetricsWorkloadsChangedEvent,
  ): Promise<void> {
    this.server?.emit(
      MONITORING_NODE_METRICS_WORKLOADS_CHANGED_EVENT,
      payload,
    );
    this.server?.emit(payload.channel, payload);
  }
}
