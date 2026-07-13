import {
  EXTERNAL_ALERT_RULE_BASELINES,
  EXTERNAL_ALERT_SCOPE_CONTRACTS,
  getExternalAlertScopeContract,
} from './external-alerting-v1.contract';

describe('external alerting v1 contract', () => {
  it('does not use scope_id in any grouping or required label contract', () => {
    for (const contract of Object.values(EXTERNAL_ALERT_SCOPE_CONTRACTS)) {
      expect(contract.requiredLabelKeys).not.toContain('scope_id');
      expect(contract.groupingKeys).not.toContain('scope_id');
      expect(contract.inhibitionIdentityKeys).not.toContain('scope_id');
    }
  });

  it('uses scope-specific grouping keys for each supported scope', () => {
    expect(getExternalAlertScopeContract('node').groupingKeys).toEqual([
      'alertname',
      'node_id',
    ]);
    expect(getExternalAlertScopeContract('rack').groupingKeys).toEqual([
      'alertname',
      'rack_id',
    ]);
    expect(getExternalAlertScopeContract('workload').groupingKeys).toEqual([
      'alertname',
      'workload_id',
    ]);
  });

  it('defines a query contract baseline for every v1 rule', () => {
    expect(EXTERNAL_ALERT_RULE_BASELINES.map((rule) => rule.ruleName)).toEqual([
      'NodeStale',
      'NodeCpuTempCritical',
      'NodeMemoryPressureHigh',
      'NodeDiskUsageHigh',
      'ContainerUnhealthyPresent',
      'ContainerRestarting',
      'RackCritical',
      'NodeCpuUsageHigh',
    ]);
  });

  it('ensures every rule baseline contains the required identity keys for its scope', () => {
    for (const rule of EXTERNAL_ALERT_RULE_BASELINES) {
      const contract = getExternalAlertScopeContract(rule.scopeType);

      for (const requiredKey of contract.requiredLabelKeys) {
        expect(rule.queryDerivedLabelKeys).toContain(requiredKey);
      }
    }
  });
});
