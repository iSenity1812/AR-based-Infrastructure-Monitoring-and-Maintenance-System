import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class NodeAlertStateDto {
  @ApiProperty({
    description: 'Operator-facing node alert status derived from active external alerts.',
    enum: ['healthy', 'alerting'],
    example: 'alerting',
  })
  status!: 'healthy' | 'alerting';

  @ApiProperty({
    description: 'Highest external alert severity currently affecting this node.',
    enum: ['none', 'warning', 'critical'],
    example: 'critical',
  })
  highestSeverity!: 'none' | 'warning' | 'critical';

  @ApiProperty({
    description: 'Number of active node-scoped alerts currently firing for this node.',
    example: 2,
  })
  activeAlertCount!: number;

  @ApiProperty({
    description: 'Latest timestamp when the node alert state changed.',
    nullable: true,
    example: '2026-07-15T15:14:30.000Z',
  })
  lastChangedAt!: string | null;
}

export class NodeAlertSummaryDto {
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

export class NodePrimaryAlertDto {
  @ApiProperty({
    description: 'Deduplication fingerprint of the selected primary alert.',
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
    description: 'Short operator-facing summary of the alert.',
    example: 'Node node-msi-743e182b CPU temperature 94.4C > 90C',
  })
  summary!: string;

  @ApiProperty({
    description: 'Longer alert description suitable for a detail panel.',
    example: 'Node node-msi-743e182b sustained CPU temperature above threshold.',
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
    description: 'Timestamp when the alert started firing.',
    example: '2026-07-15T15:14:30.000Z',
  })
  startsAt!: string;
}

export class NodeMonitoringStateItemDto {
  @ApiProperty({
    description: 'Stable node identifier used by the monitoring scope.',
    example: 'node-msi-743e182b',
  })
  nodeId!: string;

  @ApiProperty({
    description: 'Rack identifier carried by the node alert labels.',
    example: '6a5771e5931033f3bd53fb87',
  })
  rackId!: string;

  @ApiProperty({
    description: 'Consumer-first node alert state derived from active external alerts.',
    type: NodeAlertStateDto,
  })
  state!: NodeAlertStateDto;

  @ApiProperty({
    description: 'Count summary of active node-scoped alerts.',
    type: NodeAlertSummaryDto,
  })
  alertSummary!: NodeAlertSummaryDto;

  @ApiProperty({
    description: 'Most important active alert selected for this node.',
    nullable: true,
    type: NodePrimaryAlertDto,
  })
  primaryAlert!: NodePrimaryAlertDto | null;

  @ApiProperty({
    description: 'Active node-scoped alerts for drill-down rendering.',
    type: [NodeActiveAlertDto],
  })
  activeAlerts!: NodeActiveAlertDto[];
}

export class MonitoringNodeStateResponseDto {
  @ApiProperty({
    description: 'Timestamp when the node monitoring state payload was generated.',
    example: '2026-07-15T15:16:59.298Z',
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Contract scope identifier for the monitoring state payload.',
    example: 'node',
  })
  scope!: 'node';

  @ApiProperty({
    description: 'Logical view identifier for the node monitoring state payload.',
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
