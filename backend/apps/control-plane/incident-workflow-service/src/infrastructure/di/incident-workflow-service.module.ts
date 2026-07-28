import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import {
  IncidentDocumentModel,
  IncidentSchema,
} from '@adapters/persistence/mongoose/schemas/incident.schema';
import {
  TicketDocumentModel,
  TicketSchema,
} from '@adapters/persistence/mongoose/schemas/ticket.schema';
import { MongooseIncidentRepository } from '@adapters/persistence/mongoose/repositories/mongoose-incident.repository';
import { MongooseTicketRepository } from '@adapters/persistence/mongoose/repositories/mongoose-ticket.repository';
import { CloudflareR2ObjectStorageAdapter } from '@adapters/storage/cloudflare-r2-object-storage.adapter';
import { IncidentWorkflowServiceConfig } from '@infrastructure/config/incident-workflow-service-config';
import { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import { ObjectStoragePort } from '@domain/ports/object-storage.port';
import { TicketRepositoryPort } from '@domain/ports/ticket-repository.port';
import {
  INCIDENT_REPOSITORY,
  OBJECT_STORAGE,
  TICKET_REPOSITORY,
} from '@domain/ports/port.tokens';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { IncidentsController } from '@presentation/http/controllers/incidents.controller';
import { TicketsController } from '@presentation/http/controllers/tickets.controller';
import { JwtStrategy } from '@presentation/http/strategies/jwt.strategy';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import { TicketEventsService } from '@presentation/http/events/ticket-events.service';
import { ApiResponseInterceptor } from '@presentation/http/interceptors/api-response.interceptor';
import { UseCaseHttpExceptionFilter } from '@presentation/http/filters/use-case-http-exception.filter';
import {
  CreateIncidentUseCase,
  GetIncidentUseCase,
  ListIncidentsUseCase,
} from '@use-cases/commands/incident.commands';
import {
  AddTicketCommentUseCase,
  AssignTicketUseCase,
  AcknowledgeTicketUseCase,
  AttachTicketEvidenceUseCase,
  CreateTicketEvidenceUploadUrlUseCase,
  CreateTicketUseCase,
  DeleteTicketUseCase,
  GetTicketUseCase,
  ListTicketEvidenceUseCase,
  ListTicketsUseCase,
  TransitionTicketStatusUseCase,
} from '@use-cases/commands/ticket.commands';
import { GetHealthUseCase } from '@use-cases/queries/get-health.use-case';
import { GET_HEALTH_USE_CASE } from './use-case.tokens';
import {
  ADD_TICKET_COMMENT_USE_CASE,
  ATTACH_TICKET_EVIDENCE_USE_CASE,
  ACKNOWLEDGE_TICKET_USE_CASE,
  ASSIGN_TICKET_USE_CASE,
  CREATE_TICKET_EVIDENCE_UPLOAD_URL_USE_CASE,
  CREATE_INCIDENT_USE_CASE,
  CREATE_TICKET_USE_CASE,
  DELETE_TICKET_USE_CASE,
  GET_INCIDENT_USE_CASE,
  GET_TICKET_USE_CASE,
  LIST_INCIDENTS_USE_CASE,
  LIST_TICKETS_USE_CASE,
  LIST_TICKET_EVIDENCE_USE_CASE,
  TRANSITION_TICKET_STATUS_USE_CASE,
} from './use-case.tokens';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: TicketDocumentModel.name, schema: TicketSchema },
      { name: IncidentDocumentModel.name, schema: IncidentSchema },
    ]),
  ],
  controllers: [HealthController, TicketsController, IncidentsController],
  providers: [
    IncidentWorkflowServiceConfig,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    TicketEventsService,
    {
      provide: GET_HEALTH_USE_CASE,
      useClass: GetHealthUseCase,
    },
    MongooseTicketRepository,
    MongooseIncidentRepository,
    CloudflareR2ObjectStorageAdapter,
    {
      provide: TICKET_REPOSITORY,
      useExisting: MongooseTicketRepository,
    },
    {
      provide: INCIDENT_REPOSITORY,
      useExisting: MongooseIncidentRepository,
    },
    {
      provide: OBJECT_STORAGE,
      useExisting: CloudflareR2ObjectStorageAdapter,
    },
    {
      provide: CREATE_TICKET_USE_CASE,
      inject: [TICKET_REPOSITORY, INCIDENT_REPOSITORY],
      useFactory: (
        ticketRepository: TicketRepositoryPort,
        incidentRepository: IncidentRepositoryPort,
      ) => new CreateTicketUseCase(ticketRepository, incidentRepository),
    },
    {
      provide: LIST_TICKETS_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new ListTicketsUseCase(ticketRepository),
    },
    {
      provide: GET_TICKET_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new GetTicketUseCase(ticketRepository),
    },
    {
      provide: DELETE_TICKET_USE_CASE,
      inject: [TICKET_REPOSITORY, INCIDENT_REPOSITORY],
      useFactory: (
        ticketRepository: TicketRepositoryPort,
        incidentRepository: IncidentRepositoryPort,
      ) => new DeleteTicketUseCase(ticketRepository, incidentRepository),
    },
    {
      provide: TRANSITION_TICKET_STATUS_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new TransitionTicketStatusUseCase(ticketRepository),
    },
    {
      provide: ASSIGN_TICKET_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new AssignTicketUseCase(ticketRepository),
    },
    {
      provide: ACKNOWLEDGE_TICKET_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new AcknowledgeTicketUseCase(ticketRepository),
    },
    {
      provide: ADD_TICKET_COMMENT_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new AddTicketCommentUseCase(ticketRepository),
    },
    {
      provide: ATTACH_TICKET_EVIDENCE_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new AttachTicketEvidenceUseCase(ticketRepository),
    },
    {
      provide: CREATE_TICKET_EVIDENCE_UPLOAD_URL_USE_CASE,
      inject: [
        TICKET_REPOSITORY,
        OBJECT_STORAGE,
        IncidentWorkflowServiceConfig,
      ],
      useFactory: (
        ticketRepository: TicketRepositoryPort,
        objectStorage: ObjectStoragePort,
        config: IncidentWorkflowServiceConfig,
      ) =>
        new CreateTicketEvidenceUploadUrlUseCase(
          ticketRepository,
          objectStorage,
          config.r2EvidencePrefix,
          config.r2PresignExpiresSeconds,
        ),
    },
    {
      provide: LIST_TICKET_EVIDENCE_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new ListTicketEvidenceUseCase(ticketRepository),
    },
    {
      provide: CREATE_INCIDENT_USE_CASE,
      inject: [INCIDENT_REPOSITORY, TICKET_REPOSITORY],
      useFactory: (
        incidentRepository: IncidentRepositoryPort,
        ticketRepository: TicketRepositoryPort,
      ) => new CreateIncidentUseCase(incidentRepository, ticketRepository),
    },
    {
      provide: LIST_INCIDENTS_USE_CASE,
      inject: [INCIDENT_REPOSITORY],
      useFactory: (incidentRepository: IncidentRepositoryPort) =>
        new ListIncidentsUseCase(incidentRepository),
    },
    {
      provide: GET_INCIDENT_USE_CASE,
      inject: [INCIDENT_REPOSITORY],
      useFactory: (incidentRepository: IncidentRepositoryPort) =>
        new GetIncidentUseCase(incidentRepository),
    },
    {
      provide: APP_INTERCEPTOR,
      inject: [Reflector],
      useFactory: (reflector: Reflector) =>
        new ApiResponseInterceptor(reflector),
    },
    {
      provide: APP_FILTER,
      useClass: UseCaseHttpExceptionFilter,
    },
  ],
})
export class IncidentWorkflowServiceModule {}
