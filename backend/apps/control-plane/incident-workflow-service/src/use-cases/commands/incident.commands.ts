import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import type {
  IncidentCapturedSnapshot,
  IncidentCreatedBy,
} from '@domain/entities/incident.entity';
import { IncidentEntity } from '@domain/entities/incident.entity';
import type { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import type { TicketRepositoryPort } from '@domain/ports/ticket-repository.port';
import {
  ConflictUseCaseError,
  ForbiddenUseCaseError,
  NotFoundUseCaseError,
} from '@use-cases/errors/use-case.errors';

export interface CreateIncidentCommand {
  incidentCode: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  ticketIds?: string[];
  createdBy?: IncidentCreatedBy;
  metadata?: Record<string, unknown>;
  capturedSnapshot?: IncidentCapturedSnapshot;
}

export class CreateIncidentUseCase {
  constructor(
    private readonly incidentRepository: IncidentRepositoryPort,
    private readonly ticketRepository: TicketRepositoryPort,
  ) {}

  async execute(command: CreateIncidentCommand): Promise<IncidentEntity> {
    const existing = await this.incidentRepository.findByCode(
      command.incidentCode,
    );
    if (existing) {
      throw new ConflictUseCaseError(
        `Incident ${command.incidentCode} already exists.`,
      );
    }

    const ticketIds = Array.from(new Set(command.ticketIds ?? []));
    const tickets = await Promise.all(
      ticketIds.map(async (ticketId) => {
        const ticket = await this.ticketRepository.findById(ticketId);
        if (!ticket) {
          throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
        }

        return ticket;
      }),
    );

    const created = await this.incidentRepository.create({
      incidentCode: command.incidentCode,
      title: command.title,
      description: command.description,
      severity: command.severity,
      status: IncidentStatus.OPEN,
      ticketIds,
      createdBy: command.createdBy,
      metadata: command.metadata ?? {},
      capturedSnapshot: command.capturedSnapshot,
    });

    await Promise.all(
      tickets.map((ticket) =>
        this.ticketRepository.update(ticket.props.id, {
          incidentId: created.props.id,
        }),
      ),
    );

    return created;
  }
}

export class ListIncidentsUseCase {
  constructor(private readonly incidentRepository: IncidentRepositoryPort) {}

  execute(
    query: {
      incidentCode?: string;
      status?: IncidentStatus;
      severity?: IncidentSeverity;
      ticketId?: string;
      scopeType?: string;
      scopeId?: string;
    } = {},
  ) {
    return this.incidentRepository.findMany(query);
  }
}

export class GetIncidentUseCase {
  constructor(
    private readonly incidentRepository: IncidentRepositoryPort,
    private readonly ticketRepository: TicketRepositoryPort,
  ) {}

  async execute(
    incidentId: string,
    authContext: {
      userId: string;
      permissions: string[];
    },
  ): Promise<{
    incident: IncidentEntity;
    relatedIncidents: IncidentEntity[];
  }> {
    const incident = await this.incidentRepository.findById(incidentId);
    if (!incident) {
      throw new NotFoundUseCaseError(`Incident ${incidentId} was not found.`);
    }

    await this.assertCanInspectIncident(incident, authContext);

    const scope = deriveIncidentScope(incident);
    if (!scope) {
      return {
        incident,
        relatedIncidents: [],
      };
    }

    const relatedIncidents = await this.incidentRepository.findRelatedByScope({
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      excludeIncidentId: incident.props.id,
      limit: 10,
    });

    return {
      incident,
      relatedIncidents,
    };
  }

  private async assertCanInspectIncident(
    incident: IncidentEntity,
    authContext: {
      userId: string;
      permissions: string[];
    },
  ): Promise<void> {
    if (authContext.permissions.includes(PERMISSION_CODES.INCIDENTS_READ)) {
      return;
    }

    const assignedTickets = await this.ticketRepository.findMany({
      incidentId: incident.props.id,
      assigneeUserId: authContext.userId,
    });

    if (assignedTickets.length === 0) {
      throw new ForbiddenUseCaseError(
        'Only technicians assigned to a linked ticket can inspect this incident.',
      );
    }
  }
}

function deriveIncidentScope(
  incident: IncidentEntity,
): { scopeType: string; scopeId: string } | null {
  const snapshotScope = incident.props.capturedSnapshot?.scope;
  if (snapshotScope?.scopeType?.trim() && snapshotScope.scopeId?.trim()) {
    return {
      scopeType: snapshotScope.scopeType.trim(),
      scopeId: snapshotScope.scopeId.trim(),
    };
  }

  const metadata = incident.props.metadata ?? {};
  const scopeType =
    typeof metadata.scopeType === 'string' ? metadata.scopeType.trim() : '';
  if (!scopeType) {
    return null;
  }

  switch (scopeType) {
    case 'node':
      return typeof metadata.nodeId === 'string' && metadata.nodeId.trim()
        ? { scopeType, scopeId: metadata.nodeId.trim() }
        : null;
    case 'rack':
      return typeof metadata.rackId === 'string' && metadata.rackId.trim()
        ? { scopeType, scopeId: metadata.rackId.trim() }
        : null;
    default:
      return typeof metadata.scopeId === 'string' && metadata.scopeId.trim()
        ? { scopeType, scopeId: metadata.scopeId.trim() }
        : null;
  }
}
