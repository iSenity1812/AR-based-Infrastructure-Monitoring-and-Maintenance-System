# Spec: Monitoring Service Alert Lifecycle MVP

## Assumptions I'm Making
1. This spec is for the `Monitoring Service` only, not `Incident Workflow Service`.
2. MVP stays deterministic and rule-based; AI, `ack`, suppression, and post-mortem are out of scope.
3. The service consumes shaped `snapshot` and optional `context` inputs through adapters, not raw Redis payloads in the domain layer.
4. The dashboard reads `health_summary` and open alerts as the source of truth for current state.

## Objective
Build the first production-shaped alert lifecycle for the monitoring control plane.

The MVP must let the service:
- ingest a normalized snapshot for one scope
- evaluate enabled current-state rules
- open a new alert when a rule first matches
- refresh the same alert when the match persists
- resolve the alert when the condition clears
- persist a scope-level `health_summary`
- publish lifecycle events for downstream consumers

Success means the dashboard can show current health and open alerts without recalculating state from raw telemetry on read.

## Tech Stack
- `NestJS` application layer
- TypeScript
- In-memory repositories for local tests
- Redis-backed latest snapshot adapter at the boundary only
- Existing MongoDB persistence behind repository ports

## Commands
- Dev: `pnpm -C backend/apps/control-plane/monitoring-service start:dev`
- Test: `pnpm -C backend/apps/control-plane/monitoring-service test -- --runInBand`
- Build: `pnpm -C backend/apps/control-plane/monitoring-service build`
- Lint: `pnpm -C backend/apps/control-plane/monitoring-service lint`

## Project Structure
- `src/domain/` -> alert, rule, snapshot, health, and fingerprint entities/value objects
- `src/application/use-cases/` -> ingestion and rule evaluation orchestration
- `src/adapters/inbound/` -> HTTP and Redis snapshot adapters
- `src/adapters/outbound/` -> repositories and event publisher implementations
- `src/application/use-cases/dto/` -> internal evaluation frame objects
- `src/**/*.spec.ts` -> unit and use-case tests colocated with source
- `docs/services/monitoring-service/` -> service-specific specs and design notes

## Code Style
Prefer small use-cases and explicit state transitions over hidden behavior.

```ts
if (match.matched) {
  alert = await this.openOrRefreshAlert(
    command.rule,
    frame,
    field,
    match.observedValue,
    match.comparableValue,
    fingerprint,
    existing,
  );
  alertAction =
    existing && existing.status !== AlertStatus.RESOLVED
      ? 'refreshed'
      : 'opened';
} else if (existing && existing.status !== AlertStatus.RESOLVED) {
  alert = await this.resolveAlert.execute({
    alertId: existing.id,
    resolvedAt: field?.observedAt ?? frame.updatedAt,
  });
  alertAction = 'resolved';
}
```

Conventions:
- keep controllers thin
- keep rule evaluation deterministic
- prefer explicit helper methods for lifecycle transitions
- treat `summary`, `status`, and `updatedAt` as business-visible fields
- avoid encoding Redis key shape into use-cases

## Testing Strategy
- Unit test the rule matcher for threshold, exact state, and capacity-relative comparisons
- Unit test lifecycle transitions for open, refresh, resolve, and recurrence
- Unit test health derivation for healthy, warning, and critical states
- Integration-style use-case tests for snapshot ingestion, duplicate delivery, and event publication
- Keep tests colocated with the source files they validate

Coverage focus:
- lifecycle transitions
- duplicate idempotency
- health summary derivation
- event publication from persisted outcomes

## Boundaries
- Always:
  - keep alert lifecycle deterministic
  - derive health from persisted alerts
  - publish events from persisted business outcomes
  - skip evaluation when required input is missing
  - run the monitoring-service test suite before merging
- Ask first:
  - adding `ack`, suppression, escalation, or time-window logic
  - changing repository contracts or persistence shape
  - adding a new inbound source beyond the snapshot adapter
  - changing dashboard read model contracts
- Never:
  - make AI the owner of alert truth
  - let Redis become a domain dependency
  - recalculate current alert state from raw telemetry at read time
  - merge incident workflow into monitoring lifecycle
  - remove tests to make the lifecycle look simpler

## Success Criteria
- A snapshot can be ingested for a single scope and evaluated against enabled rules
- The first matching rule opens exactly one alert
- A repeated matching snapshot refreshes the same open alert instead of creating duplicates
- A recovery snapshot resolves the open alert
- A resolved condition that appears again creates a new alert record
- `health_summary` updates correctly for healthy, warning, and critical scopes
- `monitoring.alert.opened`, `monitoring.alert.updated`, `monitoring.alert.resolved`, and `monitoring.health.changed` can be published from persisted outcomes
- Duplicate delivery does not create duplicate active alerts or duplicate occurrences

## Open Questions
- Do we want `Pending` in a later phase, or should alerts stay open immediately when the rule matches?
- Should `Acknowledged` live in Monitoring Service or move to Incident Workflow?
- Do we need suppression/cooldown to reduce alert fatigue before Phase 3?
- Should alert recurrence reuse the same fingerprint forever, or should some rule families get a new fingerprint per dimension?
