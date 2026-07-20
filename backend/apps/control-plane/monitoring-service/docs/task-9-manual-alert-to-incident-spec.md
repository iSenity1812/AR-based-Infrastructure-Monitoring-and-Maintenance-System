# Spec: Task 9 Manual Alert to Incident Flow

## Assumptions

1. The dashboard starts from Monitoring Service alert state, not directly from Incident Workflow Service.
2. Manual flow is phase 1; automatic incident creation is out of scope for this task.
3. Only active `firing` alerts can be escalated into incidents in phase 1.
4. Alert fingerprint is the idempotency key for alert-to-incident handoff.
5. Monitoring alert severity `warning` maps to Incident severity `HIGH`.
6. Monitoring alert severity `critical` maps to Incident severity `CRITICAL`.

## Objective

Build the manual operator action that creates an incident from an active external alert.

The operator should be able to open a dashboard alert, click an escalation action, and receive a linked incident reference. Monitoring Service remains the alert read/composition owner. Incident Workflow Service remains the incident workflow owner.

Success means the system can complete this path:

```text
Grafana/Alertmanager alert -> Monitoring alert read model -> dashboard action -> Incident Workflow Service incident -> Monitoring read-side linkage
```

## Tech Stack

- Language: TypeScript
- Framework: NestJS
- Persistence: MongoDB through existing repository/schema pattern
- Source service: `backend/apps/control-plane/monitoring-service`
- Target service: `backend/apps/control-plane/incident-workflow-service`
- Auth pattern: existing JWT and permission guards

## Commands

Run from repository root unless noted otherwise.

```powershell
pnpm --dir backend/apps/control-plane/monitoring-service build
pnpm --dir backend/apps/control-plane/incident-workflow-service build
pnpm --dir backend/apps/control-plane/monitoring-service test -- --runInBand
```

Known current risk: Monitoring Service Jest may still hit the existing environment-level `this._moduleMocker.clearMocksOnScope is not a function` issue. If that happens, use targeted build plus manual verification until the test harness is fixed.

## Project Structure

```text
backend/apps/control-plane/monitoring-service/docs/
  task-9-manual-alert-to-incident-spec.md
  task-9-manual-alert-incident-interface-design.md

backend/apps/control-plane/monitoring-service/src/domain/
  alert-current-state.ts

backend/apps/control-plane/monitoring-service/src/application/
  ports/
  use-cases/

backend/apps/control-plane/monitoring-service/src/infrastructure/
  database/mongodb/
  http/

backend/apps/control-plane/monitoring-service/src/presentation/http/
  controllers/
  dto/

backend/apps/control-plane/incident-workflow-service/src/presentation/http/
  controllers/incidents.controller.ts
  dto/create-incident-request.dto.ts
```

## Code Style

Follow the current Monitoring Service style:

```ts
export interface CreateIncidentFromAlertCommand {
  fingerprint: string;
  requestedBy: string;
  authorizationHeader: string;
  title?: string;
  description?: string;
  operatorNote?: string;
  severityOverride?: 'HIGH' | 'CRITICAL';
}

export abstract class IncidentWorkflowClientPort {
  abstract createIncident(
    command: CreateIncidentWorkflowCommand,
  ): Promise<CreateIncidentWorkflowResult>;
}
```

Conventions:

- Keep use cases framework-light.
- Put external service calls behind application ports.
- Validate input at HTTP boundary.
- Do not let controller code own mapping logic.
- Preserve raw alert labels and annotations when building incident metadata.

## Functional Requirements

### Create Incident from Alert

Add a Monitoring command endpoint:

```http
POST /api/v1/monitoring/alerts/:fingerprint/incident
Authorization: Bearer <operator-jwt>
Content-Type: application/json
```

Request body:

```json
{
  "title": "Optional custom title",
  "description": "Optional custom description",
  "operatorNote": "Optional note",
  "severityOverride": "HIGH"
}
```

All body fields are optional.

Default behavior:

- load alert by `fingerprint`;
- require alert status `firing`;
- generate deterministic `incidentCode`;
- map severity `warning -> HIGH`, `critical -> CRITICAL`;
- call Incident Workflow Service `POST /incidents`;
- persist incident linkage on Monitoring alert read model;
- return alert source summary plus incident linkage.

### Alert Not Found

If no alert exists for the fingerprint:

- return `404`;
- use machine-readable error code `ALERT_NOT_FOUND`;
- do not call Incident Workflow Service.

### Resolved Alert

If the alert exists but `status = resolved`:

- return `409`;
- use machine-readable error code `ALERT_NOT_ACTIVE`;
- do not call Incident Workflow Service.

Rationale: resolved alert escalation is a separate historical workflow and should not be mixed into the active incident path yet.

### Duplicate Handling

Duplicate handling is based on alert fingerprint.

Rules:

- deterministic incident code is derived from fingerprint;
- if Monitoring already has incident linkage, return `action = already_linked`;
- if Incident Workflow Service returns duplicate/conflict for that incident code, Monitoring should recover the existing incident if possible and return `action = linked_existing`;
- if conflict recovery is not possible, return `409 INCIDENT_ALREADY_EXISTS`.

### Incident Metadata

Incident metadata must include alert context:

```json
{
  "source": "monitoring_alert",
  "fingerprint": "...",
  "alertName": "...",
  "scopeType": "node",
  "nodeId": "...",
  "rackId": "...",
  "workloadId": "...",
  "serviceId": "...",
  "monitoringSeverity": "warning",
  "incidentSeverity": "HIGH",
  "category": "thermal",
  "environment": "lab",
  "team": "platform",
  "metricKey": "...",
  "currentValue": "...",
  "threshold": "...",
  "observedWindow": "...",
  "dashboardUrl": "...",
  "runbookUrl": "...",
  "startsAt": "...",
  "lastReceivedAt": "...",
  "rawLabels": {},
  "rawAnnotations": {},
  "operatorNote": "..."
}
```

`rawLabels` and `rawAnnotations` are required in metadata to preserve original upstream context.

### Permission

The Monitoring endpoint must require:

```text
INCIDENTS_CREATE
```

Monitoring should forward the operator `Authorization` header to Incident Workflow Service so Incident Service can enforce its own permission boundary.

## Non-Functional Requirements

- The command must be idempotent for repeated requests against the same fingerprint.
- The response must be consumer-first and self-descriptive.
- Existing `/monitoring/racks/state` and `/monitoring/nodes/state` response fields must remain backward compatible.
- New state API fields must be additive and optional.
- Monitoring must not store incident workflow truth such as assignees, comments, ticket status, or resolution history.
- Incident Service responses must be treated as external/untrusted data and normalized before storing linkage.

## Testing Strategy

Unit tests:

- severity mapping maps `warning` to `HIGH`;
- severity mapping maps `critical` to `CRITICAL`;
- missing alert returns not found without calling Incident client;
- resolved alert returns conflict without calling Incident client;
- already linked alert returns existing linkage;
- successful create stores linkage;
- duplicate incident conflict can repair linkage when the existing incident is recoverable.

Controller tests:

- endpoint requires auth and `INCIDENTS_CREATE`;
- request DTO validates optional fields;
- response shape is stable.

Manual verification:

- sync a firing alert into Monitoring Service;
- call `POST /api/v1/monitoring/alerts/:fingerprint/incident`;
- verify Incident Service contains the created incident;
- verify Monitoring `alert_current_states` stores linkage;
- verify `/monitoring/nodes/state` or `/monitoring/racks/state` exposes additive linkage fields.

## Boundaries

Always:

- Keep Incident Workflow Service as the incident workflow source of truth.
- Store only read-side incident linkage in Monitoring.
- Preserve raw labels and annotations in incident metadata.
- Use deterministic incident code for idempotency.
- Map `warning` to `HIGH`.

Ask first:

- Allow incident creation from resolved alerts.
- Add auto-create incident behavior.
- Add new Incident Service workflow fields beyond metadata/linkage.
- Introduce service-to-service auth that does not forward operator identity.
- Add new external dependencies.

Never:

- Query Incident MongoDB directly from Monitoring.
- Let Monitoring own incident status transitions.
- Remove or break existing node/rack state fields.
- Drop raw alert metadata during escalation.
- Create duplicate incidents for the same alert fingerprint.

## Success Criteria

- A dashboard operator can create an incident from an active alert through Monitoring Service.
- Missing alert, resolved alert, duplicate alert, and Incident Service failure have explicit error semantics.
- Warning alerts create `HIGH` incidents.
- Critical alerts create `CRITICAL` incidents.
- Monitoring stores incident linkage and does not store workflow truth.
- Existing dashboard state APIs remain backward compatible.

## Open Questions

1. Should phase 1 implement conflict recovery by calling an Incident list/filter API by `incidentCode`, or should it return `409` until a direct `GET /incidents/by-code/:incidentCode` exists?
2. Should `operatorNote` be stored only in Incident metadata, or also as a future Monitoring triage note?
3. Should state APIs expose linkage only on `primaryAlert`, or on every `activeAlerts[]` item as well?
