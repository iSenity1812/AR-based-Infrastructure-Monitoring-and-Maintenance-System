import { Injectable } from '@nestjs/common';

import {
  CreateIncidentWorkflowCommand,
  CreateTicketWorkflowCommand,
  IncidentWorkflowClientPort,
  IncidentWorkflowConflictError,
  type IncidentWorkflowIncident,
  type IncidentWorkflowTicket,
  IncidentWorkflowTicketConflictError,
  IncidentWorkflowUnavailableError,
} from '../../application/ports/incident-workflow-client.port';
import { MonitoringServiceConfig } from '../config/monitoring-service-config';

@Injectable()
export class IncidentWorkflowHttpClient implements IncidentWorkflowClientPort {
  constructor(private readonly config: MonitoringServiceConfig) {}

  async createIncident(
    command: CreateIncidentWorkflowCommand,
  ): Promise<IncidentWorkflowIncident> {
    const response = await this.request('/incidents', {
      method: 'POST',
      authorizationHeader: command.authorizationHeader,
      correlationId: command.correlationId,
      body: {
        incidentCode: command.incidentCode,
        title: command.title,
        description: command.description,
        severity: command.severity,
        metadata: command.metadata,
        capturedSnapshot: command.capturedSnapshot,
      },
    });

    if (response.status === 409) {
      throw new IncidentWorkflowConflictError(command.incidentCode);
    }

    if (!response.ok) {
      throw new IncidentWorkflowUnavailableError(
        `Incident Workflow Service create failed with status ${response.status}.`,
      );
    }

    return parseIncident(await response.json());
  }

  async findIncidentByCode(input: {
    authorizationHeader: string;
    correlationId?: string;
    incidentCode: string;
  }): Promise<IncidentWorkflowIncident | null> {
    const response = await this.request(
      `/incidents?incidentCode=${encodeURIComponent(input.incidentCode)}`,
      {
        method: 'GET',
        authorizationHeader: input.authorizationHeader,
        correlationId: input.correlationId,
      },
    );

    if (!response.ok) {
      throw new IncidentWorkflowUnavailableError(
        `Incident Workflow Service lookup failed with status ${response.status}.`,
      );
    }

    const incidents = parseIncidentList(await response.json());
    return (
      incidents.find(
        (incident) => incident.incidentCode === input.incidentCode,
      ) ?? null
    );
  }

  async createTicket(
    command: CreateTicketWorkflowCommand,
  ): Promise<IncidentWorkflowTicket> {
    const response = await this.request('/tickets', {
      method: 'POST',
      authorizationHeader: command.authorizationHeader,
      correlationId: command.correlationId,
      body: {
        ticketCode: command.ticketCode,
        title: command.title,
        description: command.description,
        priority: command.priority,
        incidentId: command.incidentId,
        ownerUserId: command.ownerUserId,
        metadata: command.metadata,
      },
    });

    if (response.status === 409) {
      throw new IncidentWorkflowTicketConflictError(command.ticketCode);
    }

    if (!response.ok) {
      throw new IncidentWorkflowUnavailableError(
        `Incident Workflow Service ticket create failed with status ${response.status}.`,
      );
    }

    return parseTicket(await response.json());
  }

  private async request(
    path: string,
    options: {
      method: 'GET' | 'POST';
      authorizationHeader: string;
      correlationId?: string;
      body?: Record<string, unknown>;
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.incidentWorkflowTimeoutMs,
    );

    try {
      return await fetch(`${this.config.incidentWorkflowBaseUrl}${path}`, {
        method: options.method,
        signal: controller.signal,
        headers: {
          authorization: options.authorizationHeader,
          'content-type': 'application/json',
          ...(options.correlationId
            ? { 'x-correlation-id': options.correlationId }
            : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new IncidentWorkflowUnavailableError(
        error instanceof Error
          ? error.message
          : 'Incident Workflow Service request failed.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseIncident(input: unknown): IncidentWorkflowIncident {
  const payload = unwrapEnvelope(input);
  const raw =
    isRecord(payload) && isRecord(payload.props) ? payload.props : payload;

  if (!isRecord(raw)) {
    throw new IncidentWorkflowUnavailableError(
      'Incident Workflow Service returned an invalid incident payload.',
    );
  }

  const incidentId = readString(raw.id);
  const incidentCode = readString(raw.incidentCode);
  const title = readString(raw.title);
  const severity = readString(raw.severity);
  const status = readString(raw.status);
  const createdAt = readDateString(raw.createdAt);

  if (
    !incidentId ||
    !incidentCode ||
    !title ||
    (severity !== 'HIGH' && severity !== 'CRITICAL') ||
    !status ||
    !createdAt
  ) {
    throw new IncidentWorkflowUnavailableError(
      'Incident Workflow Service returned incomplete incident fields.',
    );
  }

  return {
    incidentId,
    incidentCode,
    title,
    severity,
    status,
    createdBy: parseCreatedBy(raw.createdBy),
    metadata: isRecord(raw.metadata) ? raw.metadata : {},
    capturedSnapshot: isRecord(raw.capturedSnapshot)
      ? (raw.capturedSnapshot as unknown as IncidentWorkflowIncident['capturedSnapshot'])
      : undefined,
    createdAt,
    updatedAt: readDateString(raw.updatedAt),
  };
}

function parseIncidentList(input: unknown): IncidentWorkflowIncident[] {
  const payload = unwrapEnvelope(input);
  const rawItems = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : [];

  return rawItems.map(parseIncident);
}

function parseTicket(input: unknown): IncidentWorkflowTicket {
  const payload = unwrapEnvelope(input);
  const raw =
    isRecord(payload) && isRecord(payload.props) ? payload.props : payload;

  if (!isRecord(raw)) {
    throw new IncidentWorkflowUnavailableError(
      'Incident Workflow Service returned an invalid ticket payload.',
    );
  }

  const ticketId = readString(raw.id);
  const ticketCode = readString(raw.ticketCode);
  const title = readString(raw.title);
  const priority = readString(raw.priority);
  const status = readString(raw.status);

  if (
    !ticketId ||
    !ticketCode ||
    !title ||
    (priority !== 'LOW' &&
      priority !== 'MEDIUM' &&
      priority !== 'HIGH' &&
      priority !== 'CRITICAL') ||
    !status
  ) {
    throw new IncidentWorkflowUnavailableError(
      'Incident Workflow Service returned incomplete ticket fields.',
    );
  }

  return {
    ticketId,
    ticketCode,
    title,
    priority,
    status,
    incidentId: readString(raw.incidentId),
  };
}

function unwrapEnvelope(input: unknown): unknown {
  if (isRecord(input) && 'data' in input) {
    return input.data;
  }

  return input;
}

function readString(input: unknown): string | null {
  return typeof input === 'string' && input.trim() ? input.trim() : null;
}

function readDateString(input: unknown): string | null {
  if (input instanceof Date) {
    return input.toISOString();
  }

  return readString(input);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
}

function parseCreatedBy(
  input: unknown,
): IncidentWorkflowIncident['createdBy'] | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const userId = readString(input.userId);
  const username = readString(input.username);
  const source = readString(input.source);

  if (
    !userId ||
    !username ||
    (source !== 'monitoring_alert_handoff' &&
      source !== 'incident_console' &&
      source !== 'system')
  ) {
    return undefined;
  }

  return {
    userId,
    username,
    fullName: readString(input.fullName) ?? undefined,
    source,
  };
}
