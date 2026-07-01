import { AlertSeverity } from '../constants/alert-severity.enum';
import { HealthStatus } from '../constants/health-status.enum';

export interface HealthStatusCounts {
  openAlertCount: number;
  warningAlertCount: number;
  criticalAlertCount: number;
}

export class HealthStatusDerivationService {
  deriveStatus(counts: HealthStatusCounts): HealthStatus {
    if (counts.criticalAlertCount > 0) {
      return HealthStatus.CRITICAL;
    }
    if (counts.warningAlertCount > 0) {
      return HealthStatus.WARNING;
    }
    if (counts.openAlertCount > 0) {
      return HealthStatus.WARNING;
    }
    return HealthStatus.HEALTHY;
  }

  deriveHighestSeverity(counts: HealthStatusCounts): AlertSeverity | undefined {
    if (counts.criticalAlertCount > 0) {
      return AlertSeverity.CRITICAL;
    }
    if (counts.warningAlertCount > 0 || counts.openAlertCount > 0) {
      return AlertSeverity.WARNING;
    }
    return undefined;
  }
}
