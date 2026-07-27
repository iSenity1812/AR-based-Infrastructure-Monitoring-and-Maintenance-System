import { Injectable } from '@nestjs/common';

import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import type { ResolveMarkerOptions } from '@application/ports/asset-service-client.port';
import { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import type {
  ArCreateWorkOrderInputDto,
  ArTicketAssetRefDto,
  ArWorkOrderSummaryDto,
} from '@use-cases/dto/ar-work-order.dto';

interface TicketResponseLike {
  props?: TicketFieldsLike;
  id?: string;
  ticketCode?: string;
  title?: string;
  priority?: string;
  status?: string;
  assigneeUserId?: string | null;
  assetRef?: ArTicketAssetRefDto | null;
}

interface TicketFieldsLike {
  id: string;
  ticketCode: string;
  title: string;
  priority: string;
  status: string;
  assigneeUserId?: string | null;
  assetRef?: ArTicketAssetRefDto | null;
}

@Injectable()
export class IncidentWorkflowServiceHttpClient implements IncidentWorkflowServiceClientPort {
  readonly serviceName = 'incident-workflow-service' as const;

  constructor(private readonly config: ArBffServiceConfig) {}

  async listWorkOrders(
    assetRef: ArTicketAssetRefDto,
    options: ResolveMarkerOptions = {},
  ): Promise<ArWorkOrderSummaryDto[]> {
    const response = await this.fetchJson('/tickets', options);
    const tickets = unwrapArray(response).map(toTicketFields);

    return tickets
      .filter((ticket) => ticket.assetRef?.assetId === assetRef.assetId)
      .filter(
        (ticket) =>
          !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status),
      )
      .map(toArWorkOrder);
  }

  async createWorkOrder(
    input: ArCreateWorkOrderInputDto & { assetRef: ArTicketAssetRefDto },
    options: ResolveMarkerOptions = {},
  ): Promise<ArWorkOrderSummaryDto> {
    const response = await this.fetchJson('/tickets', options, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return toArWorkOrder(toTicketFields(response));
  }

  private async fetchJson(
    path: string,
    options: ResolveMarkerOptions,
    init: RequestInit = { method: 'GET' },
  ): Promise<unknown> {
    try {
      const response = await fetch(
        `${this.config.incidentWorkflowServiceBaseUrl}${path}`,
        {
          ...init,
          headers: {
            ...buildHeaders(options),
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          },
        },
      );

      if (!response.ok) {
        throw toIncidentError(response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof DownstreamServiceError) {
        throw error;
      }

      throw new DownstreamServiceError(
        'incident-workflow-service',
        'UNAVAILABLE',
        'Incident Workflow Service is unavailable.',
      );
    }
  }
}

function toIncidentError(status: number): DownstreamServiceError {
  if (status === 403 || status === 401) {
    return new DownstreamServiceError(
      'incident-workflow-service',
      'FORBIDDEN',
      'Incident Workflow Service rejected this action.',
    );
  }

  if (status === 409) {
    return new DownstreamServiceError(
      'incident-workflow-service',
      'CONFLICT',
      'Incident Workflow Service reported a ticket conflict.',
    );
  }

  if (status === 400 || status === 422) {
    return new DownstreamServiceError(
      'incident-workflow-service',
      'VALIDATION_FAILED',
      'Incident Workflow Service rejected the ticket payload.',
    );
  }

  return new DownstreamServiceError(
    'incident-workflow-service',
    'UNAVAILABLE',
    'Incident Workflow Service is unavailable.',
  );
}

function buildHeaders(options: ResolveMarkerOptions): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.authorization) headers.Authorization = options.authorization;
  if (options.requestId) headers['x-request-id'] = options.requestId;
  if (options.correlationId)
    headers['x-correlation-id'] = options.correlationId;

  return headers;
}

function unwrapArray(response: unknown): TicketResponseLike[] {
  const body = unwrapData(response);
  return Array.isArray(body) ? body.map(toTicketResponseLike) : [];
}

function unwrapData(response: unknown): unknown {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response;
}

function toTicketFields(ticket: unknown): TicketFieldsLike {
  const body = toTicketResponseLike(unwrapData(ticket));
  return toTicketFieldsLike(body.props ?? body);
}

function toTicketResponseLike(value: unknown): TicketResponseLike {
  return isRecord(value) ? value : {};
}

function toTicketFieldsLike(value: unknown): TicketFieldsLike {
  const record = isRecord(value) ? value : {};
  return {
    id: stringField(record.id),
    ticketCode: stringField(record.ticketCode),
    title: stringField(record.title),
    priority: stringField(record.priority),
    status: stringField(record.status),
    assigneeUserId:
      typeof record.assigneeUserId === 'string' ? record.assigneeUserId : null,
    assetRef: isRecord(record.assetRef)
      ? (record.assetRef as unknown as ArTicketAssetRefDto)
      : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toArWorkOrder(ticket: TicketFieldsLike): ArWorkOrderSummaryDto {
  return {
    ticketId: ticket.id,
    ticketCode: ticket.ticketCode,
    title: ticket.title,
    priority: ticket.priority,
    status: ticket.status,
    assignee: ticket.assigneeUserId
      ? { userId: ticket.assigneeUserId }
      : undefined,
    assetRef: ticket.assetRef ?? undefined,
  };
}
