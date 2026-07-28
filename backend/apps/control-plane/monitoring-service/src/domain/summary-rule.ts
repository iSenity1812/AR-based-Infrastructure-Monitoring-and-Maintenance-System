import {
  type MonitoringState,
  type MonitoringScopeType,
  buildMonitoringScopeKey,
  createMonitoringState,
  deriveLifecycleStatus,
} from './monitoring-state';

export const SUMMARY_RULE_SOURCES = [
  'rack_current_summary',
  'service_current_summary',
  'node_current_summary',
  'container_current_summary',
] as const;

export type SummaryRuleSource = (typeof SUMMARY_RULE_SOURCES)[number];

export const SUMMARY_RULE_CANDIDATE_INTENTS = [
  'activate',
  'resolve',
] as const;

export type SummaryRuleCandidateIntent =
  (typeof SUMMARY_RULE_CANDIDATE_INTENTS)[number];

export interface SummaryRuleCulpritRef {
  entityId: string | null;
  metricKey: string | null;
  metricTagsJson: string | null;
  metricValueNumeric: number | null;
  metricValueText: string | null;
}

export interface SummaryRuleEvidence {
  numericIndicators: Record<string, number>;
  booleanIndicators: Record<string, boolean>;
  textIndicators: Record<string, string>;
}

export interface SummaryRuleInput {
  summarySource: SummaryRuleSource;
  scopeType: MonitoringScopeType;
  scopeId: string;
  observedAt: string;
  severityCode: number;
  overrideFlag: boolean;
  culprit: SummaryRuleCulpritRef;
  evidence: SummaryRuleEvidence;
}

export interface RackSummaryRuleInput extends SummaryRuleInput {
  summarySource: 'rack_current_summary';
  scopeType: 'rack';
}

export interface ServiceSummaryRuleInput extends SummaryRuleInput {
  summarySource: 'service_current_summary';
  scopeType: 'service';
}

export interface NodeSummaryRuleInput extends SummaryRuleInput {
  summarySource: 'node_current_summary';
  scopeType: 'node';
}

export interface ContainerSummaryRuleInput extends SummaryRuleInput {
  summarySource: 'container_current_summary';
  scopeType: 'container';
}

export interface SummaryRuleEvaluation {
  summarySource: SummaryRuleSource;
  scopeType: MonitoringScopeType;
  scopeId: string;
  scopeKey: string;
  observedAt: string;
  severityCode: number;
  overrideFlag: boolean;
  lifecycleStatus: MonitoringState['lifecycleStatus'];
  candidateIntent: SummaryRuleCandidateIntent;
  fingerprint: string;
  culprit: SummaryRuleCulpritRef;
  evidence: SummaryRuleEvidence;
  candidateState: MonitoringState;
}

interface CreateSummaryRuleInputParams {
  summarySource: SummaryRuleSource;
  scopeType: MonitoringScopeType;
  scopeId: string;
  observedAt: string;
  severityCode: number;
  overrideFlag?: boolean;
  culprit?: Partial<SummaryRuleCulpritRef>;
  evidence?: Partial<SummaryRuleEvidence>;
}

export interface CreateRackSummaryRuleInputParams
  extends Omit<
    CreateSummaryRuleInputParams,
    'summarySource' | 'scopeType' | 'scopeId'
  > {
  rackId: string;
}

export interface CreateServiceSummaryRuleInputParams
  extends Omit<
    CreateSummaryRuleInputParams,
    'summarySource' | 'scopeType' | 'scopeId'
  > {
  serviceId: string;
}

export interface CreateNodeSummaryRuleInputParams
  extends Omit<
    CreateSummaryRuleInputParams,
    'summarySource' | 'scopeType' | 'scopeId'
  > {
  nodeId: string;
}

export interface CreateContainerSummaryRuleInputParams
  extends Omit<
    CreateSummaryRuleInputParams,
    'summarySource' | 'scopeType' | 'scopeId'
  > {
  containerId: string;
}

function createSummaryRuleInput(
  params: CreateSummaryRuleInputParams,
): SummaryRuleInput {
  return {
    summarySource: params.summarySource,
    scopeType: params.scopeType,
    scopeId: params.scopeId,
    observedAt: params.observedAt,
    severityCode: params.severityCode,
    overrideFlag: params.overrideFlag ?? false,
    culprit: {
      entityId: params.culprit?.entityId ?? null,
      metricKey: params.culprit?.metricKey ?? null,
      metricTagsJson: params.culprit?.metricTagsJson ?? null,
      metricValueNumeric: params.culprit?.metricValueNumeric ?? null,
      metricValueText: params.culprit?.metricValueText ?? null,
    },
    evidence: {
      numericIndicators: params.evidence?.numericIndicators ?? {},
      booleanIndicators: params.evidence?.booleanIndicators ?? {},
      textIndicators: params.evidence?.textIndicators ?? {},
    },
  };
}

export function createRackSummaryRuleInput(
  params: CreateRackSummaryRuleInputParams,
): RackSummaryRuleInput {
  return {
    ...createSummaryRuleInput({
      ...params,
      summarySource: 'rack_current_summary',
      scopeType: 'rack',
      scopeId: params.rackId,
    }),
    summarySource: 'rack_current_summary',
    scopeType: 'rack',
  };
}

export function createServiceSummaryRuleInput(
  params: CreateServiceSummaryRuleInputParams,
): ServiceSummaryRuleInput {
  return {
    ...createSummaryRuleInput({
      ...params,
      summarySource: 'service_current_summary',
      scopeType: 'service',
      scopeId: params.serviceId,
    }),
    summarySource: 'service_current_summary',
    scopeType: 'service',
  };
}

export function createNodeSummaryRuleInput(
  params: CreateNodeSummaryRuleInputParams,
): NodeSummaryRuleInput {
  return {
    ...createSummaryRuleInput({
      ...params,
      summarySource: 'node_current_summary',
      scopeType: 'node',
      scopeId: params.nodeId,
    }),
    summarySource: 'node_current_summary',
    scopeType: 'node',
  };
}

export function createContainerSummaryRuleInput(
  params: CreateContainerSummaryRuleInputParams,
): ContainerSummaryRuleInput {
  return {
    ...createSummaryRuleInput({
      ...params,
      summarySource: 'container_current_summary',
      scopeType: 'container',
      scopeId: params.containerId,
    }),
    summarySource: 'container_current_summary',
    scopeType: 'container',
  };
}

export function buildSummaryRuleFingerprint(input: SummaryRuleInput): string {
  const scopeKey = buildMonitoringScopeKey(input.scopeType, input.scopeId);
  const culpritEntity = input.culprit.entityId ?? '-';
  const culpritMetric = input.culprit.metricKey ?? '-';

  return [
    scopeKey,
    `source:${input.summarySource}`,
    `severity:${input.severityCode}`,
    `override:${input.overrideFlag ? 1 : 0}`,
    `culprit:${culpritEntity}`,
    `metric:${culpritMetric}`,
  ].join('|');
}

export function evaluateSummaryRuleInput(
  input:
    | RackSummaryRuleInput
    | ServiceSummaryRuleInput
    | NodeSummaryRuleInput
    | ContainerSummaryRuleInput,
): SummaryRuleEvaluation {
  const lifecycleStatus = deriveLifecycleStatus(input.severityCode);
  const fingerprint = buildSummaryRuleFingerprint(input);
  const candidateState = createMonitoringState({
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    fingerprint,
    severityCode: input.severityCode,
    overrideFlag: input.overrideFlag,
    observedAt: input.observedAt,
  });

  return {
    summarySource: input.summarySource,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    scopeKey: buildMonitoringScopeKey(input.scopeType, input.scopeId),
    observedAt: input.observedAt,
    severityCode: input.severityCode,
    overrideFlag: input.overrideFlag,
    lifecycleStatus,
    candidateIntent: lifecycleStatus === 'active' ? 'activate' : 'resolve',
    fingerprint,
    culprit: input.culprit,
    evidence: input.evidence,
    candidateState,
  };
}
