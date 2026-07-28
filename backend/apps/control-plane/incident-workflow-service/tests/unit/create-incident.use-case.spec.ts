import { IncidentSeverity } from '../../src/domain/constants/incident-severity.enum';
import { IncidentStatus } from '../../src/domain/constants/incident-status.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { IncidentEntity } from '../../src/domain/entities/incident.entity';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { CreateIncidentUseCase } from '../../src/use-cases/commands/incident.commands';

describe('CreateIncidentUseCase', () => {
  it('creates an incident and links existing tickets to it', async () => {
    const ticketOne = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });
    const ticketTwo = new TicketEntity({
      id: 'ticket-2',
      ticketCode: 'TCK-002',
      title: 'Check storage I/O',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      createdAt: new Date('2026-06-20T00:01:00.000Z'),
      updatedAt: new Date('2026-06-20T00:01:00.000Z'),
    });
    const incident = new IncidentEntity({
      id: 'incident-1',
      incidentCode: 'INC-001',
      title: 'Database latency',
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.OPEN,
      ticketIds: ['ticket-1', 'ticket-2'],
      createdAt: new Date('2026-06-20T00:02:00.000Z'),
      updatedAt: new Date('2026-06-20T00:02:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest
        .fn()
        .mockImplementation(async (ticketId: string) =>
          ticketId === 'ticket-1' ? ticketOne : ticketTwo,
        ),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(ticketOne),
      delete: jest.fn(),
    };
    const incidentRepository = {
      create: jest.fn().mockResolvedValue(incident),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const useCase = new CreateIncidentUseCase(
      incidentRepository,
      ticketRepository,
    );

    const result = await useCase.execute({
      incidentCode: 'INC-001',
      title: 'Database latency',
      severity: IncidentSeverity.HIGH,
      ticketIds: ['ticket-1', 'ticket-2'],
    });

    expect(result.props.ticketIds).toEqual(['ticket-1', 'ticket-2']);
    expect(incidentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentCode: 'INC-001',
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
      }),
    );
    expect(ticketRepository.update).toHaveBeenCalledTimes(2);
  });
});
