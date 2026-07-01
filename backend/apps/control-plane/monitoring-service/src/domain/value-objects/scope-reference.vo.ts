import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';

export interface ScopeReferenceProps {
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
}

export class ScopeReference {
  readonly scopeType: MonitoringScopeType;
  readonly scopeId: string;
  readonly agentId?: string;

  constructor(props: ScopeReferenceProps) {
    this.scopeType = props.scopeType;
    this.scopeId = props.scopeId;
    this.agentId = props.agentId;
  }

  toKey(): string {
    return [this.scopeType, this.scopeId, this.agentId ?? ''].join('|');
  }
}
