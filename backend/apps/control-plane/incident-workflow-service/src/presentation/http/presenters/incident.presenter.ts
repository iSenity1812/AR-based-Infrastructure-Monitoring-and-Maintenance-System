import type { IncidentEntity } from '@domain/entities/incident.entity';
import type {
  IncidentDetailResponseDto,
  IncidentResponseDto,
  RelatedIncidentSummaryDto,
} from '../dto/incident-response.dto';

export class IncidentPresenter {
  static toResponse(entity: IncidentEntity): IncidentResponseDto {
    return {
      id: entity.props.id,
      incidentCode: entity.props.incidentCode,
      title: entity.props.title,
      description: entity.props.description,
      severity: entity.props.severity,
      status: entity.props.status,
      ticketIds: entity.props.ticketIds,
      createdBy: entity.props.createdBy,
      metadata: entity.props.metadata ?? {},
      capturedSnapshot: entity.props.capturedSnapshot,
      createdAt: entity.props.createdAt.toISOString(),
      updatedAt: entity.props.updatedAt.toISOString(),
    };
  }

  static toResponseList(entities: IncidentEntity[]): IncidentResponseDto[] {
    return entities.map((entity) => this.toResponse(entity));
  }

  static toRelatedSummary(entity: IncidentEntity): RelatedIncidentSummaryDto {
    return {
      id: entity.props.id,
      incidentCode: entity.props.incidentCode,
      title: entity.props.title,
      severity: entity.props.severity,
      status: entity.props.status,
      createdAt: entity.props.createdAt.toISOString(),
      updatedAt: entity.props.updatedAt.toISOString(),
    };
  }

  static toDetailResponse(input: {
    incident: IncidentEntity;
    relatedIncidents: IncidentEntity[];
  }): IncidentDetailResponseDto {
    return {
      ...this.toResponse(input.incident),
      relatedIncidents: input.relatedIncidents.map((entity) =>
        this.toRelatedSummary(entity),
      ),
    };
  }
}
