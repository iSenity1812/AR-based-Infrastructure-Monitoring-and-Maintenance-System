# Implementation Plan: Monitoring Service Alert Lifecycle MVP

## Overview
This plan implements the first deterministic alert lifecycle for `Monitoring Service`. The goal is to turn normalized snapshot/context input into persisted alert state, scope health summaries, and lifecycle events that the dashboard can trust without recalculating state from raw telemetry.

The MVP intentionally stays narrow:
- ingest one scope snapshot at a time
- evaluate enabled current-state rules
- open, refresh, or resolve alerts
- persist a scope health summary
- publish business events from persisted outcomes

Pending, acknowledgment, suppression, incident workflow, and post-mortem handling are explicitly deferred.

## Architecture Decisions
- Keep `Monitoring Service` as the owner of alert rules, alerts, alert occurrences, and health summaries.
- Treat Redis as an inbound adapter detail for latest-snapshot materialization, not as a domain dependency.
- Use a deterministic evaluation frame that combines snapshot and optional context before rule matching.
- Keep alert fingerprinting business-oriented and stable across duplicate deliveries.
- Derive dashboard health from persisted alerts and `health_summary`, not from read-time recalculation.

## Task List

### Phase 1: Contract and evaluation foundation
- [ ] Task 1: Lock the normalized input contract for snapshot and context
  - Description: Confirm the snapshot/context shapes the monitoring domain consumes and keep adapter-specific payload normalization outside the use-cases.
  - Acceptance criteria:
    - [ ] Snapshot input includes scope identity, metrics, batch sequence, updatedAt, and optional delivery identity.
    - [ ] Context input can resolve fields by metric key without exposing Redis keys to the domain.
    - [ ] Evaluation code depends on the normalized input contract only.
  - Verification:
    - [ ] Unit tests compile and pass for input entity helpers.
    - [ ] No use-case imports Redis payload types directly.
  - Dependencies: None
  - Files likely touched:
    - `backend/apps/control-plane/monitoring-service/src/domain/entities/monitoring-input.entity.ts`
    - `backend/apps/control-plane/monitoring-service/src/adapters/inbound/http/dto/monitoring-input-request.dto.ts`
    - `backend/apps/control-plane/monitoring-service/src/adapters/inbound/derived-state/redis-latest-snapshot.adapter.ts`
  - Estimated scope: M

- [ ] Task 2: Define the internal evaluation frame and rule matching behavior
  - Description: Build the internal object that bundles snapshot and context for rule evaluation and ensure the matcher handles threshold, state/status, and capacity-relative rules deterministically.
  - Acceptance criteria:
    - [ ] The frame exposes scope identity, timing, observed field, and context field helpers.
    - [ ] Missing metric input skips evaluation for that rule.
    - [ ] Missing context skips capacity-relative evaluation without guessing a baseline.
    - [ ] Threshold and exact-match comparisons are deterministic.
  - Verification:
    - [ ] Rule-match unit tests pass for threshold, state, capacity-relative, and skip cases.
  - Dependencies: Task 1
  - Files likely touched:
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/dto/current-state-evaluation-frame.ts`
    - `backend/apps/control-plane/monitoring-service/src/domain/services/rule-match.service.ts`
    - `backend/apps/control-plane/monitoring-service/src/domain/services/rule-match.service.spec.ts`
  - Estimated scope: M

### Checkpoint: Foundation
- [ ] Evaluation inputs are normalized and adapter-agnostic.
- [ ] Rule matcher passes unit coverage for the MVP rule families.
- [ ] No alert lifecycle code depends on raw Redis payload shape.

### Phase 2: Alert lifecycle core
- [ ] Task 3: Implement alert identity and lifecycle transitions
  - Description: Make alert fingerprinting stable and implement the open / refresh / resolve transitions in the alert entity and use-cases.
  - Acceptance criteria:
    - [ ] A rule match opens one alert when no active alert exists.
    - [ ] A repeated match refreshes the same active alert.
    - [ ] A recovery resolves the active alert.
    - [ ] A resolved recurrence creates a new alert instead of reopening the old one.
  - Verification:
    - [ ] Ingestion integration tests cover open, refresh, resolve, and recurrence.
    - [ ] Duplicate active alerts are not created for the same fingerprint.
  - Dependencies: Task 2
  - Files likely touched:
    - `backend/apps/control-plane/monitoring-service/src/domain/entities/monitoring-alert.entity.ts`
    - `backend/apps/control-plane/monitoring-service/src/domain/value-objects/alert-fingerprint.vo.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/open-alert.use-case.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/refresh-alert.use-case.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/resolve-alert.use-case.ts`
  - Estimated scope: M

- [ ] Task 4: Wire snapshot ingestion to lifecycle evaluation
  - Description: Connect ingestion to the normalized evaluation path, including duplicate delivery handling and context lookup for capacity-relative rules.
  - Acceptance criteria:
    - [ ] Duplicate deliveries do not create duplicate active alerts or occurrences.
    - [ ] Snapshot ingestion filters out rules with no applicable input.
    - [ ] Capacity-relative rules can resolve their baseline from context.
  - Verification:
    - [ ] Snapshot ingestion tests pass for duplicate delivery, empty rule set, and capacity-relative evaluation.
  - Dependencies: Task 3
  - Files likely touched:
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/ingest-monitoring-snapshot.use-case.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/ingest-monitoring-snapshot.use-case.spec.ts`
    - `backend/apps/control-plane/monitoring-service/src/adapters/outbound/persistence/in-memory/in-memory-alert.repository.ts`
  - Estimated scope: M

### Checkpoint: Core Features
- [ ] Alert lifecycle works end-to-end from snapshot ingestion to resolved state.
- [ ] Duplicate deliveries remain idempotent.
- [ ] The system can explain why a rule was skipped or matched.

### Phase 3: Health and events
- [ ] Task 5: Persist authoritative health summaries
  - Description: Recompute and persist one health summary per scope from active alerts only.
  - Acceptance criteria:
    - [ ] Healthy means no open alerts.
    - [ ] Warning means at least one warning alert and no critical alert.
    - [ ] Critical means at least one critical alert is open.
    - [ ] Health summary is updated as part of the alert lifecycle flow.
  - Verification:
    - [ ] Health derivation tests pass.
    - [ ] Dashboard-facing read use-cases return persisted health data.
  - Dependencies: Task 4
  - Files likely touched:
    - `backend/apps/control-plane/monitoring-service/src/domain/services/health-status-derivation.service.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/evaluate-current-state-rule.use-case.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/queries/get-health-overview.use-case.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/queries/get-health-summary.use-case.ts`
  - Estimated scope: M

- [ ] Task 6: Publish lifecycle events from persisted business outcomes
  - Description: Publish alert and health events only after the repository changes have been accepted.
  - Acceptance criteria:
    - [ ] `alert.opened` is published on new alert creation.
    - [ ] `alert.updated` is published on meaningful refresh.
    - [ ] `alert.resolved` is published on resolution.
    - [ ] `health.changed` is published only when the summary actually changes.
  - Verification:
    - [ ] Event-publisher tests pass.
    - [ ] No event is emitted from raw input alone.
  - Dependencies: Task 5
  - Files likely touched:
    - `backend/apps/control-plane/monitoring-service/src/domain/ports/event-publisher.port.ts`
    - `backend/apps/control-plane/monitoring-service/src/adapters/outbound/events/*`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/evaluate-current-state-rule.use-case.ts`
    - `backend/apps/control-plane/monitoring-service/src/application/use-cases/commands/refresh-alert.use-case.ts`
  - Estimated scope: M

### Checkpoint: Complete
- [ ] All lifecycle states required by MVP work end-to-end.
- [ ] Health summary and open alerts are authoritative for dashboard reads.
- [ ] All targeted tests pass.
- [ ] No pending/ack/post-mortem logic has leaked into MVP scope.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Alert lifecycle gets mixed with incident workflow | High | Keep MVP scope limited to monitoring truth; move `ack` and post-mortem out of the service |
| Duplicate delivery creates duplicate alerts | High | Stable fingerprinting plus repository-side deduplication |
| Capacity-relative rules misread baseline data | Medium | Require normalized context lookup and skip when context is missing |
| Health summary becomes a read-time recomputation | High | Persist summary from lifecycle changes and keep dashboard reads simple |
| Event noise from refreshes | Medium | Only publish refresh events when summary or visible state actually changes |

## Open Questions
- Should `Pending` ever become a real alert state, or stay as a future detection policy?
- Should `Acknowledged` live in Monitoring Service or move entirely to Incident Workflow?
- Do we want suppression/cooldown before Phase 3 to reduce alert fatigue?
- Should alert recurrence always create a new alert, or do some rule families need rule-specific reopen semantics?
