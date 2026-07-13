export const EXTERNAL_ALERT_SCOPE_TYPES = [
  'node',
  'rack',
  'workload',
] as const;

export type ExternalAlertScopeType =
  (typeof EXTERNAL_ALERT_SCOPE_TYPES)[number];

export const EXTERNAL_ALERT_SEVERITIES = ['warning', 'critical'] as const;

export type ExternalAlertSeverity = (typeof EXTERNAL_ALERT_SEVERITIES)[number];

export const EXTERNAL_ALERT_CATEGORIES = [
  'availability',
  'resource',
  'thermal',
  'runtime',
] as const;

export type ExternalAlertCategory = (typeof EXTERNAL_ALERT_CATEGORIES)[number];

export type ExternalAlertCommonLabels = {
  alertname: string;
  severity: ExternalAlertSeverity;
  scope_type: ExternalAlertScopeType;
  environment: string;
  team: string;
  category: ExternalAlertCategory;
  source: 'grafana';
};

export type ExternalAlertScopeLabels =
  | {
      node_id: string;
      rack_id: string;
    }
  | {
      rack_id: string;
    }
  | {
      workload_id: string;
      node_id: string;
      rack_id: string;
    };

export type ExternalAlertLabels = ExternalAlertCommonLabels &
  Partial<{
    node_id: string;
    rack_id: string;
    workload_id: string;
  }>;

export interface ExternalAlertAnnotations {
  summary: string;
  description: string;
  metric_key: string;
  observed_window: string;
  dashboard_url: string;
  runbook_url: string;
  current_value?: string;
  threshold?: string;
}

export interface ExternalAlertScopeContract {
  requiredLabelKeys: readonly string[];
  groupingKeys: readonly string[];
  inhibitionIdentityKeys: readonly string[];
}

export const EXTERNAL_ALERT_SCOPE_CONTRACTS: Record<
  ExternalAlertScopeType,
  ExternalAlertScopeContract
> = {
  node: {
    requiredLabelKeys: ['node_id', 'rack_id'],
    groupingKeys: ['alertname', 'node_id'],
    inhibitionIdentityKeys: ['node_id'],
  },
  rack: {
    requiredLabelKeys: ['rack_id'],
    groupingKeys: ['alertname', 'rack_id'],
    inhibitionIdentityKeys: ['rack_id'],
  },
  workload: {
    requiredLabelKeys: ['workload_id', 'node_id', 'rack_id'],
    groupingKeys: ['alertname', 'workload_id'],
    inhibitionIdentityKeys: ['workload_id'],
  },
};

export interface ExternalAlertRuleBaseline {
  ruleName: string;
  scopeType: ExternalAlertScopeType;
  sourceViews: readonly string[];
  queryOutputFields: readonly string[];
  queryDerivedLabelKeys: readonly string[];
  constantLabels: Readonly<{
    severity: ExternalAlertSeverity;
    category: ExternalAlertCategory;
    source: 'grafana';
  }>;
  annotationFields: readonly string[];
}

export const EXTERNAL_ALERT_RULE_BASELINES: readonly ExternalAlertRuleBaseline[] =
  [
    {
      ruleName: 'NodeStale',
      scopeType: 'node',
      sourceViews: ['telemetry_db.node_current_summary'],
      queryOutputFields: ['node_id', 'rack_id', 'summary_ts'],
      queryDerivedLabelKeys: ['node_id', 'rack_id'],
      constantLabels: {
        severity: 'warning',
        category: 'availability',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'NodeCpuTempCritical',
      scopeType: 'node',
      sourceViews: ['telemetry_db.node_summary_trend_1m'],
      queryOutputFields: [
        'node_id',
        'rack_id',
        'cpu_temperature_c_current',
        'summary_ts',
      ],
      queryDerivedLabelKeys: ['node_id', 'rack_id'],
      constantLabels: {
        severity: 'critical',
        category: 'thermal',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'current_value',
        'threshold',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'NodeMemoryPressureHigh',
      scopeType: 'node',
      sourceViews: ['telemetry_db.node_summary_trend_1m'],
      queryOutputFields: [
        'node_id',
        'rack_id',
        'memory_used_pct_current',
        'summary_ts',
      ],
      queryDerivedLabelKeys: ['node_id', 'rack_id'],
      constantLabels: {
        severity: 'critical',
        category: 'resource',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'current_value',
        'threshold',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'NodeDiskUsageHigh',
      scopeType: 'node',
      sourceViews: [
        'telemetry_db.node_summary_trend_1m',
        'telemetry_db.node_current_summary',
      ],
      queryOutputFields: [
        'node_id',
        'rack_id',
        'disk_used_pct_max_current',
        'summary_ts',
      ],
      queryDerivedLabelKeys: ['node_id', 'rack_id'],
      constantLabels: {
        severity: 'warning',
        category: 'resource',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'current_value',
        'threshold',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'ContainerUnhealthyPresent',
      scopeType: 'node',
      sourceViews: ['telemetry_db.container_current_summary'],
      queryOutputFields: ['node_id', 'rack_id', 'unhealthy_container_count'],
      queryDerivedLabelKeys: ['node_id', 'rack_id'],
      constantLabels: {
        severity: 'warning',
        category: 'runtime',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'ContainerRestarting',
      scopeType: 'workload',
      sourceViews: [
        'telemetry_db.container_current_summary',
        'telemetry_db.container_summary_trend_1m',
      ],
      queryOutputFields: [
        'workload_id',
        'node_id',
        'rack_id',
        'restart_count_current',
      ],
      queryDerivedLabelKeys: ['workload_id', 'node_id', 'rack_id'],
      constantLabels: {
        severity: 'warning',
        category: 'runtime',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'current_value',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'RackCritical',
      scopeType: 'rack',
      sourceViews: ['telemetry_db.rack_current_summary', 'derived-node-aggregate'],
      queryOutputFields: ['rack_id', 'critical_node_count', 'stale_node_count'],
      queryDerivedLabelKeys: ['rack_id'],
      constantLabels: {
        severity: 'critical',
        category: 'availability',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
    {
      ruleName: 'NodeCpuUsageHigh',
      scopeType: 'node',
      sourceViews: ['telemetry_db.node_summary_trend_1m'],
      queryOutputFields: ['node_id', 'rack_id', 'cpu_usage_pct_current', 'summary_ts'],
      queryDerivedLabelKeys: ['node_id', 'rack_id'],
      constantLabels: {
        severity: 'critical',
        category: 'resource',
        source: 'grafana',
      },
      annotationFields: [
        'summary',
        'description',
        'metric_key',
        'current_value',
        'threshold',
        'observed_window',
        'dashboard_url',
        'runbook_url',
      ],
    },
  ] as const;

export function getExternalAlertScopeContract(
  scopeType: ExternalAlertScopeType,
): ExternalAlertScopeContract {
  return EXTERNAL_ALERT_SCOPE_CONTRACTS[scopeType];
}

