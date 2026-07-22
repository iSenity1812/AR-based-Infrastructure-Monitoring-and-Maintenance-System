import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import type { IncidentCreatedBy } from '@domain/entities/incident.entity';
import { IncidentEntity } from '@domain/entities/incident.entity';
import type { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import type { TicketRepositoryPort } from '@domain/ports/ticket-repository.port';
import {
  ConflictUseCaseError,
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
    } = {},
  ) {
    return this.incidentRepository.findMany(query);
  }
}

export class GetIncidentUseCase {
  constructor(private readonly incidentRepository: IncidentRepositoryPort) {}

  async execute(incidentId: string): Promise<IncidentEntity> {
    const incident = await this.incidentRepository.findById(incidentId);
    if (!incident) {
      throw new NotFoundUseCaseError(`Incident ${incidentId} was not found.`);
    }

    return incident;
  }
}
