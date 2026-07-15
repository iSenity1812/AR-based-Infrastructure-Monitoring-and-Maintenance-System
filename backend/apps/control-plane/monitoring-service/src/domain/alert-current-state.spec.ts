import { describe, expect, it } from '@jest/globals';

import {
  ALERT_CURRENT_STATE_CATEGORIES,
  ALERT_CURRENT_STATE_SCOPE_TYPES,
} from './alert-current-state';

describe('alert current state domain contract', () => {
  it('supports the delegated alert scopes used by monitoring service', () => {
    expect(ALERT_CURRENT_STATE_SCOPE_TYPES).toEqual([
      'node',
      'rack',
      'workload',
      'service',
    ]);
  });

  it('supports runtime categories already used by delegated alerting', () => {
    expect(ALERT_CURRENT_STATE_CATEGORIES).toEqual([
      'availability',
      'resource',
      'thermal',
      'runtime',
      'network',
      'connectivity',
    ]);
  });
});
