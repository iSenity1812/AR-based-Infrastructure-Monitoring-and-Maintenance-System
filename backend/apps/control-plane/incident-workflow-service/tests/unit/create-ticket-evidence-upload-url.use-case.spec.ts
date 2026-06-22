import { TicketEvidenceType } from '../../src/domain/constants/ticket-evidence-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { CreateTicketEvidenceUploadUrlUseCase } from '../../src/use-cases/commands/ticket.commands';
import {
  BadRequestUseCaseError,
  ServiceUnavailableUseCaseError,
} from '../../src/use-cases/errors/use-case.errors';

function ticket(status = TicketStatus.IN_PROGRESS): TicketEntity {
  return new TicketEntity({
    id: 'ticket-1',
    ticketCode: 'TCK-001',
    title: 'Investigate DB latency',
    priority: TicketPriority.HIGH,
    status,
    createdAt: new Date('2026-06-21T00:00:00.000Z'),
    updatedAt: new Date('2026-06-21T00:00:00.000Z'),
  });
}

describe('CreateTicketEvidenceUploadUrlUseCase', () => {
  it('creates a presigned upload target for uploadable evidence', async () => {
    const repository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    const objectStorage = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPresignedUpload: jest.fn().mockResolvedValue({
        method: 'PUT',
        uploadUrl: 'https://upload.example.com/presigned',
        objectKey: 'tickets/ticket-1/image/test-photo.jpg',
        headers: { 'Content-Type': 'image/jpeg' },
        expiresAt: new Date('2026-06-21T01:00:00.000Z'),
        objectUrl:
          'https://cdn.example.com/tickets/ticket-1/image/test-photo.jpg',
      }),
    };

    const target = await new CreateTicketEvidenceUploadUrlUseCase(
      repository,
      objectStorage,
      'tickets',
      900,
    ).execute('ticket-1', {
      actorUserId: 'tech-1',
      type: TicketEvidenceType.IMAGE,
      fileName: 'test photo.jpg',
      mimeType: 'image/jpeg',
    });

    expect(objectStorage.createPresignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: expect.stringMatching(
          /^tickets\/ticket-1\/image\/.+-test-photo\.jpg$/,
        ),
        contentType: 'image/jpeg',
        expiresInSeconds: 900,
      }),
    );
    expect(target).toEqual(
      expect.objectContaining({
        type: TicketEvidenceType.IMAGE,
        fileName: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        storageKey: expect.stringMatching(
          /^tickets\/ticket-1\/image\/.+-test-photo\.jpg$/,
        ),
        uploadUrl: 'https://upload.example.com/presigned',
      }),
    );
  });

  it('rejects evidence types that do not support object uploads', async () => {
    const repository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    const objectStorage = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPresignedUpload: jest.fn(),
    };

    await expect(
      new CreateTicketEvidenceUploadUrlUseCase(
        repository,
        objectStorage,
        'tickets',
        900,
      ).execute('ticket-1', {
        actorUserId: 'tech-1',
        type: TicketEvidenceType.NOTE,
        fileName: 'note.txt',
        mimeType: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(objectStorage.createPresignedUpload).not.toHaveBeenCalled();
  });

  it('fails clearly when Cloudflare R2 is not configured', async () => {
    const repository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    const objectStorage = {
      isConfigured: jest.fn().mockReturnValue(false),
      createPresignedUpload: jest.fn(),
    };

    await expect(
      new CreateTicketEvidenceUploadUrlUseCase(
        repository,
        objectStorage,
        'tickets',
        900,
      ).execute('ticket-1', {
        actorUserId: 'tech-1',
        type: TicketEvidenceType.IMAGE,
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableUseCaseError);
  });
});
