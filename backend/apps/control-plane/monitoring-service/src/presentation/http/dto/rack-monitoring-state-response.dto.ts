import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class RackMonitoringRackDto {
  @ApiProperty({
    description: 'Stable rack identifier used by the monitoring scope.',
    example: 'rack-a1',
  })
  id!: string;

  @ApiProperty({
    description: 'Rack code from asset context when available.',
    example: 'RACK-A1',
  })
  rackCode!: string;

  @ApiProperty({
    description:
      'Human-friendly rack label. Falls back to rack id when enrichment is unavailable.',
    example: 'Rack A1',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Rack lifecycle state from asset context.',
    nullable: true,
    example: 'ACTIVE',
  })
  lifecycleState!: string | null;

  @ApiProperty({
    description: 'Rack capacity state from asset context.',
    nullable: true,
    example: 'AVAILABLE',
  })
  capacityState!: string | null;

  @ApiProperty({
    description: 'Site code from asset context when available.',
    nullable: true,
    example: 'DC01',
  })
  siteCode!: string | null;

  @ApiProperty({
    description: 'Room code from asset context when available.',
    nullable: true,
    example: 'ROOM-A',
  })
  roomCode!: string | null;

  @ApiProperty({
    description: 'Row code from asset context when available.',
    nullable: true,
    example: 'ROW-03',
  })
  rowCode!: string | null;

  @ApiProperty({
    description: 'Position code from asset context when available.',
    nullable: true,
    example: 'POS-12',
  })
  positionCode!: string | null;

  @ApiProperty({
    description: 'Capacity limit from asset context when available.',
    nullable: true,
    example: 42,
  })
  capacityLimit!: number | null;

  @ApiProperty({
    description: 'Optional rack notes from asset context.',
    nullable: true,
    example: null,
  })
  notes!: string | null;

  @ApiProperty({
    description: 'Rack vendor from asset context when available.',
    nullable: true,
    example: 'DELL',
  })
  vendor!: string | null;

  @ApiProperty({
    description: 'Additional rack metadata from asset context.',
    example: {},
  })
  metadata!: Record<string, unknown>;
}

export class RackMonitoringSeverityDto {
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

export class RackMonitoringNotificationStateDto {
  @ApiProperty({
    description:
      'Synchronization status between backend monitoring state and Alertmanager.',
    enum: [
      'idle',
      'pending_open',
      'open_synced',
      'pending_resolve',
      'resolve_synced',
      'sync_failed',
    ],
    example: 'open_synced',
  })
  syncStatus!:
    | 'idle'
    | 'pending_open'
    | 'open_synced'
    | 'pending_resolve'
    | 'resolve_synced'
    | 'sync_failed';

  @ApiProperty({
    description: 'Latest attempt timestamp to synchronize this state outward.',
    nullable: true,
    example: '2026-07-08T09:55:02.000Z',
  })
  lastNotificationAttemptAt!: string | null;

  @ApiProperty({
    description: 'Latest successful outward synchronization timestamp.',
    nullable: true,
    example: '2026-07-08T09:55:03.000Z',
  })
  lastNotificationSyncedAt!: string | null;
}

export class RackMonitoringTimelineDto {
  @ApiProperty({
    description:
      'First timestamp when this rack was observed in the current alert lineage.',
    nullable: true,
    example: '2026-07-08T09:55:00.000Z',
  })
  firstObservedAt!: string | null;

  @ApiProperty({
    description: 'Latest timestamp when this rack state was observed.',
    nullable: true,
    example: '2026-07-08T09:59:30.000Z',
  })
  lastObservedAt!: string | null;

  @ApiProperty({
    description:
      'Timestamp when the current active lifecycle opened. Null when resolved.',
    nullable: true,
    example: '2026-07-08T09:55:00.000Z',
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

export class RackAlertStateDto {
  @ApiProperty({
    description:
      'Operator-facing rack alert status derived from active external alerts.',
    enum: ['healthy', 'alerting'],
    example: 'alerting',
  })
  state!: 'healthy' | 'alerting';

  @ApiProperty({
    description: 'Highest alert severity represented as stable code + level.',
    type: RackMonitoringSeverityDto,
  })
  severity!: RackMonitoringSeverityDto;

  @ApiProperty({
    description:
      'Number of active rack-scoped alerts currently firing for this rack.',
    example: 2,
  })
  activeAlertCount!: number;

  @ApiProperty({
    description: 'Latest timestamp when the rack alert state changed.',
    nullable: true,
    example: '2026-07-15T14:20:00.000Z',
  })
  lastChangedAt!: string | null;

  @ApiProperty({
    description: 'Current lifecycle status derived from active alerts.',
    enum: ['active', 'resolved'],
    example: 'active',
  })
  lifecycleStatus!: 'active' | 'resolved';

  @ApiProperty({
    description: 'Whether the current state should be treated as override-worthy.',
    example: true,
  })
  override!: boolean;
}

export class RackAlertSummaryBySeverityDto {
  @ApiProperty({
    description: 'Number of active critical rack alerts.',
    example: 1,
  })
  critical!: number;

  @ApiProperty({
    description: 'Number of active warning rack alerts.',
    example: 1,
  })
  warning!: number;
}

export class RackAlertSummaryDto {
  @ApiProperty({
    description: 'Alert counters grouped by severity.',
    type: RackAlertSummaryBySeverityDto,
  })
  bySeverity!: RackAlertSummaryBySeverityDto;

  @ApiProperty({
    description: 'Fingerprint of the primary alert for lightweight correlation.',
    nullable: true,
    example: '56b08c98fd42c43a',
  })
  primaryAlertFingerprint!: string | null;
}

export class RackAlertIncidentLinkageDto {
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
    example: '[rack] RackSignalLossPresent: Rack A1 signal loss',
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

export class RackActiveAlertDto {
  @ApiProperty({
    description: 'Deduplication fingerprint of the active alert.',
    example: '56b08c98fd42c43a',
  })
  fingerprint!: string;

  @ApiProperty({
    description: 'Alert rule name from the external alert stack.',
    example: 'RackSignalLossPresent',
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
    example: 'connectivity',
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
    example: 'Rack A1 signal loss with 1 silent node(s)',
  })
  summary!: string;

  @ApiProperty({
    description: 'Timestamp when the alert started firing.',
    example: '2026-07-15T14:20:00.000Z',
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
    example: '/docs/runbooks/alerting/rack-signal-loss-present',
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
    type: RackAlertIncidentLinkageDto,
  })
  incident!: RackAlertIncidentLinkageDto | null;
}

export class RackMonitoringStateItemDto {
  @ApiProperty({
    description: 'Static rack profile enriched from asset context.',
    type: RackMonitoringRackDto,
  })
  rack!: RackMonitoringRackDto;

  @ApiProperty({
    description:
      'Consumer-first rack alert state derived from active external alerts.',
    type: RackAlertStateDto,
  })
  status!: RackAlertStateDto;

  @ApiProperty({
    description: 'Timeline fields describing the current rack alert posture.',
    type: RackMonitoringTimelineDto,
  })
  timeline!: RackMonitoringTimelineDto;

  @ApiProperty({
    description: 'Count summary of active rack-scoped alerts.',
    type: RackAlertSummaryDto,
  })
  alertsSummary!: RackAlertSummaryDto;

  @ApiProperty({
    description: 'Active rack-scoped alerts for drill-down rendering.',
    type: [RackActiveAlertDto],
  })
  alerts!: RackActiveAlertDto[];

  @ApiProperty({
    description: 'Alert synchronization state for this rack.',
    type: RackMonitoringNotificationStateDto,
  })
  notification!: RackMonitoringNotificationStateDto;
}

export class MonitoringRackStateResponseDto {
  @ApiProperty({
    description:
      'Timestamp when the rack monitoring state payload was generated.',
    example: '2026-07-08T10:00:00.000Z',
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Contract scope identifier for the monitoring state payload.',
    example: 'rack',
  })
  scope!: 'rack';

  @ApiProperty({
    description: 'Logical view identifier for the monitoring state payload.',
    example: 'monitoring_state',
  })
  view!: 'monitoring_state';

  @ApiProperty({
    description: 'Current backend-owned rack monitoring states.',
    type: [RackMonitoringStateItemDto],
  })
  items!: RackMonitoringStateItemDto[];
}

export class MonitoringRackStateResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringRackStateResponseDto) }],
  })
  data!: MonitoringRackStateResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
