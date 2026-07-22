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
});
