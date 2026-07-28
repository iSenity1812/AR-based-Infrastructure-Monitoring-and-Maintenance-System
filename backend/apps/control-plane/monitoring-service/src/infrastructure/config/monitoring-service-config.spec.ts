import { describe, expect, it } from '@jest/globals';

import { MonitoringServiceConfig } from './monitoring-service-config';

describe('MonitoringServiceConfig', () => {
  it('uses quieter default app log levels in development', () => {
    const config = new MonitoringServiceConfig({
      NODE_ENV: 'development',
    });

    expect(config.appLogLevels).toEqual(['log', 'warn', 'error', 'debug']);
  });

  it('uses quieter default app log levels in production', () => {
    const config = new MonitoringServiceConfig({
      NODE_ENV: 'production',
    });

    expect(config.appLogLevels).toEqual(['log', 'warn', 'error']);
  });

  it('allows overriding app log levels explicitly', () => {
    const config = new MonitoringServiceConfig({
      NODE_ENV: 'development',
      LOG_LEVELS: 'error,warn,verbose',
    });

    expect(config.appLogLevels).toEqual(['error', 'warn', 'verbose']);
  });

  it('uses deterministic defaults for workflow policy and system actor', () => {
    const config = new MonitoringServiceConfig({});

    expect(config.assetServiceBaseUrl).toBe('http://127.0.0.1:4002/api/v1');
    expect(config.assetServiceTimeoutMs).toBe(3000);
    expect(config.monitoringIncidentContextWindowMinutes).toBe(30);
    expect(config.monitoringIncidentNodeStaleThresholdSec).toBe(1800);
    expect(config.monitoringInvestigationMaxRangeDays).toBe(7);
    expect(config.monitoringInvestigationMaxPoints).toBe(400);
    expect(config.monitoringWorkflowSystemUserId).toBe(
      'system-monitoring-service',
    );
    expect(config.monitoringWorkflowSystemUsername).toBe('monitoring-service');
    expect(config.monitoringWorkflowSystemFullName).toBe('Monitoring Service');
    expect(config.monitoringWorkflowSystemSessionId).toBe(
      'system-monitoring-service-session',
    );
  });
});
