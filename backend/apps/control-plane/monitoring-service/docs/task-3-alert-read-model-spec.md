# Spec: Task 3 Alert Current State Read Model

## Assumptions I'm Making
1. This spec is only for `Task 3` in the delegated alerting plan, not for the full inbound sync implementation.
2. `Monitoring Service` should own a read-side current alert state model backed by external alerting events from `Grafana` and `Alertmanager`.
3. The existing `scopeId` field should not remain the primary identity shape for the new model because the alerting contract now prefers explicit keys such as `node_id`, `rack_id`, `workload_id`, and now has a service-scoped runtime path to account for.
4. `Monitoring Service` must not become the owner of incident workflow truth; it may only keep lightweight linkage fields for future triage/read-side composition.
5. The existing `monitoring-state` model is a useful migration reference, but Task 3 is allowed to evolve or replace that shape if the new contract needs it.
6. Initial persistence will remain in the service-owned MongoDB boundary already used by `monitoring-service`.

## Objective
Define the read model that `Monitoring Service` will use to store the current state of externally-evaluated alerts so dashboard-serving APIs can later read a stable, backend-owned projection instead of depending on local polling or local rule evaluation.

Success for Task 3 means:
- the service has a clearly-specified `current alert state` model
- the model is aligned with the external alert contract already defined for `Grafana`/`Alertmanager`
- the model preserves monitoring ownership and does not absorb incident workflow ownership
- the model is shaped to support later dashboard APIs such as rack state, node overview, alert list, and alert detail

## Tech Stack
- `NestJS 11`
- `TypeScript 5`
- `MongoDB` via `@nestjs/mongoose` and `mongoose`
- Existing monitoring domain and repository patterns under `backend/apps/control-plane/monitoring-service/src`

Relevant existing code:
- `src/application/ports/external-alerting-v1.contract.ts`
- `src/domain/monitoring-state.ts`
- `src/infrastructure/database/mongodb/monitoring-state.schema.ts`

## Commands
- Build: `pnpm --dir backend/apps/control-plane/monitoring-service build`
- Lint: `pnpm --dir backend/apps/control-plane/monitoring-service lint`
- Test: `pnpm --dir backend/apps/control-plane/monitoring-service test`
- Coverage: `pnpm --dir backend/apps/control-plane/monitoring-service test:cov`
- E2E: `pnpm --dir backend/apps/control-plane/monitoring-service test:e2e`
- Dev: `pnpm --dir backend/apps/control-plane/monitoring-service start:dev`

## Project Structure
- `backend/apps/control-plane/monitoring-service/docs`
  Task-level specs and service design notes
- `backend/apps/control-plane/monitoring-service/src/domain`
  Core domain types and entities such as `monitoring-state`
- `backend/apps/control-plane/monitoring-service/src/application/ports`
  Repository and contract boundaries
- `backend/apps/control-plane/monitoring-service/src/application/use-cases`
  Use-case orchestration for read and write flows
- `backend/apps/control-plane/monitoring-service/src/infrastructure/database/mongodb`
  Mongo schemas and repository adapters
- `backend/apps/control-plane/monitoring-service/src/presentation/http`
  Dashboard-serving controllers and DTOs that will later consume the new read model

## Code Style
Use small explicit types with scope-specific keys instead of overloaded generic identifiers.

```ts
export interface AlertScopeIdentity {
  scopeType: 'node' | 'rack' | 'workload' | 'service';
  nodeId?: string;
  rackId?: string;
  workloadId?: string;
  serviceId?: string;
}

export interface AlertCurrentState extends AlertScopeIdentity {
  fingerprint: string;
  alertName: string;
  severity: 'warning' | 'critical';
  status: 'firing' | 'resolved';
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  lastReceivedAt: string;
}
```

Conventions for this task:
- prefer explicit field names such as `nodeId`, `rackId`, `workloadId`, and `serviceId`
- avoid reintroducing `scopeId` as the main query or identity field
- preserve clear separation between external alert metadata and monitoring-owned read-side metadata
- keep enums/string unions narrow and aligned with the external alert contract

## Testing Strategy
- Unit tests for domain factory or mapper behavior that constructs the new read model shape
- Repository mapping tests for Mongo schema serialization/deserialization
- Contract-level tests that confirm required fields for `node`, `rack`, `workload`, and `service` alert scopes
- No full sync-flow tests are required in Task 3; those belong mainly to Task 4

Priority test concerns for Task 3:
- required identity fields are present for each `scope_type`
- `fingerprint` and external alert identity fields are stored without ambiguity
- resolved alerts retain enough timing information to serve dashboard history/status needs
- triage/linkage fields remain read-side only

## Boundaries
- Always:
  - align the model with `external-alerting-v1.contract.ts`
  - keep persistence inside the `Monitoring Service` MongoDB boundary
- model scope identity using explicit keys such as `node_id`, `rack_id`, `workload_id`, and `serviceId`
  - preserve enough timestamps and external identifiers for later idempotent sync
- Ask first:
  - changing public HTTP API contracts in this task
  - introducing a separate collection instead of evolving the existing monitoring-state persistence path
  - introducing historical alert event storage in addition to current state
  - adding new external dependencies or libraries
- Never:
  - make `Monitoring Service` the source of truth for incident workflow
  - put dynamic presentation-only fields into the identity/fingerprint model
  - depend on direct database reads from other services
  - reintroduce `scopeId` as a duplicate of `nodeId`

## Current Problem
The current `monitoring-state` model is shaped around local monitoring lifecycle and notification sync semantics:
- `scopeId`
- `scopeKey`
- `severityCode`
- `notificationSyncStatus`
- `overrideFlag`

That shape is not sufficient as the canonical read model for delegated alerting because:
- it does not preserve the external alert contract in a first-class way
- it does not model `alertname`, `summary`, `description`, and external labels/annotations cleanly
- it assumes a local severity-code lifecycle instead of explicit external alert status transitions
- it does not clearly distinguish monitoring-owned read-side fields from future workflow linkage fields

## Proposed Read Model
Task 3 defines a new logical model called `AlertCurrentState`.

This model represents one current alert instance as known by `Monitoring Service` after sync from the external alerting stack.

### Core identity fields
- `fingerprint`
  Stable external alert instance identity from Grafana/Alertmanager payload
- `alertName`
  Value from `labels.alertname`
- `scopeType`
  One of `node`, `rack`, `workload`, `service`
- `nodeId`
  Required for `scopeType=node` and `scopeType=workload`
- `rackId`
  Required for `scopeType=node`, `scopeType=rack`, and `scopeType=workload` when available by contract
- `workloadId`
  Required for `scopeType=workload`
- `serviceId`
  Required for `scopeType=service`

### External alert state fields
- `status`
  External current state, initially `firing` or `resolved`
- `severity`
  `warning` or `critical`
- `category`
  External category such as `availability`, `resource`, `thermal`, `runtime`, `network`, `connectivity`
- `environment`
- `team`
- `source`
  Expected to remain `grafana`

### Human-readable context fields
- `summary`
- `description`
- `metricKey`
- `observedWindow`
- `currentValue`
- `threshold`
- `dashboardUrl`
- `runbookUrl`

### External timing fields
- `startsAt`
- `endsAt`
- `lastReceivedAt`

### Monitoring-owned read-side fields
- `firstSyncedAt`
- `lastSyncedAt`
- `lastStatusChangedAt`
- `syncVersion` or equivalent monotonic update field if needed

### Future linkage fields
These fields are intentionally deferred from the first persistence slice and remain future read-side extensions only:
- `triageStatus`
  Example values later: `new`, `acknowledged`, `escalated`
- `incidentId`
- `lastEscalatedAt`

## Proposed Persistence Rules
- One document represents one current alert instance keyed by `fingerprint`
- `fingerprint` is the primary upsert key for Task 4 unless later design proves a composite key is needed
- Documents keep current state, not a full occurrence history
- Resolved alerts may remain stored for dashboard visibility and later filter/detail use, rather than being hard-deleted immediately

Suggested index direction:
- unique index on `fingerprint`
- query indexes on:
  - `scopeType + nodeId`
  - `scopeType + rackId`
  - `scopeType + workloadId`
  - `scopeType + serviceId`
  - `status + severity`
  - `alertName + status`

## Relationship To Existing Monitoring State
Task 3 does not require the team to delete the current `monitoring-state` shape immediately.

Instead, this spec proposes one of these implementation-safe evolutions:
- evolve the existing `MonitoringState` entity/schema into `AlertCurrentState` semantics, or
- introduce a new alert-current-state document shape and keep legacy monitoring-state temporarily during migration

Recommendation:
- prefer a dedicated alert-current-state shape or a clearly-renamed evolution path
- do not keep `scopeId` as the main business key in the new design
- if `scopeKey` remains, it should be derived from explicit scope fields and used only as a secondary query helper

## Scope Identity Rules
- `scopeType=node`
  - required: `nodeId`, `rackId`
  - forbidden as primary key: standalone `scopeId`
- `scopeType=rack`
  - required: `rackId`
- `scopeType=workload`
  - required: `workloadId`, `nodeId`, `rackId`
- `scopeType=service`
  - required: `serviceId`

This keeps the model aligned with the current external alert scope contracts and avoids duplicate identity semantics.

## Ownership Boundary With Incident Service
`Monitoring Service` owns:
- alert current-state read model
- alert-to-dashboard composition semantics
- lightweight triage/read-side linkage fields

`Incident Workflow Service` owns:
- incident lifecycle
- comments
- workflow state transitions
- operator collaboration truth

Task 3 must not add:
- assignment workflow
- incident SLA state
- ticket synchronization truth

## Success Criteria
- A task-level spec exists in the repository for the alert current-state read model
- The model explicitly uses `fingerprint` plus scope-specific keys instead of relying on `scopeId` as the main identity
- Required fields for `node`, `rack`, `workload`, and `service` alert scopes are documented
- The model documents both external alert fields and monitoring-owned read-side fields
- The spec clearly separates monitoring read ownership from incident workflow ownership
- The spec is implementation-ready for Task 4 inbound sync work

## Open Questions
- Should resolved alert documents be retained indefinitely, TTL-expired, or archived later to another collection?
- Do we want `category` unions in code to expand now for `network` and `connectivity`, or keep them as a later contract update?
- Should Task 3 evolve the existing `monitoring_states` collection in place or introduce a new collection such as `alert_current_states`?
- When Task 4 maps service-scoped external alerts, should the upstream `workload_id` label be normalized into `serviceId` at the mapper boundary, or should infra later emit a dedicated `service_id` label?
