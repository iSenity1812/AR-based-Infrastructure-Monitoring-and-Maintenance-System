import { InvestigationWindowPolicyService } from './investigation-window-policy.service';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

describe('InvestigationWindowPolicyService', () => {
  it('normalizes valid UTC ISO timestamps and defaults interval to 1m', () => {
    const service = new InvestigationWindowPolicyService(
      new MonitoringServiceConfig({}),
    );

    expect(
      service.normalize({
        from: '2026-07-22T10:00:00.000Z',
        to: '2026-07-22T10:30:00.000Z',
      }),
    ).toEqual({
      from: '2026-07-22T10:00:00.000Z',
      to: '2026-07-22T10:30:00.000Z',
      interval: '1m',
      estimatedPoints: 31,
    });
  });

  it('accepts the upper boundary range and point count', () => {
    const service = new InvestigationWindowPolicyService(
      new MonitoringServiceConfig({
        MONITORING_INVESTIGATION_MAX_RANGE_DAYS: '7',
        MONITORING_INVESTIGATION_MAX_POINTS: '400',
      }),
    );

    expect(
      service.normalize({
        from: '2026-07-22T00:00:00.000Z',
        to: '2026-07-23T09:15:00.000Z',
        interval: '5m',
      }),
    ).toEqual({
      from: '2026-07-22T00:00:00.000Z',
      to: '2026-07-23T09:15:00.000Z',
      interval: '5m',
      estimatedPoints: 400,
    });
  });

  it('rejects invalid timestamps, reversed ranges, and unsupported intervals', () => {
    const service = new InvestigationWindowPolicyService(
      new MonitoringServiceConfig({}),
    );

    expect(() =>
      service.normalize({
        from: 'not-a-date',
        to: '2026-07-22T10:00:00.000Z',
      }),
    ).toThrow(/INVALID_INVESTIGATION_TIMESTAMP/);

    expect(() =>
      service.normalize({
        from: '2026-07-22T10:05:00.000Z',
        to: '2026-07-22T10:00:00.000Z',
      }),
    ).toThrow(/INVALID_INVESTIGATION_RANGE/);

    expect(() =>
      service.normalize({
        from: '2026-07-22T10:00:00.000Z',
        to: '2026-07-22T10:30:00.000Z',
        interval: '30s',
      }),
    ).toThrow(/INVALID_INVESTIGATION_INTERVAL/);
  });

  it('rejects ranges that exceed configured days or points', () => {
    const service = new InvestigationWindowPolicyService(
      new MonitoringServiceConfig({
        MONITORING_INVESTIGATION_MAX_RANGE_DAYS: '7',
        MONITORING_INVESTIGATION_MAX_POINTS: '400',
      }),
    );

    expect(() =>
      service.normalize({
        from: '2026-07-15T00:00:00.000Z',
        to: '2026-07-23T00:00:01.000Z',
        interval: '5m',
      }),
    ).toThrow(/INVESTIGATION_RANGE_EXCEEDED/);

    expect(() =>
      service.normalize({
        from: '2026-07-22T00:00:00.000Z',
        to: '2026-07-22T08:00:00.000Z',
        interval: '1m',
      }),
    ).toThrow(/INVESTIGATION_POINT_LIMIT_EXCEEDED/);
  });
});
