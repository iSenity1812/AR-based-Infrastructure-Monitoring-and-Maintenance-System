import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

import {
  MonitoringRealtimePort,
  type RackMonitoringStateChangedEvent,
} from '../../../application/ports/monitoring-realtime.port';

export const MONITORING_RACK_STATE_CHANGED_EVENT =
  'monitoring.rack.state.changed';

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
}
