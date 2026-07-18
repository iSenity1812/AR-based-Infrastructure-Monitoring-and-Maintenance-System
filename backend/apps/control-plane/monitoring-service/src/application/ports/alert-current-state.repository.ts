import type {
  AlertCurrentState,
  AlertIncidentLinkage,
  AlertCurrentStateStatus,
} from '../../domain/alert-current-state';

export abstract class AlertCurrentStateRepository {
  abstract findByFingerprint(
    fingerprint: string,
  ): Promise<AlertCurrentState | null>;

  abstract upsert(state: AlertCurrentState): Promise<void>;

  abstract updateIncidentLinkage(
    fingerprint: string,
    linkage: AlertIncidentLinkage,
  ): Promise<AlertCurrentState | null>;

  abstract listByStatus(
    status: AlertCurrentStateStatus,
  ): Promise<AlertCurrentState[]>;

  abstract listActiveRackAlerts(): Promise<AlertCurrentState[]>;

  abstract listActiveNodeAlerts(): Promise<AlertCurrentState[]>;

  abstract listActiveByNodeId(nodeId: string): Promise<AlertCurrentState[]>;

  abstract listActiveByRackId(rackId: string): Promise<AlertCurrentState[]>;

  abstract listActiveByWorkloadId(
    workloadId: string,
  ): Promise<AlertCurrentState[]>;

  abstract listActiveByServiceId(
    serviceId: string,
  ): Promise<AlertCurrentState[]>;
}
