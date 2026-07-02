import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class RackOverviewSummaryDto {
  @ApiProperty({
    description: 'Total number of racks visible to the caller.',
    example: 48,
  })
  totalRacks!: number;

  @ApiProperty({
    description: 'Number of racks currently in critical severity.',
    example: 6,
  })
  criticalRacks!: number;

  @ApiProperty({
    description: 'Number of racks currently in warning severity.',
    example: 11,
  })
  warningRacks!: number;

  @ApiProperty({
    description:
      'Number of racks that currently show stale nodes or signal-loss symptoms.',
    example: 3,
  })
  staleRacks!: number;

  @ApiProperty({
    description: 'Number of racks currently flagged with signal loss.',
    example: 2,
  })
  signalLossRacks!: number;

  @ApiProperty({
    description: 'Number of racks currently flagged as rack-level failures.',
    example: 4,
  })
  rackLevelFailureRacks!: number;
}

export class RackOverviewItemDto {
  @ApiProperty({
    description: 'Stable rack identifier from topology.',
    example: 'rack-a1',
  })
  rackId!: string;

  @ApiProperty({
    description:
      'Human-friendly rack label. Falls back to rackId when enrichment is unavailable.',
    example: 'Rack A1',
  })
  rackName!: string;

  @ApiProperty({
    description: 'Timestamp when the current rack summary was produced.',
    example: '2026-07-01T10:15:00+07:00',
  })
  summaryTs!: string;

  @ApiProperty({
    description: 'Current rack severity code from the serving layer.',
    enum: [0, 2, 3],
    example: 3,
  })
  rackSeverityCode!: 0 | 2 | 3;

  @ApiProperty({
    description:
      'Whether the rack contains an override-worthy critical condition.',
    example: 1,
  })
  hasOverrideFlag!: 0 | 1;

  @ApiProperty({
    description: 'Total number of nodes currently mapped to the rack.',
    example: 24,
  })
  totalNodes!: number;

  @ApiProperty({
    description:
      'Number of nodes with severity >= 2 in the current rack snapshot.',
    example: 13,
  })
  badNodes!: number;

  @ApiProperty({
    description: 'Number of nodes currently in critical severity.',
    example: 5,
  })
  criticalNodes!: number;

  @ApiProperty({
    description: 'Number of nodes currently in warning severity.',
    example: 8,
  })
  warningNodes!: number;

  @ApiProperty({
    description:
      'Number of nodes currently considered stale or missing recent telemetry.',
    example: 2,
  })
  staleNodes!: number;

  @ApiProperty({
    description: 'Current ratio of bad nodes over total nodes in the rack.',
    example: 0.5417,
  })
  badNodeRatio!: number;

  @ApiProperty({
    description:
      'Whether the current blast radius is broad enough to classify a rack-level failure.',
    example: 1,
  })
  isRackLevelFailure!: 0 | 1;

  @ApiProperty({
    description:
      'Whether the rack currently exhibits silent-death or signal-loss symptoms.',
    example: 1,
  })
  hasSignalLoss!: 0 | 1;

  @ApiProperty({
    description: 'Node identifier currently considered the rack-level culprit.',
    example: 'node-17',
  })
  worstNodeId!: string;

  @ApiProperty({
    description: 'Metric key currently driving the rack risk posture.',
    example: 'cpu_usage_pct',
  })
  worstMetricKey!: string;

  @ApiProperty({
    description: 'Serialized metric tags associated with the culprit metric.',
    example: '{"host":"node-17"}',
  })
  worstMetricTagsJson!: string;

  @ApiProperty({
    description:
      'Numeric value of the culprit metric when available. Uses 0 when absent.',
    example: 98.4,
  })
  worstMetricValueNumeric!: number;

  @ApiProperty({
    description:
      'Text representation of the culprit metric value when available.',
    example: '98.4',
  })
  worstMetricValueText!: string;

  @ApiProperty({
    description:
      'Current severity minus the latest previous 1-minute severity snapshot.',
    example: 1,
  })
  severityTrendDelta1m!: number;

  @ApiProperty({
    description:
      'Current severity minus the latest previous 5-minute severity snapshot.',
    example: 2,
  })
  severityTrendDelta5m!: number;

  @ApiPropertyOptional({
    description:
      'Seconds since the current rack risk posture began. Null when history is unavailable.',
    example: 42,
  })
  lastChangeAgeSec?: number | null;
}

export class RackOverviewGridDto {
  @ApiProperty({
    description: 'Operational sort order applied to the returned rack grid.',
    example: [
      'rack_severity_code_desc',
      'is_rack_level_failure_desc',
      'has_signal_loss_desc',
      'bad_node_ratio_desc',
      'stale_nodes_desc',
      'summary_ts_desc',
      'rack_id_asc',
    ],
    type: [String],
  })
  sortBy!: string[];

  @ApiProperty({
    description: 'All rack cards visible to the current caller.',
    type: [RackOverviewItemDto],
  })
  items!: RackOverviewItemDto[];
}

export class RackOverviewFiltersDto {
  @ApiProperty({
    description: 'Severity filter values supported by the UI.',
    example: ['critical', 'warning', 'stale', 'normal'],
    type: [String],
  })
  severity!: string[];

  @ApiProperty({
    description: 'Whether the result set is restricted to rack-level failures.',
    example: false,
  })
  onlyFailure!: boolean;

  @ApiProperty({
    description: 'Whether the result set is restricted to signal-loss racks.',
    example: false,
  })
  onlySignalLoss!: boolean;
}

export class MonitoringRackOverviewResponseDto {
  @ApiProperty({
    description: 'Timestamp when the overview payload was generated.',
    example: '2026-07-01T10:15:00+07:00',
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Contract scope identifier for the dashboard payload.',
    example: 'rack',
  })
  scope!: 'rack';

  @ApiProperty({
    description: 'Logical view identifier for the response payload.',
    example: 'operator_dashboard',
  })
  view!: 'operator_dashboard';

  @ApiProperty({
    description: 'Top-level rack counters for the current overview.',
    type: RackOverviewSummaryDto,
  })
  summary!: RackOverviewSummaryDto;

  @ApiProperty({
    description: 'Backend-derived subset of the highest-risk racks.',
    type: [RackOverviewItemDto],
  })
  topRiskRacks!: RackOverviewItemDto[];

  @ApiProperty({
    description: 'Full rack grid payload for the overview screen.',
    type: RackOverviewGridDto,
  })
  rackGrid!: RackOverviewGridDto;

  @ApiProperty({
    description: 'Filter options and defaults supported by the UI.',
    type: RackOverviewFiltersDto,
  })
  filters!: RackOverviewFiltersDto;
}

export class MonitoringRackOverviewResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringRackOverviewResponseDto) }],
  })
  data!: MonitoringRackOverviewResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
