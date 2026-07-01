import { AlertSeverity } from '../constants/alert-severity.enum';
import { HealthStatus } from '../constants/health-status.enum';
import { HealthStatusDerivationService } from './health-status-derivation.service';

describe('HealthStatusDerivationService', () => {
  const service = new HealthStatusDerivationService();

  it('returns critical when critical alerts exist', () => {
    const status = service.deriveStatus({
      openAlertCount: 2,
      warningAlertCount: 1,
      criticalAlertCount: 1,
    });

    const severity = service.deriveHighestSeverity({
      openAlertCount: 2,
      warningAlertCount: 1,
      criticalAlertCount: 1,
    });

    expect(status).toBe(HealthStatus.CRITICAL);
    expect(severity).toBe(AlertSeverity.CRITICAL);
  });

  it('returns warning when only warning alerts exist', () => {
    const status = service.deriveStatus({
      openAlertCount: 1,
      warningAlertCount: 1,
      criticalAlertCount: 0,
    });

    const severity = service.deriveHighestSeverity({
      openAlertCount: 1,
      warningAlertCount: 1,
      criticalAlertCount: 0,
    });

    expect(status).toBe(HealthStatus.WARNING);
    expect(severity).toBe(AlertSeverity.WARNING);
  });

  it('returns healthy when no alerts exist', () => {
    const status = service.deriveStatus({
      openAlertCount: 0,
      warningAlertCount: 0,
      criticalAlertCount: 0,
    });

    const severity = service.deriveHighestSeverity({
      openAlertCount: 0,
      warningAlertCount: 0,
      criticalAlertCount: 0,
    });

    expect(status).toBe(HealthStatus.HEALTHY);
    expect(severity).toBeUndefined();
  });
});
