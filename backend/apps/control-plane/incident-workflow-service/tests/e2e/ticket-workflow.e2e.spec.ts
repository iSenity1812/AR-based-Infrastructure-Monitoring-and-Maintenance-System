import {
  type CanActivate,
  type ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketEvidenceType } from '../../src/domain/constants/ticket-evidence-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import type { IncidentRepositoryPort } from '../../src/domain/ports/incident-repository.port';
import type {
  CreateTicketRecord,
  TicketListQuery,
  TicketRepositoryPort,
  TicketUpdateRecord,
} from '../../src/domain/ports/ticket-repository.port';
import {
  ACKNOWLEDGE_TICKET_USE_CASE,
  ADD_TICKET_COMMENT_USE_CASE,
  ASSIGN_TICKET_USE_CASE,
  ATTACH_TICKET_EVIDENCE_USE_CASE,
  CREATE_TICKET_EVIDENCE_UPLOAD_URL_USE_CASE,
  CREATE_TICKET_USE_CASE,
  DELETE_TICKET_USE_CASE,
  GET_TICKET_USE_CASE,
  LIST_TICKET_EVIDENCE_USE_CASE,
  LIST_TICKETS_USE_CASE,
  TRANSITION_TICKET_STATUS_USE_CASE,
} from '../../src/infrastructure/di/use-case.tokens';
import { TicketsController } from '../../src/presentation/http/controllers/tickets.controller';
import { JwtAuthGuard } from '../../src/presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../src/presentation/http/guards/permissions.guard';
import { UseCaseHttpExceptionFilter } from '../../src/presentation/http/filters/use-case-http-exception.filter';
import { ApiResponseInterceptor } from '../../src/presentation/http/interceptors/api-response.interceptor';
import {
  AcknowledgeTicketUseCase,
  AddTicketCommentUseCase,
  AssignTicketUseCase,
  AttachTicketEvidenceUseCase,
  CreateTicketEvidenceUploadUrlUseCase,
  CreateTicketUseCase,
  DeleteTicketUseCase,
  GetTicketUseCase,
  ListTicketEvidenceUseCase,
  ListTicketsUseCase,
  TransitionTicketStatusUseCase,
} from '../../src/use-cases/commands/ticket.commands';

class InMemoryTicketRepository implements TicketRepositoryPort {
  private readonly tickets = new Map<string, TicketEntity>();
  private sequence = 0;

  async create(input: CreateTicketRecord): Promise<TicketEntity> {
    const now = new Date();
    const ticket = new TicketEntity({
      id: `ticket-${++this.sequence}`,
      ...input,
      incidentId: input.incidentId ?? null,
      ownerUserId: input.ownerUserId ?? null,
      assigneeUserId: input.assigneeUserId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.tickets.set(ticket.props.id, ticket);
    return ticket;
  }

  async findById(ticketId: string): Promise<TicketEntity | null> {
    return this.tickets.get(ticketId) ?? null;
  }

  async findByCode(ticketCode: string): Promise<TicketEntity | null> {
    return (
      [...this.tickets.values()].find(
        (ticket) => ticket.props.ticketCode === ticketCode,
      ) ?? null
    );
  }

  async findMany(query: TicketListQuery = {}): Promise<TicketEntity[]> {
    void query;
    return [...this.tickets.values()];
  }

  async update(
    ticketId: string,
    input: TicketUpdateRecord,
  ): Promise<TicketEntity | null> {
    const current = this.tickets.get(ticketId);
    if (!current) return null;
    const updated = new TicketEntity({
      ...current.props,
      ...input,
      updatedAt: new Date(),
    });
    this.tickets.set(ticketId, updated);
    return updated;
  }

  async delete(ticketId: string): Promise<TicketEntity | null> {
    const ticket = this.tickets.get(ticketId) ?? null;
    this.tickets.delete(ticketId);
    return ticket;
  }
}

describe('Ticket workflow HTTP e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const tickets = new InMemoryTicketRepository();
    const incidents: IncidentRepositoryPort = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    const objectStorage = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPresignedUpload: jest.fn().mockImplementation(async (input) => ({
        method: 'PUT' as const,
        uploadUrl: `https://uploads.example.com/${input.objectKey}`,
        objectKey: input.objectKey,
        headers: {
          'Content-Type': input.contentType,
        },
        expiresAt: new Date('2026-06-21T01:00:00.000Z'),
        objectUrl: `https://cdn.example.com/${input.objectKey}`,
      })),
    };
    const authGuard: CanActivate = {
      canActivate(context: ExecutionContext) {
        const httpRequest = context.switchToHttp().getRequest<{
          headers: Record<string, string | undefined>;
          user?: unknown;
        }>();
        httpRequest.user = {
          userId: httpRequest.headers['x-user-id'] ?? 'operator-1',
          username: 'e2e-user',
          sessionId: 'session-1',
          roles: [],
          permissions: [],
        };
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        JwtAuthGuard,
        PermissionsGuard,
        {
          provide: CREATE_TICKET_USE_CASE,
          useValue: new CreateTicketUseCase(tickets, incidents),
        },
        {
          provide: LIST_TICKETS_USE_CASE,
          useValue: new ListTicketsUseCase(tickets),
        },
        {
          provide: GET_TICKET_USE_CASE,
          useValue: new GetTicketUseCase(tickets),
        },
        {
          provide: DELETE_TICKET_USE_CASE,
          useValue: new DeleteTicketUseCase(tickets, incidents),
        },
        {
          provide: TRANSITION_TICKET_STATUS_USE_CASE,
          useValue: new TransitionTicketStatusUseCase(tickets),
        },
        {
          provide: ASSIGN_TICKET_USE_CASE,
          useValue: new AssignTicketUseCase(tickets),
        },
        {
          provide: ACKNOWLEDGE_TICKET_USE_CASE,
          useValue: new AcknowledgeTicketUseCase(tickets),
        },
        {
          provide: ADD_TICKET_COMMENT_USE_CASE,
          useValue: new AddTicketCommentUseCase(tickets),
        },
        {
          provide: ATTACH_TICKET_EVIDENCE_USE_CASE,
          useValue: new AttachTicketEvidenceUseCase(tickets),
        },
        {
          provide: CREATE_TICKET_EVIDENCE_UPLOAD_URL_USE_CASE,
          useValue: new CreateTicketEvidenceUploadUrlUseCase(
            tickets,
            objectStorage,
            'tickets',
            900,
          ),
        },
        {
          provide: LIST_TICKET_EVIDENCE_USE_CASE,
          useValue: new ListTicketEvidenceUseCase(tickets),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new UseCaseHttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('creates, assigns, acknowledges, resolves, closes and keeps workflow evidence', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('x-user-id', 'operator-1')
      .send({
        ticketCode: 'TCK-E2E-001',
        title: 'Inspect node',
        priority: TicketPriority.HIGH,
      })
      .expect(201);
    const ticketId = created.body.data.props.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/assignment`)
      .set('x-user-id', 'operator-1')
      .send({ assigneeUserId: 'technician-1' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/acknowledge`)
      .set('x-user-id', 'technician-1')
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set('x-user-id', 'technician-1')
      .send({ comment: 'Inspection started.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/evidence/upload-url`)
      .set('x-user-id', 'technician-1')
      .send({
        type: TicketEvidenceType.IMAGE,
        fileName: 'rack.jpg',
        mimeType: 'image/jpeg',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/evidence`)
      .set('x-user-id', 'technician-1')
      .send({
        type: TicketEvidenceType.IMAGE,
        storageKey: `${ticketId}/rack.jpg`,
        fileName: 'rack.jpg',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/resolve`)
      .set('x-user-id', 'technician-1')
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/close`)
      .set('x-user-id', 'operator-1')
      .expect(201);

    const result = await request(app.getHttpServer())
      .get(`/api/v1/tickets/${ticketId}`)
      .expect(200);
    expect(result.body.data.props.status).toBe(TicketStatus.CLOSED);
    expect(result.body.data.props.acknowledgedAt).toBeTruthy();
    expect(result.body.data.props.evidence).toHaveLength(1);
    expect(
      result.body.data.props.activities.map(
        (entry: { type: string }) => entry.type,
      ),
    ).toEqual(
      expect.arrayContaining([
        TicketActivityType.CREATED,
        TicketActivityType.ASSIGNED,
        TicketActivityType.ACKNOWLEDGED,
        TicketActivityType.COMMENT_ADDED,
        TicketActivityType.EVIDENCE_ATTACHED,
        TicketActivityType.STATUS_CHANGED,
      ]),
    );
  });
});
