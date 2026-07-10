import type {
  MonitoringScopeType,
  MonitoringState,
} from '../../domain/monitoring-state';

export abstract class MonitoringStateRepository {
  abstract findByScope(
    scopeType: MonitoringScopeType,
    scopeId: string,
  ): Promise<MonitoringState | null>;

  abstract save(state: MonitoringState): Promise<void>;
}
