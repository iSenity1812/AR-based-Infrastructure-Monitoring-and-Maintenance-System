import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class RackOverviewCountsDto {
  @ApiProperty({
    description: 'Total number of racks visible to the caller.',
    example: 48,
  })
  total!: number;

  @ApiProperty({
    description: 'Number of racks currently in critical severity.',
    example: 6,
  })
  critical!: number;

  @ApiProperty({
    description: 'Number of racks currently in warning severity.',
    example: 11,
  })
  warning!: number;

  @ApiProperty({
    description:
      'Number of racks that currently show stale nodes or signal-loss symptoms.',
    example: 3,
  })
  stale!: number;

  @ApiProperty({
    description: 'Number of racks currently flagged with signal loss.',
    example: 2,
  })
  signalLoss!: number;

  @ApiProperty({
    description: 'Number of racks currently flagged as rack-level failures.',
    example: 4,
  })
  rackLevelFailure!: number;
}

export class RackOverviewOverviewDto {
  @ApiProperty({
    description: 'Top-level rack counters for the current overview.',
    type: RackOverviewCountsDto,
  })
  counts!: RackOverviewCountsDto;
}

export class RackOverviewRiskCardRackDto {
  @ApiProperty({
    description: 'Stable rack identifier from topology.',
    example: 'rack-a1',
  })
  id!: string;

  @ApiProperty({
    description:
      'Human-friendly rack label. Falls back to the rack identifier when enrichment is unavailable.',
    example: 'Local Lab 01',
  })
  name!: string;

  @ApiProperty({
    description: 'Rack code from asset context or fallback identifier.',
    example: 'LOCAL-LAB-01',
  })
  code!: string;
}

export class RackOverviewRiskCardStatusDto {
  @ApiProperty({
    description: 'Consumer-friendly rack severity label.',
    enum: ['normal', 'warning', 'critical'],
    example: 'critical',
  })
  severity!: 'normal' | 'warning' | 'critical';

  @ApiProperty({
    description:
      'Whether the rack contains an override-worthy critical condition.',
    example: true,
  })
  override!: boolean;

  @ApiProperty({
    description:
      'Whether the current blast radius is broad enough to classify a rack-level failure.',
    example: true,
  })
  rackLevelFailure!: boolean;

  @ApiProperty({
    description:
      'Whether the rack currently exhibits silent-death or signal-loss symptoms.',
    example: false,
  })
  signalLoss!: boolean;

  @ApiProperty({
    description:
      'Number of nodes currently considered stale or missing recent telemetry.',
    example: 0,
  })
  staleNodes!: number;
}

export class RackOverviewRiskCardMetricsDto {
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
    description: 'Current ratio of bad nodes over total nodes in the rack.',
    example: 0.5417,
  })
  badNodeRatio!: number;
}

export class RackOverviewRiskCardMetricValueDto {
  @ApiProperty({
    description: 'Numeric value of the culprit metric when available.',
    example: 98.4,
  })
  numeric!: number;

  @ApiProperty({
    description: 'Text representation of the culprit metric value.',
    example: '98.4',
  })
  text!: string;
}

export class RackOverviewRiskCardMetricDto {
  @ApiProperty({
    description: 'Metric key currently driving the rack risk posture.',
    example: 'node.memory_used_pct',
  })
  key!: string;

  @ApiProperty({
    description: 'Parsed metric tags associated with the culprit metric.',
    type: 'object',
    additionalProperties: true,
    example: { host: 'node-17' },
  })
  tags!: Record<string, unknown>;

  @ApiProperty({
    description: 'Current culprit metric value.',
    type: RackOverviewRiskCardMetricValueDto,
  })
  value!: RackOverviewRiskCardMetricValueDto;
}

export class RackOverviewRiskCardCulpritDto {
  @ApiProperty({
    description: 'Node identifier currently considered the rack-level culprit.',
    example: 'node-17',
  })
  nodeId!: string;

  @ApiProperty({
    description: 'Metric details associated with the rack-level culprit.',
    type: RackOverviewRiskCardMetricDto,
  })
  metric!: RackOverviewRiskCardMetricDto;
}

export class RackOverviewRiskCardTrendDto {
  @ApiProperty({
    description:
      'Current severity minus the latest previous 1-minute severity snapshot.',
    example: 1,
  })
  delta1m!: number;

  @ApiProperty({
    description:
      'Current severity minus the latest previous 5-minute severity snapshot.',
    example: 2,
  })
  delta5m!: number;

  @ApiPropertyOptional({
    description:
      'Seconds since the current rack risk posture began. Null when history is unavailable.',
    example: 42,
  })
  lastChangeAgeSec?: number | null;
}

export class RackOverviewRiskCardLocationDto {
  @ApiPropertyOptional({
    description: 'Physical site code of the rack.',
    example: 'MY-HOME',
  })
  site?: string;

  @ApiPropertyOptional({
    description: 'Room code of the rack.',
    example: 'ROOM-01',
  })
  room?: string;

  @ApiPropertyOptional({
    description: 'Zone code of the rack.',
    example: 'ZONE-1',
  })
  zone?: string;

  @ApiPropertyOptional({
    description: 'Row code of the rack.',
    example: 'ROW-1',
  })
  row?: string;

  @ApiPropertyOptional({
    description: 'Position code of the rack inside the row.',
    example: 'P-1',
  })
  position?: string;
}

export class RackOverviewRiskCardDto {
  @ApiProperty({
    description: 'Rack identity and display information for the risk card.',
    type: RackOverviewRiskCardRackDto,
  })
  rack!: RackOverviewRiskCardRackDto;

  @ApiProperty({
    description: 'Consumer-friendly operational status for the rack.',
    type: RackOverviewRiskCardStatusDto,
  })
  status!: RackOverviewRiskCardStatusDto;

  @ApiProperty({
    description: 'Node-level blast-radius metrics for the rack.',
    type: RackOverviewRiskCardMetricsDto,
  })
  metrics!: RackOverviewRiskCardMetricsDto;

  @ApiProperty({
    description: 'Primary culprit explanation for the rack risk posture.',
    type: RackOverviewRiskCardCulpritDto,
  })
  culprit!: RackOverviewRiskCardCulpritDto;

  @ApiProperty({
    description: 'Historical trend information for the rack risk posture.',
    type: RackOverviewRiskCardTrendDto,
  })
  trend!: RackOverviewRiskCardTrendDto;

  @ApiProperty({
    description: 'Timestamp when the current rack summary was produced.',
    example: '2026-07-01 10:15:00',
  })
  updatedAt!: string;

  @ApiProperty({
    description: 'Physical location details for the rack.',
    type: RackOverviewRiskCardLocationDto,
  })
  location!: RackOverviewRiskCardLocationDto;
}

export class RackOverviewRackListDto {
  @ApiProperty({
    description: 'Operational sort order applied to the returned rack list.',
    example: [
      'severity',
      'rackLevelFailure',
      'signalLoss',
      'badNodeRatio',
      'staleNodes',
      'updatedAt',
      'rackId',
    ],
    type: [String],
  })
  sort!: string[];
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
    type: RackOverviewOverviewDto,
  })
  overview!: RackOverviewOverviewDto;

  @ApiProperty({
    description: 'Backend-derived subset of the highest-risk racks.',
    type: [RackOverviewRiskCardDto],
  })
  riskCards!: RackOverviewRiskCardDto[];

  @ApiProperty({
    description: 'Full rack list payload for the overview screen.',
    type: RackOverviewRackListDto,
  })
  rackList!: RackOverviewRackListDto;

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
