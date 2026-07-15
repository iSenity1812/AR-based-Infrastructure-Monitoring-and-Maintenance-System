# Task 3 Alert Current State Interface Design

## Purpose
This document refines [task-3-alert-read-model-spec.md](D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/backend/apps/control-plane/monitoring-service/docs/task-3-alert-read-model-spec.md) into concrete schema and interface shapes that can be implemented in `monitoring-service`.

It focuses on:
- domain shape
- persistence shape
- repository boundary
- inbound sync DTO boundary
- query-facing read boundary for later dashboard tasks

It does not implement the sync flow itself.

## Design Goals
- keep identity explicit and hard to misuse
- align with `external-alerting-v1.contract.ts`
- prefer additive fields and backward-safe evolution
- preserve monitoring read-side ownership only
- keep the implementation path simple enough to evolve the current codebase without a second redesign

## Key Design Decisions
1. `fingerprint` is the primary document identity for the current alert instance.
2. `scopeId` is not used in the new model.
3. Scope identity is represented by explicit fields:
   - `nodeId`
   - `rackId`
   - `workloadId`
4. Current alert state and alert history are separated conceptually.
   Task 3 only designs current state.
5. External payload fields and monitoring-owned read-side fields are kept in separate groups inside the model.
6. Future incident linkage remains non-authoritative and is intentionally deferred from the first persistence slice.

## Domain Model

### Core enums
Because the external contract will likely grow, categories should be designed to extend safely.

```ts
export const ALERT_CURRENT_STATE_SCOPE_TYPES = [
  'node',
  'rack',
  'workload',
  'service',
] as const;

export type AlertCurrentStateScopeType =
  (typeof ALERT_CURRENT_STATE_SCOPE_TYPES)[number];

export const ALERT_CURRENT_STATE_SEVERITIES = [
  'warning',
  'critical',
] as const;

export type AlertCurrentStateSeverity =
  (typeof ALERT_CURRENT_STATE_SEVERITIES)[number];

export const ALERT_CURRENT_STATE_STATUSES = [
  'firing',
  'resolved',
] as const;

export type AlertCurrentStateStatus =
  (typeof ALERT_CURRENT_STATE_STATUSES)[number];

export const ALERT_CURRENT_STATE_TRIAGE_STATUSES = [
  'new',
  'acknowledged',
  'escalated',
] as const;

export type AlertCurrentStateTriageStatus =
  (typeof ALERT_CURRENT_STATE_TRIAGE_STATUSES)[number];
```

### Category strategy
For compatibility with the existing external contract and future quick additions:

```ts
export type AlertCurrentStateCategory =
  | 'availability'
  | 'resource'
  | 'thermal'
  | 'runtime'
  | 'network'
  | 'connectivity';
```

Reason:
- current runtime config already uses `network` and `connectivity`
- keeping them out of the code union would create immediate contract drift

### Scope identity
Use a discriminated union so internal code cannot accidentally store an invalid identity shape.

```ts
export type AlertScopeIdentity =
  | {
      scopeType: 'node';
      nodeId: string;
      rackId: string;
      workloadId?: never;
    }
  | {
      scopeType: 'service';
      serviceId: string;
      nodeId?: never;
      rackId?: never;
      workloadId?: never;
    };
  | {
      scopeType: 'rack';
      rackId: string;
      nodeId?: never;
      workloadId?: never;
    }
  | {
      scopeType: 'workload';
      workloadId: string;
      nodeId: string;
      rackId: string;
    };
```

### Alert current state entity
```ts
export interface AlertCurrentState extends AlertScopeIdentity {
  fingerprint: string;
  alertName: string;

  severity: AlertCurrentStateSeverity;
  status: AlertCurrentStateStatus;
  category: AlertCurrentStateCategory;
  environment: string;
  team: string;
  source: 'grafana';

  summary: string;
  description: string;
  metricKey: string;
  observedWindow: string;
  dashboardUrl: string;
  runbookUrl: string;
  currentValue: string | null;
  threshold: string | null;

  startsAt: string;
  endsAt: string | null;
  lastReceivedAt: string;

  firstSyncedAt: string;
  lastSyncedAt: string;
  lastStatusChangedAt: string;

}
```

## Persistence Schema

### Collection name
Implemented first-slice collection:
- `alert_current_states`

Reason:
- avoids semantic confusion with legacy `monitoring_states`
- makes migration clearer
- reduces risk of overloading an old shape that was built around local notification sync

### Mongo document shape
```ts
@Schema({
  collection: 'alert_current_states',
  timestamps: true,
  versionKey: false,
})
export class AlertCurrentStatePersistence {
  @Prop({ required: true, unique: true, index: true })
  fingerprint!: string;

  @Prop({ required: true, index: true })
  alertName!: string;

  @Prop({ required: true, enum: ['node', 'rack', 'workload'], index: true })
  scopeType!: AlertCurrentStateScopeType;

  @Prop({ required: false, index: true })
  nodeId!: string | null;

  @Prop({ required: false, index: true })
  rackId!: string | null;

  @Prop({ required: false, index: true })
  workloadId!: string | null;

  @Prop({ required: true, enum: ['warning', 'critical'], index: true })
  severity!: AlertCurrentStateSeverity;

  @Prop({ required: true, index: true })
  category!: string;

  @Prop({ required: true, enum: ['firing', 'resolved'], index: true })
  status!: AlertCurrentStateStatus;

  @Prop({ required: true })
  environment!: string;

  @Prop({ required: true })
  team!: string;

  @Prop({ required: true })
  source!: 'grafana';

  @Prop({ required: true })
  summary!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  metricKey!: string;

  @Prop({ required: true })
  observedWindow!: string;

  @Prop({ required: true })
  dashboardUrl!: string;

  @Prop({ required: true })
  runbookUrl!: string;

  @Prop({ type: String, required: false, default: null })
  currentValue!: string | null;

  @Prop({ type: String, required: false, default: null })
  threshold!: string | null;

  @Prop({ required: true })
  startsAt!: string;

  @Prop({ type: String, required: false, default: null })
  endsAt!: string | null;

  @Prop({ required: true })
  lastReceivedAt!: string;

  @Prop({ required: true })
  firstSyncedAt!: string;

  @Prop({ required: true })
  lastSyncedAt!: string;

  @Prop({ required: true })
  lastStatusChangedAt!: string;

  createdAt?: Date;
  updatedAt?: Date;
}
```

### Index design
Required indexes:
- unique: `fingerprint`
- compound: `{ scopeType: 1, nodeId: 1, status: 1 }`
- compound: `{ scopeType: 1, rackId: 1, status: 1 }`
- compound: `{ scopeType: 1, workloadId: 1, status: 1 }`
- compound: `{ status: 1, severity: 1, lastReceivedAt: -1 }`
- compound: `{ alertName: 1, status: 1, severity: 1 }`
Optional later:
- TTL or archival strategy for long-resolved alerts
- triage and incident-linkage indexes once those fields are introduced in a later phase

## Interface Boundaries

### Inbound external payload boundary
Task 4 will need a validated input contract that is narrower than raw webhook JSON.

Recommended internal command DTO:

```ts
export interface SyncExternalAlertCurrentStateCommand {
  fingerprint: string;
  alertName: string;
  status: 'firing' | 'resolved';

  labels: {
    scopeType: 'node' | 'rack' | 'workload';
    severity: 'warning' | 'critical';
    category: AlertCurrentStateCategory;
    environment: string;
    team: string;
    source: 'grafana';
    nodeId?: string;
    rackId?: string;
    workloadId?: string;
  };

  annotations: {
    summary: string;
    description: string;
    metricKey: string;
    observedWindow: string;
    dashboardUrl: string;
    runbookUrl: string;
    currentValue?: string;
    threshold?: string;
  };

  startsAt: string;
  endsAt?: string | null;
  receivedAt: string;
}
```

Boundary rule:
- validate this DTO at the inbound adapter
- internal repository and domain code should receive already-normalized field names such as `scopeType`, `nodeId`, `metricKey`

### Repository boundary
The current `MonitoringStateRepository` is too narrow for the new read model.

Recommended replacement:

```ts
export abstract class AlertCurrentStateRepository {
  abstract findByFingerprint(
    fingerprint: string,
  ): Promise<AlertCurrentState | null>;

  abstract upsert(
    state: AlertCurrentState,
  ): Promise<void>;

  abstract listActiveByNodeId(
    nodeId: string,
  ): Promise<AlertCurrentState[]>;

  abstract listActiveByRackId(
    rackId: string,
  ): Promise<AlertCurrentState[]>;

  abstract listActiveByWorkloadId(
    workloadId: string,
  ): Promise<AlertCurrentState[]>;

  abstract listByStatus(
    status: AlertCurrentStateStatus,
  ): Promise<AlertCurrentState[]>;
}
```

Why this shape:
- `findByFingerprint` supports idempotent sync
- explicit scope queries support future dashboard enrichment
- no generic `findByScope(scopeType, scopeId)` because that would reintroduce ambiguous identity

### Query-facing projection boundary
For later dashboard use cases, a thinner read shape is useful.

```ts
export interface AlertCurrentStateSummary {
  fingerprint: string;
  alertName: string;
  scopeType: 'node' | 'rack' | 'workload';
  nodeId?: string;
  rackId?: string;
  workloadId?: string;
  severity: 'warning' | 'critical';
  status: 'firing' | 'resolved';
  summary: string;
  category: string;
  startsAt: string;
  incidentId?: string | null;
}
```

This summary shape should later back:
- rack state badges
- node overview alert blocks
- alert list screens

## Validation Rules

### Required per scope
- `scopeType=node`
  - require `nodeId`
  - require `rackId`
  - forbid `workloadId`
- `scopeType=rack`
  - require `rackId`
  - forbid `nodeId`
  - forbid `workloadId`
- `scopeType=workload`
  - require `workloadId`
  - require `nodeId`
  - require `rackId`

### Required common fields
- `fingerprint`
- `alertName`
- `severity`
- `status`
- `category`
- `environment`
- `team`
- `source`
- `summary`
- `description`
- `metricKey`
- `observedWindow`
- `dashboardUrl`
- `runbookUrl`
- `startsAt`
- `lastReceivedAt`

### State transition expectations
Allowed Task 4 transitions:
- new document -> `firing`
- existing `firing` -> `firing` update
- existing `firing` -> `resolved`
- existing `resolved` -> `firing` reopen if same fingerprint is reused by upstream

Task 3 only records that these transitions must be representable; Task 4 will implement them.

## Migration Direction
Recommended path:
1. add a new domain model and repository for `AlertCurrentState`
2. add a new Mongo collection `alert_current_states`
3. leave legacy `monitoring_states` untouched during Task 3
4. decide later whether legacy monitoring state should be deprecated or mapped forward
5. add triage and incident linkage fields only when incident-handoff work starts

Reason:
- safer than in-place mutation of a mismatched shape
- easier to test independently
- keeps rollback simple

## Risks
- If we keep `category` too narrow in code, runtime config and payloads will drift immediately.
- If we reuse `scopeId`, later query code will become ambiguous again.
- If we make repository methods too generic now, later dashboard tasks will pay the complexity cost.
- If we store raw webhook payload only, future APIs will need to parse at read time and the interface becomes easier to misuse.

## Recommended Next Step
After this interface design, the next planning slice should implement:
- new domain type `alert-current-state.ts`
- new repository port
- new Mongo schema and module registration
- a mapper from external alert contract fields into the new domain shape
