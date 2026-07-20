# Spec: Task 5 Rack Monitoring State API Backed By External Alert Read Model

## Assumptions I'm Making
1. This spec is only for `Task 5` in the delegated alerting plan: moving the rack monitoring state API onto the external-alert-backed read model.
2. `Task 3` and `Task 4` have already established `AlertCurrentState` persistence and an inbound sync path from `Alertmanager`.
3. The primary API in scope is `GET /monitoring/racks/state`.
4. `POST /monitoring/racks/poll` remains available in Task 5 as a debug or legacy endpoint, but it is no longer the intended truth path for rack alert state.
5. `GET /monitoring/racks/overview` and `GET /monitoring/nodes/:nodeId/overview` are not the primary implementation target of Task 5; they belong more directly to later enrichment tasks.
6. The new response design must be consumer-first, explicit, and self-descriptive, but must also remain backward-compatible for current dashboard consumers.
7. `Monitoring Service` still owns only the read-side composition of alert state. `Grafana` and `Alertmanager` remain the truth for detection, evaluation, grouping, and routing.

## Objective
Replace the current local-polling-backed rack monitoring state read path with a response composed from `AlertCurrentState`, while preserving a stable API migration path for current consumers.

Success for Task 5 means:
- `GET /monitoring/racks/state` no longer depends on local summary-rule evaluation or `MonitoringState` as its primary truth source
- the API reads from external-alert-backed current state in Mongo
- the API returns operator-friendly alert state, not only internal backend lifecycle fields
- the migration is backward-compatible through additive response design

## Locked Phase-1 Decisions
The following decisions are now considered fixed for Task 5 phase 1:

1. Compose rack state only from `scopeType = rack` alerts.
2. Preserve `view = "monitoring_state"` for compatibility.
3. Keep existing `operational` and `notification` fields at top-level during the first migration phase.
4. Add new consumer-first fields alongside the old fields instead of introducing a `legacy` block immediately.

## Tech Stack
- `NestJS 11`
- `TypeScript 5`
- `MongoDB` via `@nestjs/mongoose`
- Existing `AlertCurrentStateRepository`
- Existing rack enrichment via `RackContextProvider`
- Existing HTTP envelope conventions under `presentation/http/dto`

Relevant files:
- `backend/apps/control-plane/monitoring-service/src/presentation/http/controllers/rack-monitoring-state.controller.ts`
- `backend/apps/control-plane/monitoring-service/src/application/use-cases/get-rack-monitoring-state.use-case.ts`
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto/rack-monitoring-state-response.dto.ts`
- `backend/apps/control-plane/monitoring-service/src/application/ports/alert-current-state.repository.ts`
- `backend/apps/control-plane/monitoring-service/src/domain/alert-current-state.ts`

## Commands
- Build: `pnpm --dir backend/apps/control-plane/monitoring-service build`
- Lint: `pnpm --dir backend/apps/control-plane/monitoring-service lint`
- Test: `pnpm --dir backend/apps/control-plane/monitoring-service test`
- Coverage: `pnpm --dir backend/apps/control-plane/monitoring-service test:cov`
- E2E: `pnpm --dir backend/apps/control-plane/monitoring-service test:e2e`
- Dev: `pnpm --dir backend/apps/control-plane/monitoring-service start:dev`

## Project Structure
- `backend/apps/control-plane/monitoring-service/docs`
  Task-level specs and API evolution notes
- `backend/apps/control-plane/monitoring-service/src/application/use-cases`
  Rack monitoring state composition from alert read model
- `backend/apps/control-plane/monitoring-service/src/application/ports`
  Repository contracts used by the new read path
- `backend/apps/control-plane/monitoring-service/src/presentation/http/controllers`
  Rack monitoring state endpoint
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto`
  Current and evolved rack monitoring state response DTOs
- `backend/apps/control-plane/monitoring-service/src/infrastructure/database/mongodb`
  `AlertCurrentState` persistence already introduced in Tasks 3 and 4

## Code Style
Prefer explicit, consumer-facing alert semantics instead of leaking local implementation flags.

```ts
export interface RackAlertStateView {
  rackId: string;
  rackName: string;
  rackCode: string;
  state: {
    status: 'healthy' | 'alerting';
    highestSeverity: 'warning' | 'critical' | 'none';
    activeAlertCount: number;
    lastChangedAt: string | null;
  };
  alertSummary: {
    critical: number;
    warning: number;
  };
}
```

Conventions for this task:
- keep `data` and `meta` envelope stable
- prefer additive fields over breaking field replacement
- expose operator-facing alert terms such as `severity`, `status`, `summary`, and `primaryAlert`
- keep any legacy fields clearly marked as compatibility-oriented rather than truth-oriented

## Testing Strategy
- Use-case tests for composing rack state from one or more `AlertCurrentState` records
- Tests for rack-level aggregation:
  - no active alerts => healthy state
  - one warning alert => warning state
  - one critical alert => critical state
  - multiple alerts on same rack => highest severity and counts derived correctly
- Tests for compatibility mapping:
  - legacy fields remain present when required
  - new additive fields appear with expected values
- Controller tests for:
  - delegating to the new use case
  - preserving route/permission behavior

Priority concerns:
- no dependence on `MonitoringStateRepository` for rack truth
- deterministic aggregation for multiple alerts on the same rack
- compatibility-safe API evolution
- clear operator-facing response semantics

## Boundaries
- Always:
  - use `AlertCurrentState` as the primary source of rack alert truth
  - enrich rack rows with `RackContextProvider`
  - preserve the HTTP envelope shape
  - evolve the response additively for backward compatibility
- Ask first:
  - removing existing response fields outright
  - changing endpoint path or auth semantics
  - repurposing `/monitoring/racks/poll` into a different contract in Task 5
  - changing `rack overview` or `node overview` payloads in the same task
- Never:
  - move detection logic back into `Monitoring Service`
  - make local polling the primary alert truth again
  - couple Task 5 to incident creation or workflow ownership
  - break current consumers without an explicit migration step

## Current Problem
The current rack monitoring state API is backed by `MonitoringStateRepository` and therefore reflects local summary-rule evaluation and local notification-sync lifecycle rather than the external alert stack.

Current response problems:
- it is producer-shaped rather than consumer-first
- it exposes local semantics such as `severityCode`, `overrideFlag`, and `notification.syncStatus`
- it does not clearly show:
  - rack alert severity in external alert terms
  - primary alert context
  - active alert counts
  - active alert summaries or drill-down-ready metadata

As a result:
- the dashboard cannot trust this API as the main delegated-alerting source
- the response shape is harder for consumers to interpret correctly
- local polling remains too central in the runtime truth path

## Current APIs In Scope
### Primary API
- `GET /monitoring/racks/state`

Current response shape summary:
- envelope: `data`, `meta`
- top-level data fields:
  - `generatedAt`
  - `scope`
  - `view`
  - `items[]`
- each rack item currently contains:
  - `rackId`
  - `rackName`
  - `rackCode`
  - `operational`
  - `notification`

This is the main API to migrate in Task 5.

### Secondary / legacy debug API
- `POST /monitoring/racks/poll`

Current role:
- manual debug trigger for the local polling path
- useful for diagnostics, but no longer the intended truth source after Task 5

Task 5 expectation:
- keep it available
- do not remove it in the same task
- document it as a debug or legacy path

### Explicitly out of main scope
- `GET /monitoring/racks/overview`
- `GET /monitoring/nodes/:nodeId/overview`

These are relevant later but should not be the main target of Task 5 implementation.

## Proposed Read Path
### New source of truth for this API
`GetRackMonitoringStateUseCase` should compose response data from `AlertCurrentState` records that belong to rack scope.

Preferred source order:
1. `scopeType = rack` alerts for a rack
2. child `node` or `workload` alerts are out of phase-1 scope and can be considered in a later enrichment task

### Rack composition rules
For each rack:
- if there are no active rack alerts:
  - `state.status = healthy`
  - `highestSeverity = none`
  - `activeAlertCount = 0`
- if there is one or more active rack alerts:
  - `state.status = alerting`
  - `highestSeverity` is the strongest severity among active alerts
  - `activeAlertCount` is the number of active alerts on that rack
  - `primaryAlert` is selected deterministically

### Primary alert selection policy
Task 5 should choose one `primaryAlert` per rack using stable ordering:
1. highest severity first (`critical` before `warning`)
2. latest `lastStatusChangedAt` or `startsAt`
3. stable tie-breaker by `alertName`

This makes the response deterministic and easier for consumers to reason about.

## Proposed Response Evolution
Task 5 should **not** replace the old response with a breaking format immediately.

Instead, evolve it additively:
- keep the current envelope
- keep current rack identity fields
- add new consumer-first alert blocks
- optionally keep legacy operational fields during migration

### Phase-1 top-level data
```ts
type MonitoringRackStateResponseDto = {
  generatedAt: string;
  scope: 'rack';
  view: 'monitoring_state';
  items: RackAlertStateItemDto[];
};
```

### Recommended rack item shape
```ts
type RackAlertStateItemDto = {
  rackId: string;
  rackName: string;
  rackCode: string;
  operational: RackMonitoringOperationalStateDto;
  notification: RackMonitoringNotificationStateDto;
  state: {
    status: 'healthy' | 'alerting';
    highestSeverity: 'none' | 'warning' | 'critical';
    activeAlertCount: number;
    lastChangedAt: string | null;
  };
  alertSummary: {
    critical: number;
    warning: number;
  };
  primaryAlert: {
    fingerprint: string;
    alertName: string;
    severity: 'warning' | 'critical';
    category: string;
    status: 'firing' | 'resolved';
    summary: string;
    description: string;
    startsAt: string;
    endsAt: string | null;
    dashboardUrl: string | null;
    runbookUrl: string | null;
  } | null;
  activeAlerts: Array<{
    fingerprint: string;
    alertName: string;
    severity: 'warning' | 'critical';
    category: string;
    status: 'firing' | 'resolved';
    summary: string;
    startsAt: string;
  }>;
};
```

## API Design Principles For Task 5
### Consumer-first
The API should directly answer:
- is this rack alerting?
- how severe is it?
- how many active alerts are there?
- what is the most important alert to show?
- what are the active alerts if the UI wants drill-down?

### Backward compatibility
Task 5 should avoid breaking current consumers by:
- preserving envelope shape
- preserving identity fields
- preserving `view = "monitoring_state"`
- keeping `operational` and `notification` top-level in phase 1
- evolving response additively

### The Robustness Principle
- be conservative in what we send:
  - use explicit enums
  - stable field names
  - deterministic ordering
- be liberal in what we accept internally:
  - compose from external read model even if some optional fields are absent
  - tolerate missing optional URLs and annotation fields

### Explicit and self-descriptive
Field names should reveal intent:
- `highestSeverity`
- `activeAlertCount`
- `primaryAlert`
- `activeAlerts`
- `lastChangedAt`

Avoid requiring the consumer to understand internal backend lifecycle semantics.

## Migration Strategy
### Phase 5.1
- switch `GetRackMonitoringStateUseCase` to the new alert read model
- preserve current API envelope
- add new consumer-first fields
- optionally retain current `operational` and `notification` blocks

### Phase 5.2
- dashboard consumers move to the new fields
- old internal-lifecycle fields are marked legacy

### Later cleanup
- once consumers no longer depend on local lifecycle fields, remove or deprecate them in a separate task

## `/monitoring/racks/poll` After Task 5
Task 5 should not remove this endpoint.

Expected role after migration:
- manual debug trigger for legacy/local path
- diagnostic endpoint for validating old polling behavior during transition
- not the source of truth for rack alert state

## Success Criteria
- A task-level spec exists for migrating rack monitoring state to the external alert read model
- `GET /monitoring/racks/state` is explicitly defined as the primary Task 5 API target
- The spec clearly distinguishes in-scope and out-of-scope APIs
- The spec defines a consumer-first, backward-compatible response evolution path
- The spec states that `AlertCurrentState` is the primary rack alert source for this API
- The spec leaves `POST /monitoring/racks/poll` in place as a legacy/debug path
