import { io, type Socket } from 'socket.io-client';
import type { NodeLiveMetrics } from '../types';

type NodeMetricsEvent = {
  nodeId: string;
  channel: string;
  ts: string;
  bucketSec: number;
  node: {
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    diskUsagePct: number | null;
    cpuTemperatureC: number | null;
    networkRxBytesSec: number | null;
    networkTxBytesSec: number | null;
  };
};

type RealtimeHandlers = {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
  onMetrics: (metrics: NodeLiveMetrics) => void;
};

export function subscribeToNodeMetrics(
  socketBaseUrl: string,
  nodeId: string,
  token: string | null,
  handlers: RealtimeHandlers,
): () => void {
  const baseUrl = socketBaseUrl.trim().replace(/\/$/, '');
  const socket: Socket = io(`${baseUrl}/monitoring`, {
    path: '/monitoring/socket.io',
    transports: ['websocket', 'polling'],
    timeout: 10_000,
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 8_000,
  });

  socket.on('connect', handlers.onConnected);
  socket.on('disconnect', handlers.onDisconnected);
  socket.on('connect_error', (error) => handlers.onError(error.message));
  socket.on('monitoring.node.metrics.updated', (event: NodeMetricsEvent) => {
    if (
      event.nodeId !== nodeId ||
      !event.channel.endsWith('.metrics.live')
    ) {
      return;
    }

    handlers.onMetrics({
      nodeId: event.nodeId,
      observedAt: event.ts,
      bucketSec: event.bucketSec,
      ...event.node,
    });
  });

  return () => socket.close();
}
