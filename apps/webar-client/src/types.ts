export type NodeHealth = 'nominal' | 'warning' | 'critical';

export interface NodeContext {
  id: string;
  name: string;
  rack: string;
  status: NodeHealth;
  temperatureC: number;
  cpuPercent: number;
  memoryPercent: number;
  networkLatencyMs: number;
  activeTicketCount: number;
  lastTicketCode: string;
  updatedAt: string;
}
