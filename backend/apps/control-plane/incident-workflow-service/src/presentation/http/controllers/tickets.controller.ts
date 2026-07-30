import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import type { TicketEntity } from '@domain/entities/ticket.entity';
import {
  ACKNOWLEDGE_TICKET_USE_CASE,
  ADD_TICKET_COMMENT_USE_CASE,
  ATTACH_TICKET_EVIDENCE_USE_CASE,
  ASSIGN_TICKET_USE_CASE,
  CREATE_TICKET_EVIDENCE_UPLOAD_URL_USE_CASE,
  CREATE_TICKET_USE_CASE,
  DELETE_TICKET_USE_CASE,
  GET_TICKET_USE_CASE,
  LIST_TICKETS_USE_CASE,
  LIST_TICKET_EVIDENCE_USE_CASE,
  TRANSITION_TICKET_STATUS_USE_CASE,
} from '@infrastructure/di/use-case.tokens';
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
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { CurrentAuthContext } from '../decorators/current-auth-context.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { SkipApiEnvelope } from '../decorators/skip-api-envelope.decorator';
import { AddTicketCommentRequestDto } from '../dto/add-ticket-comment-request.dto';
import { AssignTicketRequestDto } from '../dto/assign-ticket-request.dto';
import { AttachTicketEvidenceRequestDto } from '../dto/attach-ticket-evidence-request.dto';
import { CreateTicketEvidenceUploadUrlRequestDto } from '../dto/create-ticket-evidence-upload-url-request.dto';
import { CreateTicketRequestDto } from '../dto/create-ticket-request.dto';
import { ListTicketsQueryDto } from '../dto/list-tickets-query.dto';
import { UpdateTicketStatusRequestDto } from '../dto/update-ticket-status-request.dto';
import {
  TicketEventsService,
  type TicketRealtimeEventType,
} from '../events/ticket-events.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(
    @Inject(CREATE_TICKET_USE_CASE)
    private readonly createTicketUseCase: CreateTicketUseCase,
    @Inject(LIST_TICKETS_USE_CASE)
    private readonly listTicketsUseCase: ListTicketsUseCase,
    @Inject(GET_TICKET_USE_CASE)
    private readonly getTicketUseCase: GetTicketUseCase,
    @Inject(DELETE_TICKET_USE_CASE)
    private readonly deleteTicketUseCase: DeleteTicketUseCase,
    @Inject(TRANSITION_TICKET_STATUS_USE_CASE)
    private readonly transitionTicketStatusUseCase: TransitionTicketStatusUseCase,
    @Inject(ASSIGN_TICKET_USE_CASE)
    private readonly assignTicketUseCase: AssignTicketUseCase,
    @Inject(ACKNOWLEDGE_TICKET_USE_CASE)
    private readonly acknowledgeTicketUseCase: AcknowledgeTicketUseCase,
    @Inject(ADD_TICKET_COMMENT_USE_CASE)
    private readonly addTicketCommentUseCase: AddTicketCommentUseCase,
    @Inject(ATTACH_TICKET_EVIDENCE_USE_CASE)
    private readonly attachTicketEvidenceUseCase: AttachTicketEvidenceUseCase,
    @Inject(CREATE_TICKET_EVIDENCE_UPLOAD_URL_USE_CASE)
    private readonly createTicketEvidenceUploadUrlUseCase: CreateTicketEvidenceUploadUrlUseCase,
    @Inject(LIST_TICKET_EVIDENCE_USE_CASE)
    private readonly listTicketEvidenceUseCase: ListTicketEvidenceUseCase,
    private readonly ticketEventsService: TicketEventsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a ticket.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_CREATE)
  async create(@Body() requestDto: CreateTicketRequestDto) {
    const ticket = await this.createTicketUseCase.execute({
      ticketCode: requestDto.ticketCode,
      title: requestDto.title,
      description: requestDto.description,
      priority: requestDto.priority,
      incidentId: requestDto.incidentId,
      ownerUserId: requestDto.ownerUserId,
      assigneeUserId: requestDto.assigneeUserId,
      assetRef: requestDto.assetRef,
      metadata: requestDto.metadata,
    });

    this.publishTicketEvent('ticket.created', ticket, ticket.props.ownerUserId);

    return ticket;
  }

  @Get()
  @ApiOperation({ summary: 'List tickets.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_READ)
  async list(@Query() query: ListTicketsQueryDto) {
    return this.listTicketsUseCase.execute({
      ticketCode: query.ticketCode,
      incidentId: query.incidentId,
      status: query.status,
    });
  }

  @Sse('events')
  @ApiOperation({ summary: 'Subscribe to ticket realtime events.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_READ)
  @SkipApiEnvelope()
  events(@CurrentAuthContext() authContext: CurrentAuthContextDto) {
    return this.ticketEventsService.streamFor(authContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by id.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_READ)
  async get(@Param('id') ticketId: string) {
    return this.getTicketUseCase.execute(ticketId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ticket by id.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_CANCEL)
  async delete(@Param('id') ticketId: string) {
    const ticket = await this.deleteTicketUseCase.execute(ticketId);

    this.publishTicketEvent('ticket.deleted', ticket);

    return ticket;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition ticket status.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_STATUS_UPDATE)
  async updateStatus(
    @Param('id') ticketId: string,
    @Body() requestDto: UpdateTicketStatusRequestDto,
  ) {
    const ticket = await this.transitionTicketStatusUseCase.execute(
      ticketId,
      requestDto.status,
    );

    this.publishTicketEvent('ticket.status_changed', ticket);

    return ticket;
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Mark a ticket as resolved by technician.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_RESOLVE)
  async resolve(
    @Param('id') ticketId: string,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const ticket = await this.transitionTicketStatusUseCase.execute(
      ticketId,
      TicketStatus.RESOLVED,
      {
        actorUserId: authContext.userId,
      },
    );

    this.publishTicketEvent(
      'ticket.status_changed',
      ticket,
      authContext.userId,
    );

    return ticket;
  }

  @Post(':id/close')
  @ApiOperation({
    summary: 'Close a resolved ticket with final operator confirmation.',
  })
  @RequirePermissions(PERMISSION_CODES.TICKETS_CLOSE)
  async close(
    @Param('id') ticketId: string,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const ticket = await this.transitionTicketStatusUseCase.execute(
      ticketId,
      TicketStatus.CLOSED,
      {
        actorUserId: authContext.userId,
      },
    );

    this.publishTicketEvent(
      'ticket.status_changed',
      ticket,
      authContext.userId,
    );

    return ticket;
  }

  @Patch(':id/assignment')
  @ApiOperation({ summary: 'Assign a ticket.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_ASSIGN)
  async assign(
    @Param('id') ticketId: string,
    @Body() requestDto: AssignTicketRequestDto,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const ticket = await this.assignTicketUseCase.execute(ticketId, {
      actorUserId: authContext.userId,
      assigneeUserId: requestDto.assigneeUserId,
      message: requestDto.message,
    });

    this.publishTicketEvent('ticket.assigned', ticket, authContext.userId);

    return ticket;
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a ticket.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_ACKNOWLEDGE)
  async acknowledge(
    @Param('id') ticketId: string,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const ticket = await this.acknowledgeTicketUseCase.execute(ticketId, {
      actorUserId: authContext.userId,
    });

    this.publishTicketEvent(
      'ticket.status_changed',
      ticket,
      authContext.userId,
    );

    return ticket;
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a ticket.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_COMMENT)
  async addComment(
    @Param('id') ticketId: string,
    @Body() requestDto: AddTicketCommentRequestDto,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const ticket = await this.addTicketCommentUseCase.execute(ticketId, {
      actorUserId: authContext.userId,
      actorDisplayName: authContext.fullName ?? authContext.username,
      actorRole: resolveCommentActorRole(authContext.roles),
      comment: requestDto.comment,
    });

    this.publishTicketEvent('ticket.comment_added', ticket, authContext.userId);

    return ticket;
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Attach evidence metadata to a ticket.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_EVIDENCE_ATTACH)
  async attachEvidence(
    @Param('id') ticketId: string,
    @Body() requestDto: AttachTicketEvidenceRequestDto,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const ticket = await this.getTicketUseCase.execute(ticketId);
    const evidence = await this.attachTicketEvidenceUseCase.execute(ticketId, {
      actorUserId: authContext.userId,
      ...requestDto,
    });

    this.publishTicketEvent(
      'ticket.evidence_attached',
      ticket,
      authContext.userId,
    );

    return evidence;
  }

  @Post(':id/evidence/upload-url')
  @ApiOperation({
    summary: 'Create a presigned Cloudflare R2 upload URL for ticket evidence.',
  })
  @RequirePermissions(PERMISSION_CODES.TICKETS_EVIDENCE_ATTACH)
  async createEvidenceUploadUrl(
    @Param('id') ticketId: string,
    @Body() requestDto: CreateTicketEvidenceUploadUrlRequestDto,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    return this.createTicketEvidenceUploadUrlUseCase.execute(ticketId, {
      actorUserId: authContext.userId,
      ...requestDto,
    });
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: 'List evidence attached to a ticket.' })
  @RequirePermissions(PERMISSION_CODES.TICKETS_READ)
  async listEvidence(@Param('id') ticketId: string) {
    return this.listTicketEvidenceUseCase.execute(ticketId);
  }

  private publishTicketEvent(
    type: TicketRealtimeEventType,
    ticket: TicketEntity,
    actorUserId?: string | null,
  ): void {
    this.ticketEventsService.publishTicketEvent({
      type,
      ticket,
      actorUserId: actorUserId ?? undefined,
    });
  }
}

function resolveCommentActorRole(roles: string[]): string | undefined {
  return (
    roles.find((role) => role === 'IT_ADMINISTRATOR') ??
    roles.find((role) => role === 'SYSTEM_MONITORING_OPERATOR') ??
    roles.find((role) => role === 'MAINTENANCE_TECHNICIAN') ??
    roles[0]
  );
}
