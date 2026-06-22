import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketEvidenceType } from '../../src/domain/constants/ticket-evidence-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { AttachTicketEvidenceUseCase } from '../../src/use-cases/commands/ticket.commands';
import { BadRequestUseCaseError } from '../../src/use-cases/errors/use-case.errors';

function ticket(status = TicketStatus.IN_PROGRESS): TicketEntity {
  return new TicketEntity({
    id: 'ticket-1',
    ticketCode: 'TCK-001',
    title: 'Investigate DB latency',
    priority: TicketPriority.HIGH,
    status,
    createdAt: new Date('2026-06-20T00:00:00.000Z'),
    updatedAt: new Date('2026-06-20T00:00:00.000Z'),
  });
}

describe('AttachTicketEvidenceUseCase', () => {
  it('stores evidence metadata and appends a timeline activity', async () => {
    const current = ticket();
    const repository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(current),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest
        .fn()
        .mockImplementation(
          async (_id, update) =>
            new TicketEntity({ ...current.props, ...update }),
        ),
    };

    const evidence = await new AttachTicketEvidenceUseCase(repository).execute(
      'ticket-1',
      {
        actorUserId: 'tech-1',
        type: TicketEvidenceType.IMAGE,
        storageKey: 'tickets/ticket-1/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1200,
      },
    );

    expect(evidence).toEqual(
      expect.objectContaining({
        type: TicketEvidenceType.IMAGE,
        attachedByUserId: 'tech-1',
        storageKey: 'tickets/ticket-1/photo.jpg',
      }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      'ticket-1',
      expect.objectContaining({
        evidence: [evidence],
        activities: [
          expect.objectContaining({
            type: TicketActivityType.EVIDENCE_ATTACHED,
            actorUserId: 'tech-1',
          }),
        ],
      }),
    );
  });

  it('rejects evidence without a reference or note', async () => {
    const repository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    await expect(
      new AttachTicketEvidenceUseCase(repository).execute('ticket-1', {
        actorUserId: 'tech-1',
        type: TicketEvidenceType.IMAGE,
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects evidence on terminal tickets', async () => {
    const repository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket(TicketStatus.CLOSED)),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    await expect(
      new AttachTicketEvidenceUseCase(repository).execute('ticket-1', {
        actorUserId: 'tech-1',
        type: TicketEvidenceType.NOTE,
        note: 'Post-close note',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
  });
});
