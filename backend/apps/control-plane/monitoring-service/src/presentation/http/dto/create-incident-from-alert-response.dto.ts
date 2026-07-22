import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IncidentCreatorSummaryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiProperty({
    enum: ['monitoring_alert_handoff', 'incident_console', 'system'],
  })
  source!: 'monitoring_alert_handoff' | 'incident_console' | 'system';
}

export class AlertIncidentSourceSummaryDto {
  @ApiProperty()
  alertName!: string;

  @ApiProperty({ enum: ['node', 'rack', 'workload', 'service'] })
  scopeType!: 'node' | 'rack' | 'workload' | 'service';

  @ApiPropertyOptional()
  nodeId?: string;

  @ApiPropertyOptional()
  rackId?: string;

  @ApiPropertyOptional()
  workloadId?: string;

  @ApiPropertyOptional()
  serviceId?: string;

  @ApiProperty({ enum: ['warning', 'critical'] })
  severity!: 'warning' | 'critical';

  @ApiProperty({ enum: ['firing', 'resolved'] })
  status!: 'firing' | 'resolved';

  @ApiProperty()
  category!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  startsAt!: string;

  @ApiProperty()
  lastReceivedAt!: string;
}

export class IncidentLinkageSummaryDto {
  @ApiProperty()
  incidentId!: string;

  @ApiProperty()
  incidentCode!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ enum: ['HIGH', 'CRITICAL'] })
  severity!: 'HIGH' | 'CRITICAL';

  @ApiProperty()
  title!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  linkedAt!: string;

  @ApiPropertyOptional({ type: IncidentCreatorSummaryDto })
  createdBy?: IncidentCreatorSummaryDto;
}

export class CreateIncidentFromAlertResponseDto {
  @ApiProperty()
  fingerprint!: string;

  @ApiProperty({ enum: ['created', 'already_linked', 'linked_existing'] })
  action!: 'created' | 'already_linked' | 'linked_existing';

  @ApiProperty({ enum: ['incident_created'] })
  triageStatus!: 'incident_created';

  @ApiProperty({ type: AlertIncidentSourceSummaryDto })
  alert!: AlertIncidentSourceSummaryDto;

  @ApiProperty({ type: IncidentLinkageSummaryDto })
  incident!: IncidentLinkageSummaryDto;
}

export class CreateIncidentFromAlertResponseEnvelopeDto {
  @ApiProperty({ type: CreateIncidentFromAlertResponseDto })
  data!: CreateIncidentFromAlertResponseDto;
}
