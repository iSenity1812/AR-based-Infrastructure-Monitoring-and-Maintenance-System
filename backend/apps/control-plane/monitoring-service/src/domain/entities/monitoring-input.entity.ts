import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';

export interface MonitoringInputField {
  metricKey: string;
  value: number | string | boolean | null;
  unit?: string;
  source?: string;
  observedAt: Date;
}

export interface MonitoringContextInputProps {
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  identity?: Record<string, MonitoringInputField>;
  relations?: Record<string, MonitoringInputField>;
  capacity?: Record<string, MonitoringInputField>;
  inventory?: Record<string, MonitoringInputField>;
  attributes?: Record<string, MonitoringInputField>;
  batchSequence: number;
  updatedAt: Date;
}

export interface MonitoringSnapshotInputProps {
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  metrics: Record<string, MonitoringInputField>;
  batchSequence: number;
  deliveryIdentity?: string;
  updatedAt: Date;
}

export class MonitoringContextInput {
  readonly scopeType: MonitoringScopeType;
  readonly scopeId: string;
  readonly agentId?: string;
  readonly identity: Record<string, MonitoringInputField>;
  readonly relations: Record<string, MonitoringInputField>;
  readonly capacity: Record<string, MonitoringInputField>;
  readonly inventory: Record<string, MonitoringInputField>;
  readonly attributes: Record<string, MonitoringInputField>;
  readonly batchSequence: number;
  readonly updatedAt: Date;

  constructor(props: MonitoringContextInputProps) {
    this.scopeType = props.scopeType;
    this.scopeId = props.scopeId;
    this.agentId = props.agentId;
    this.identity = props.identity ?? {};
    this.relations = props.relations ?? {};
    this.capacity = props.capacity ?? {};
    this.inventory = props.inventory ?? {};
    this.attributes = props.attributes ?? {};
    this.batchSequence = props.batchSequence;
    this.updatedAt = props.updatedAt;
  }

  findField(metricKey: string): MonitoringInputField | undefined {
    return (
      this.identity[metricKey] ??
      this.relations[metricKey] ??
      this.capacity[metricKey] ??
      this.inventory[metricKey] ??
      this.attributes[metricKey]
    );
  }
}

export class MonitoringSnapshotInput {
  readonly scopeType: MonitoringScopeType;
  readonly scopeId: string;
  readonly agentId?: string;
  readonly metrics: Record<string, MonitoringInputField>;
  readonly batchSequence: number;
  readonly deliveryIdentity?: string;
  readonly updatedAt: Date;

  constructor(props: MonitoringSnapshotInputProps) {
    this.scopeType = props.scopeType;
    this.scopeId = props.scopeId;
    this.agentId = props.agentId;
    this.metrics = props.metrics;
    this.batchSequence = props.batchSequence;
    this.deliveryIdentity = props.deliveryIdentity;
    this.updatedAt = props.updatedAt;
  }

  findField(metricKey: string): MonitoringInputField | undefined {
    return this.metrics[metricKey];
  }
}
