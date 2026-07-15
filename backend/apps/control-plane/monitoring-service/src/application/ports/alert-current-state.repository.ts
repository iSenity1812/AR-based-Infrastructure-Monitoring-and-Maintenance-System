import type {
  AlertCurrentState,
  AlertCurrentStateStatus,
} from '../../domain/alert-current-state';

export abstract class AlertCurrentStateRepository {
  abstract findByFingerprint(
    fingerprint: string,
  ): Promise<AlertCurrentState | null>;

  abstract upsert(state: AlertCurrentState): Promise<void>;

  abstract listByStatus(
    status: AlertCurrentStateStatus,
  ): Promise<AlertCurrentState[]>;

  abstract listActiveByNodeId(nodeId: string): Promise<AlertCurrentState[]>;

  abstract listActiveByRackId(rackId: string): Promise<AlertCurrentState[]>;

  abstract listActiveByWorkloadId(
    workloadId: string,
  ): Promise<AlertCurrentState[]>;

  abstract listActiveByServiceId(serviceId: string): Promise<AlertCurrentState[]>;
}
