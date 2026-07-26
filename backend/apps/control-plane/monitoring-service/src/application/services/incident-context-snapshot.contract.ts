import type { AlertCurrentState } from '../../domain/alert-current-state';

export interface IncidentContextSnapshot {
  schemaVersion: 'incident.context.v1';
  capturedAt: string;
  window: {
    from: string;
    to: string;
    interval: '1m';
  };
  completeness: 'complete' | 'partial' | 'minimal';
  unavailableSources: IncidentContextUnavailableSource[];
  alert: IncidentAlertEvidence;
  scope: IncidentScopeReference;
  asset?: IncidentAssetSnapshot;
  observedHardware?: IncidentObservedHardwareSnapshot;
  condition?: IncidentNodeConditionSnapshot;
  impact?: IncidentImpactSnapshot;
  metricEvidence: IncidentMetricEvidence[];
  sourceRefs: IncidentContextSourceRef[];
}

export interface IncidentContextUnavailableSource {
  source: string;
  reasonCode: string;
}

export interface IncidentAlertEvidence {
  fingerprint: string;
  alertName: string;
  category: AlertCurrentState['category'];
  severity: AlertCurrentState['severity'];
  metricKey: string | null;
  currentValue: string | null;
  threshold: string | null;
  startsAt: string;
  summary: string;
}

export interface IncidentScopeReference {
  scopeType: AlertCurrentState['scopeType'];
  scopeId: string;
  rackId?: string;
}

export interface IncidentAssetSnapshot {
  nodeCode?: string;
  rackId?: string;
  rackCode?: string;
  displayName: string;
  hostname?: string;
  serialNumber?: string;
  vendor?: string;
  model?: string;
  managementIp?: string;
  siteCode?: string;
  roomCode?: string;
  rack?: {
    rackId: string;
    rackCode: string;
    displayName: string;
    siteCode?: string;
    roomCode?: string;
  };
}

export interface IncidentObservedHardwareSnapshot {
  observedAt: string;
  osProduct?: string;
  primaryIpv4?: string;
  macAddress?: string;
  logicalCpuCount?: number;
  cpuArchitecture?: string;
  cpuModel?: string;
  gpuModelPrimary?: string;
  hardwareSerial?: string;
  motherboardModel?: string;
  ssdModelPrimary?: string;
  batteryModel?: string;
}

export interface IncidentNodeConditionSnapshot {
  observedAt: string;
  healthCode: number;
  operationalSeverityCode: number;
  signalSeverityCode: number;
  isStale: boolean;
  lastHeartbeatAt?: string;
  staleAgeSec?: number;
  staleAfterSec?: number;
  policyVersion?: number;
  worstMetric?: {
    metricKey: string;
    valueNumeric?: number;
    valueText?: string;
  };
}

export interface IncidentImpactSnapshot {
  affectedNodeCount: number;
  totalNodeCount: number;
  affectedRatio: number;
}

export interface IncidentMetricEvidence {
  metricKey: string;
  label?: string;
  unit?: string;
  windowMin?: number | null;
  windowMax?: number | null;
  windowAvg?: number | null;
  lastValueNumeric?: number | null;
  lastValueText?: string | null;
}

export interface IncidentContextSourceRef {
  system: string;
  dataset: string;
  observedAt?: string;
  policyVersion?: number;
}

export interface IncidentContextNodeCurrentConditionRecord {
  summaryTs: string;
  healthCode: number;
  operationalSeverityCode: number;
  signalSeverityCode: number;
  isAnyStale: boolean;
  staleMetricCount: number;
  warningMetricCount: number;
  criticalMetricCount: number;
  worstMetricKey?: string | null;
  worstMetricValueNumeric?: number | null;
  worstMetricValueText?: string | null;
}

export interface IncidentContextNodeHeartbeatRecord {
  metricKey: string;
  latestTs?: string | null;
  staleAgeSec?: number | null;
  freshnessCode?: number | null;
  liveState?: string | null;
  severityCode?: number | null;
}

export interface IncidentContextObservedHardwareRecord {
  observedAt: string;
  osProduct?: string | null;
  primaryIpv4?: string | null;
  macAddress?: string | null;
  logicalCpuCount?: number | null;
  cpuArchitecture?: string | null;
  cpuModel?: string | null;
  gpuModelPrimary?: string | null;
  hardwareSerial?: string | null;
  motherboardModel?: string | null;
  ssdModelPrimary?: string | null;
  batteryModel?: string | null;
}

export interface IncidentContextMetricEvidenceRecord {
  metricKey: string;
  unit?: string | null;
  label?: string | null;
  windowMin?: number | null;
  windowMax?: number | null;
  windowAvg?: number | null;
  lastValueNumeric?: number | null;
  lastValueText?: string | null;
}

export interface IncidentContextMetricPolicyRecord {
  metricKey: string;
  policyVersion?: number | null;
  staleAfterSec?: number | null;
}

export interface IncidentContextNodeDataRecord {
  currentCondition?: IncidentContextNodeCurrentConditionRecord | null;
  heartbeat?: IncidentContextNodeHeartbeatRecord | null;
  observedHardware?: IncidentContextObservedHardwareRecord | null;
  metricEvidence?: IncidentContextMetricEvidenceRecord | null;
  heartbeatPolicy?: IncidentContextMetricPolicyRecord | null;
}

export interface IncidentContextNodeLivenessRecord {
  nodeId: string;
  lastHeartbeatAt?: string | null;
  staleAgeSec?: number | null;
  sourceLiveState?: string | null;
  staleAfterSec?: number | null;
  policyVersion?: number | null;
}

export interface InvestigationMetricPointRecord {
  timestamp: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  severityCode?: number | null;
}

export interface InvestigationMetricSeriesRecord {
  metricKey: string;
  label?: string | null;
  unit?: string | null;
  points: InvestigationMetricPointRecord[];
}

export interface IncidentContextRackCurrentRecord {
  summaryTs: string;
  rackSeverityCode: number;
  totalNodes: number;
  badNodes: number;
  criticalNodes: number;
  warningNodes: number;
  staleNodes: number;
  silentDeadNodes: number;
  badNodeRatio: number;
  isRackLevelFailure: boolean;
  hasSignalLoss: boolean;
  worstNodeId?: string | null;
  worstMetricKey?: string | null;
  worstMetricValueNumeric?: number | null;
  worstMetricValueText?: string | null;
}

export interface IncidentContextRackHistoryRecord {
  bucketStart: string;
  summaryTs: string;
  rackSeverityCode: number;
  totalNodes: number;
  badNodes: number;
  criticalNodes: number;
  warningNodes: number;
  badNodeRatio: number;
  isRackLevelFailure: boolean;
  worstNodeId?: string | null;
  worstMetricKey?: string | null;
  worstMetricValueNumeric?: number | null;
  worstMetricValueText?: string | null;
}

export interface IncidentContextNodeInvestigationRecord
  extends IncidentContextNodeDataRecord {
  metricSeries: InvestigationMetricSeriesRecord[];
}

export interface IncidentContextRackInvestigationRecord {
  current?: IncidentContextRackCurrentRecord | null;
  history: IncidentContextRackHistoryRecord[];
}
