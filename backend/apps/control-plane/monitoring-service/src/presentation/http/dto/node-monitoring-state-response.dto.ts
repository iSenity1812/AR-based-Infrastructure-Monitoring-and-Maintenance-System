import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class NodeMonitoringIdentityDto {
  @ApiProperty({
    description: 'Stable node identifier used by the monitoring scope.',
    example: 'node-msi-743e182b',
  })
  id!: string;

  @ApiProperty({
    description: 'Rack identifier currently associated with the node alerts.',
    example: '6a5771e5931033f3bd53fb87',
  })
  rackId!: string;
}

export class NodeMonitoringSeverityDto {
  @ApiProperty({
    description: 'Stable numeric severity code for frontend sorting and badges.',
    example: 3,
  })
  code!: number;

  @ApiProperty({
    description: 'Human-readable severity level.',
    enum: ['none', 'warning', 'critical'],
    example: 'critical',
  })
  level!: 'none' | 'warning' | 'critical';
}

export class NodeAlertStateDto {
  @ApiProperty({
    description:
      'Operator-facing node alert status derived from active external alerts.',
    enum: ['healthy', 'alerting'],
    example: 'alerting',
  })
  state!: 'healthy' | 'alerting';

  @ApiProperty({
    description: 'Highest alert severity represented as stable code + level.',
    type: NodeMonitoringSeverityDto,
  })
  severity!: NodeMonitoringSeverityDto;

  @ApiProperty({
    description:
      'Number of active node-scoped alerts currently firing for this node.',
    example: 2,
  })
  activeAlertCount!: number;

  @ApiProperty({
    description: 'Latest timestamp when the node alert state changed.',
    nullable: true,
    example: '2026-07-15T15:16:00.000Z',
  })
  lastChangedAt!: string | null;
}

export class NodeMonitoringTimelineDto {
  @ApiProperty({
    description:
      'First timestamp when this node was observed in the current alert lineage.',
    nullable: true,
    example: '2026-07-15T15:14:30.000Z',
  })
  firstObservedAt!: string | null;

  @ApiProperty({
    description: 'Latest timestamp when this node alert posture was observed.',
    nullable: true,
    example: '2026-07-15T15:16:30.000Z',
  })
  lastObservedAt!: string | null;

  @ApiProperty({
    description:
      'Timestamp when the current active lifecycle opened. Null when resolved.',
    nullable: true,
    example: '2026-07-15T15:14:30.000Z',
  })
  openedAt!: string | null;

  @ApiProperty({
    description:
      'Timestamp when the lifecycle resolved. Null when still active.',
    nullable: true,
    example: null,
  })
  resolvedAt!: string | null;
}

export class NodeAlertSummaryBySeverityDto {
  @ApiProperty({
    description: 'Number of active critical node alerts.',
    example: 1,
  })
  critical!: number;

  @ApiProperty({
    description: 'Number of active warning node alerts.',
    example: 1,
  })
  warning!: number;
}

export class NodeAlertSummaryDto {
  @ApiProperty({
    description: 'Alert counters grouped by severity.',
    type: NodeAlertSummaryBySeverityDto,
  })
  bySeverity!: NodeAlertSummaryBySeverityDto;

  @ApiProperty({
    description: 'Fingerprint of the primary alert for lightweight correlation.',
    nullable: true,
    example: '5f6f7f15437de8fe',
  })
  primaryAlertFingerprint!: string | null;
}

export class NodeAlertIncidentLinkageDto {
  @ApiProperty({
    description: 'Incident identifier linked from manual alert escalation.',
    example: 'incident-1',
  })
  incidentId!: string;

  @ApiProperty({
    description: 'Human-readable incident code from Incident Workflow Service.',
    example: 'MON-ALERT-7A3265D5F6A9C1D2E3F4B5A6C7D8E9F0',
  })
  incidentCode!: string;

  @ApiProperty({
    description: 'Latest incident status snapshot known to Monitoring.',
    example: 'OPEN',
  })
  status!: string;

  @ApiProperty({
    description: 'Incident severity snapshot mapped from alert severity.',
    enum: ['HIGH', 'CRITICAL'],
    example: 'CRITICAL',
  })
  severity!: 'HIGH' | 'CRITICAL';

  @ApiProperty({
    description: 'Incident title snapshot for dashboard display.',
    example:
      '[node] NodeCpuTempCritical: Node node-a1 CPU temperature 94C > 90C',
  })
  title!: string;

  @ApiProperty({
    description: 'Timestamp when the incident was created.',
    example: '2026-07-16T01:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Timestamp when Monitoring linked this alert to the incident.',
    nullable: true,
    example: '2026-07-16T01:00:01.000Z',
  })
  linkedAt!: string | null;
}

export class NodeActiveAlertDto {
  @ApiProperty({
    description: 'Deduplication fingerprint of the active alert.',
    example: '5f6f7f15437de8fe',
  })
  fingerprint!: string;

  @ApiProperty({
    description: 'Alert rule name from the external alert stack.',
    example: 'NodeCpuTempCritical',
  })
  alertName!: string;

  @ApiProperty({
    description: 'Alert severity as exposed to operators.',
    enum: ['warning', 'critical'],
    example: 'critical',
  })
  severity!: 'warning' | 'critical';

  @ApiProperty({
    description: 'Alert category used for routing and UI grouping.',
    enum: [
      'availability',
      'resource',
      'thermal',
      'runtime',
      'network',
      'connectivity',
    ],
    example: 'thermal',
  })
  category!:
    | 'availability'
    | 'resource'
    | 'thermal'
    | 'runtime'
    | 'network'
    | 'connectivity';

  @ApiProperty({
    description: 'Current alert status from the external read model.',
    enum: ['firing', 'resolved'],
    example: 'firing',
  })
  status!: 'firing' | 'resolved';

  @ApiProperty({
    description: 'Short operator-facing summary of the active alert.',
    example: 'Node node-msi-743e182b CPU temperature 94.4C > 90C',
  })
  summary!: string;

  @ApiProperty({
    description: 'Longer alert description suitable for a detail panel.',
    example:
      'Node node-msi-743e182b sustained CPU temperature above threshold.',
  })
  description!: string;

  @ApiProperty({
    description: 'Timestamp when the alert started firing.',
    example: '2026-07-15T15:14:30.000Z',
  })
  startsAt!: string;

  @ApiProperty({
    description: 'Timestamp when the alert resolved, if available.',
    nullable: true,
    example: null,
  })
  endsAt!: string | null;

  @ApiProperty({
    description: 'Dashboard URL for operator drill-down when available.',
    nullable: true,
    example: '/d/monitoring-overview',
  })
  dashboardUrl!: string | null;

  @ApiProperty({
    description: 'Runbook URL for operator guidance when available.',
    nullable: true,
    example: '/docs/runbooks/alerting/node-cpu-temp-critical',
  })
  runbookUrl!: string | null;

  @ApiProperty({
    description: 'Read-side triage status for the active alert.',
    enum: ['new', 'acknowledged', 'incident_created', 'suppressed'],
    example: 'new',
  })
  triageStatus!: 'new' | 'acknowledged' | 'incident_created' | 'suppressed';

  @ApiProperty({
    description: 'Incident linkage created from manual alert escalation.',
    nullable: true,
    type: NodeAlertIncidentLinkageDto,
  })
  incident!: NodeAlertIncidentLinkageDto | null;
}

export class NodeMonitoringStateItemDto {
  @ApiProperty({
    description: 'Identity block for the node monitoring item.',
    type: NodeMonitoringIdentityDto,
  })
  node!: NodeMonitoringIdentityDto;

  @ApiProperty({
    description:
      'Consumer-first node alert state derived from active external alerts.',
    type: NodeAlertStateDto,
  })
  status!: NodeAlertStateDto;

  @ApiProperty({
    description: 'Timeline fields describing the current node alert posture.',
    type: NodeMonitoringTimelineDto,
  })
  timeline!: NodeMonitoringTimelineDto;

  @ApiProperty({
    description: 'Count summary of active node-scoped alerts.',
    type: NodeAlertSummaryDto,
  })
  alertsSummary!: NodeAlertSummaryDto;

  @ApiProperty({
    description: 'Active node-scoped alerts for drill-down rendering.',
    type: [NodeActiveAlertDto],
  })
  alerts!: NodeActiveAlertDto[];
}

export class MonitoringNodeStateResponseDto {
  @ApiProperty({
    description:
      'Timestamp when the node monitoring state payload was generated.',
    example: '2026-07-19T15:33:40.984Z',
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Contract scope identifier for the monitoring state payload.',
    example: 'node',
  })
  scope!: 'node';

  @ApiProperty({
    description:
      'Logical view identifier for the node monitoring state payload.',
    example: 'node_alert_state',
  })
  view!: 'node_alert_state';

  @ApiProperty({
    description: 'Current external-alert-backed node monitoring states.',
    type: [NodeMonitoringStateItemDto],
  })
  items!: NodeMonitoringStateItemDto[];
}

export class MonitoringNodeStateResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringNodeStateResponseDto) }],
  })
  data!: MonitoringNodeStateResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
