# Implementation Plan: Monitoring Polling-First Phase 1

## Overview

This plan turns the approved monitoring spec into an implementable sequence for `backend/apps/control-plane/monitoring-service`. Phase 1 delivers a polling-first monitoring flow that reads ClickHouse summary views, evaluates internal monitoring state, bridges actionable transitions to Alertmanager, and exposes backend-composed monitoring payloads for dashboard and Socket.IO consumers.

## Architecture Decisions

- `monitoring-service` owns polling orchestration, monitoring state transitions, Alertmanager bridging, and realtime composition.
- `ClickHouse summary views` are the primary rule-evaluation source for phase 1.
- `ClickHouse live views` are detail/explainability sources, not primary alert rule inputs.
- `Alertmanager` remains the notification lifecycle engine, not the operational truth source.
- The first vertical slice should prove `rack` monitoring end-to-end before scaling the same pattern to `service`, `node`, and `container`.
- Trend/history-based sustained rules are deferred until the current-summary flow is stable.
- Existing `rack overview` read-side ports and adapters should be reused where they already match the rack monitoring input needs, rather than recreated under new names.

## Dependency Graph

```text
Monitoring state contract
    |
    +-- ClickHouse query adapters
    |       |
    |       +-- Polling use case
    |       |       |
    |       |       +-- Monitoring state persistence
    |       |       |       |
    |       |       |       +-- Alertmanager bridge
    |       |       |       +-- REST query endpoints
    |       |       |       +-- Socket.IO state push
    |       |
    |       +-- Explainability query adapters
    |
    +-- Rule model and transition policy
```

Implementation order follows this graph: contracts and adapters first, then orchestration, then outward delivery.

## Task List

### Phase 1: Foundation

## Task 1: Define monitoring domain state contract

**Description:** Create the core domain model for internal monitoring state, including scope identity, severity, lifecycle timestamps, culprit references, and sync metadata needed for Alertmanager bridging.

**Acceptance criteria:**
- [ ] A domain-level monitoring state model exists for `rack`, `service`, `node`, and `container`.
- [ ] The model distinguishes `operational state` from `notification sync state`.
- [ ] A state fingerprint strategy is defined to deduplicate repeated polling matches.

**Verification:**
- [ ] Domain tests pass for state creation and equality/fingerprint behavior.
- [ ] Manual check: contract fields match the approved monitoring spec.

**Dependencies:** None

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/domain/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 2: Define rule evaluation contract for summary-first polling

**Description:** Add the application/domain contract for summary-based rule evaluation so the service can consume current-summary rows without recomputing ClickHouse semantics in application code.

**Acceptance criteria:**
- [ ] A summary-rule input contract exists for `rack_current_summary`, `service_current_summary`, `node_current_summary`, and `container_current_summary`.
- [ ] Rule outputs include at minimum: target scope, severity, candidate state, culprit references, and transition intent.
- [ ] The contract explicitly avoids raw telemetry or metric-series-first evaluation in phase 1.

**Verification:**
- [ ] Unit tests pass for mapping summary payloads into rule inputs.
- [ ] Manual check: no contract requires raw telemetry fields.

**Dependencies:** Task 1

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/domain/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 3: Define infrastructure ports for monitoring persistence and alert delivery

**Description:** Add only the missing clean-architecture ports needed for phase 1. Reuse existing read-side ports such as `RackOverviewReadRepository` and `RackContextProvider` where they already fit the rack vertical slice, and define new ports only for capabilities not yet modeled.

**Acceptance criteria:**
- [ ] Existing rack read-side ports are explicitly marked for reuse in the rack monitoring slice.
- [ ] New ports exist for monitoring state persistence and Alertmanager delivery.
- [ ] If a new polling-oriented read port is needed later for non-rack scopes, it is introduced only when the existing rack overview port no longer fits.

**Verification:**
- [ ] Type checks/build passes for reused and newly added ports.
- [ ] Manual check: the plan does not duplicate `RackOverviewReadRepository` semantics under a second rack-specific read contract.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/src/domain/...`

**Estimated scope:** Small

## Task 4: Define rack summary to monitoring-state mapper

**Description:** Introduce an application/domain mapper that converts the existing `RackOverviewCurrentRackRecord` read contract into the new monitoring domain candidate/state input. This creates the bridge between the existing rack overview vertical slice and the new monitoring lifecycle model.

**Acceptance criteria:**
- [ ] A mapper exists from `RackOverviewCurrentRackRecord` to the monitoring rule/state input contract.
- [ ] Culprit, severity, blast-radius, and summary timestamp fields are preserved.
- [ ] The mapper does not pull in rack asset context enrichment concerns.

**Verification:**
- [ ] Mapper tests pass for representative rack summary rows.
- [ ] Manual check: one rack overview row can be transformed into a monitoring candidate without additional ClickHouse queries.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/src/domain/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Small

### Checkpoint: Foundation

- [ ] Domain and application contracts are stable.
- [ ] No infrastructure-specific logic has leaked into domain rules.
- [ ] The team can point to one clear internal monitoring state model.
- [ ] Existing rack overview contracts are reused intentionally instead of being duplicated.

### Phase 2: Rack Vertical Slice

## Task 5: Reuse existing rack overview ClickHouse adapter for polling reads

**Acceptance criteria:**
- [ ] The existing rack read adapter is evaluated and either reused directly or extended minimally for polling needs.
- [ ] If incremental polling by `summary_ts` is missing, the gap is documented and added without replacing the current rack overview repository abstraction.
- [ ] The reused adapter preserves culprit and blast-radius fields needed by rules and UI.

**Verification:**
- [ ] Adapter tests pass with mocked ClickHouse responses.
- [ ] Manual check: one returned row from the existing rack repository flows into the monitoring mapper cleanly.

**Dependencies:** Tasks 3-4

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 6: Implement rack polling use case and transition logic

**Description:** Create the first polling use case for racks that fetches incremental summary rows, evaluates rule conditions, and produces internal monitoring state transitions.

**Acceptance criteria:**
- [ ] Rack polling evaluates summary rows without using raw telemetry or live metric rows.
- [ ] State transitions support at least `healthy -> active` and `active -> resolved`.
- [ ] Repeated identical rack states are deduplicated via fingerprint or equivalent transition guard.

**Verification:**
- [ ] Use-case tests pass for new, repeated, and resolved rack scenarios.
- [ ] Manual check: a critical rack row yields one actionable monitoring transition.

**Dependencies:** Tasks 1-5

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/src/domain/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 7: Implement monitoring state repository for rack transitions

**Description:** Persist the internal monitoring state so the service can remember previous transitions, deduplicate subsequent polling cycles, and continue operating even if Alertmanager is unavailable.

**Acceptance criteria:**
- [ ] Monitoring state repository supports upsert/read-by-scope for rack states.
- [ ] Repository stores transition timestamps and sync state.
- [ ] Polling use case can compare current evaluation with previously persisted state.

**Verification:**
- [ ] Repository tests pass for insert, update, and lookup behavior.
- [ ] Manual check: repeated identical rack evaluations do not create duplicate active states.

**Dependencies:** Tasks 3 and 6

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

### Checkpoint: Rack Core

- [ ] Rack summary polling works end-to-end within the service boundary.
- [ ] Internal monitoring state can be created and updated deterministically.
- [ ] Duplicate polling cycles do not produce duplicate transitions.

### Phase 3: Alert Bridge and Delivery

## Task 8: Implement Alertmanager bridge for firing and resolved rack transitions

**Description:** Add the first Alertmanager integration path that receives deduplicated rack transitions and emits `firing` or `resolved` notifications with stable labels and annotations.

**Acceptance criteria:**
- [ ] Active rack transitions are mapped to `firing` payloads.
- [ ] Resolved rack transitions are mapped to `resolved` payloads.
- [ ] Alert labels are stable enough to support lifecycle continuity in Alertmanager.

**Verification:**
- [ ] Alert bridge tests pass with mocked HTTP delivery.
- [ ] Manual check: one active transition and one resolved transition generate the expected outbound payloads.

**Dependencies:** Task 7

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 8A: Set up and validate Alertmanager runtime configuration for phase-1 monitoring

**Description:** Add the operational setup task for Alertmanager so the phase-1 monitoring slice has a real notification lifecycle target, not just a code-level HTTP bridge. This task should produce a working `alertmanager.yml` (or environment-equivalent configuration source), define routing/grouping behavior for phase-1 monitoring alerts, and document how the team validates the configuration before wiring the backend into a live deployment.

**Acceptance criteria:**
- [ ] An Alertmanager configuration source exists for the project and includes at minimum:
  - a root `route`
  - one or more `receivers`
  - grouping timers such as `group_wait`, `group_interval`, and `repeat_interval`
  - any required `inhibit_rules` or explicit decision to defer them
- [ ] The routing tree has a stable default receiver for phase-1 monitoring alerts emitted by `monitoring-service`.
- [ ] The project documents how Alertmanager is started, where the config lives, and how config validation/routing checks are performed before runtime use.
- [ ] The backend Alertmanager bridge contract is checked against the configured route labels so emitted alerts can actually match the intended receivers.

**Verification:**
- [ ] Config validation succeeds with the project-chosen validation flow, for example `amtool check-config` and/or `amtool config routes test` against the configured file.
- [ ] Manual check: one representative rack alert label set is confirmed to match the expected receiver path in the routing tree.
- [ ] Manual check: grouping and repeat behavior are explicitly reviewed so the initial production slice does not spam operators.

**Dependencies:** Task 8

**Files likely touched:**
- `backend/apps/...`
- `infra/...`
- `docs/...`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`

**Estimated scope:** Medium

## Task 9: Expose rack monitoring state via backend read endpoint

**Description:** Add a presentation-layer endpoint for the dashboard to fetch internal rack monitoring state together with enough metadata to distinguish operational state from Alertmanager sync state.

**Acceptance criteria:**
- [ ] A rack monitoring endpoint returns backend-owned operational monitoring state.
- [ ] The payload distinguishes `operational severity/state` from `alert sync/notification state`.
- [ ] The endpoint does not proxy Alertmanager as the sole truth source.

**Verification:**
- [ ] Endpoint tests pass for response shape and service wiring.
- [ ] Manual check: one rack response can render `Critical + Firing` or `Critical + Silenced` style combinations.

**Dependencies:** Tasks 7-8

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/presentation/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 10: Emit Socket.IO updates for meaningful rack monitoring state changes

**Description:** Push realtime backend-composed monitoring state deltas when rack state changes materially, without streaming raw telemetry or duplicating every polling heartbeat.

**Acceptance criteria:**
- [ ] Socket events emit only on meaningful rack state changes.
- [ ] Event payloads are derived from internal monitoring state, not raw ClickHouse rows.
- [ ] Clients can use the event to update overview UI without a full page refresh.

**Verification:**
- [ ] Realtime tests pass with mocked gateway emissions.
- [ ] Manual check: a single rack transition generates one UI-facing delta event.

**Dependencies:** Tasks 7 and 9

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/presentation/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

### Checkpoint: Rack End-to-End

- [ ] Rack polling, persistence, alert bridge, Alertmanager runtime/config, REST read, and Socket.IO push work together.
- [ ] The system can show operational state and notification state separately.
- [ ] The first production slice is reviewable with stakeholders before multi-scope rollout.

### Phase 4: Expand to Service, Node, and Container

## Task 11: Add service summary polling vertical slice

**Description:** Reuse the rack pattern for `service_current_summary`, including query adapter, rule mapping, and persistence/bridge wiring for service monitoring.

**Acceptance criteria:**
- [ ] Services can be polled incrementally from summary views.
- [ ] Service degraded/down transitions are represented in internal monitoring state.
- [ ] Service alerts reuse the same lifecycle pattern as rack alerts.

**Verification:**
- [ ] Service polling tests pass.
- [ ] Manual check: a service-down summary row produces one service monitoring transition.

**Dependencies:** Tasks 5-10

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 12: Add node summary polling vertical slice

**Description:** Extend the pattern to `node_current_summary`, focusing on host-level monitoring states and summary-based alert conditions.

**Acceptance criteria:**
- [ ] Node summary polling works with the same internal state contract.
- [ ] Node-specific severity and culprit fields are preserved for diagnosis.
- [ ] Node transitions can be queried and delivered alongside rack/service states.

**Verification:**
- [ ] Node polling tests pass.
- [ ] Manual check: one critical node summary row is persisted and exposed correctly.

**Dependencies:** Tasks 5-10

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 13: Add container summary polling vertical slice

**Description:** Extend the same monitoring path to `container_current_summary` so runtime-level issues can appear in internal monitoring state and UI drill-downs.

**Acceptance criteria:**
- [ ] Container summary polling works with the shared monitoring contracts.
- [ ] Non-running/unhealthy container states can produce monitoring transitions.
- [ ] Container state can be filtered or scoped under service/node views in later API work.

**Verification:**
- [ ] Container polling tests pass.
- [ ] Manual check: one unhealthy container summary row yields a container monitoring transition.

**Dependencies:** Tasks 5-10

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

### Checkpoint: Multi-Scope Coverage

- [ ] Rack, service, node, and container all follow the same summary-first monitoring pattern.
- [ ] Shared contracts remain stable across scopes.
- [ ] No scope required falling back to raw telemetry for phase-1 alert evaluation.

### Phase 5: Detail and Monitoring UX Completion

## Task 14: Add live-detail query adapters for drill-down explainability

**Description:** Implement read adapters for `*_current_live` so detail endpoints can explain why an entity is unhealthy without changing the summary-first alert pipeline.

**Acceptance criteria:**
- [ ] Live-detail reads exist for the scopes required by dashboard drill-down.
- [ ] Explainability payloads can show metric-level reasons and culprit context.
- [ ] Alert evaluation remains summary-first even after live-detail support is added.

**Verification:**
- [ ] Detail query adapter tests pass.
- [ ] Manual check: a detail request returns metric-level context matching summary culprit fields.

**Dependencies:** Tasks 9-13

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/infrastructure/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

## Task 15: Add composed monitoring detail endpoint

**Description:** Expose a detail endpoint that combines summary state, live explainability, and the current internal monitoring status for operator drill-down.

**Acceptance criteria:**
- [ ] Detail API combines summary and live sources without exposing raw ClickHouse schemas directly.
- [ ] The response clearly separates health state, culprit context, and alert lifecycle metadata.
- [ ] The endpoint supports at least rack and service drill-down in phase 1.

**Verification:**
- [ ] Endpoint tests pass for composed detail payload shape.
- [ ] Manual check: operator can inspect one unhealthy entity and understand both what is wrong and why.

**Dependencies:** Task 14

**Files likely touched:**
- `backend/apps/control-plane/monitoring-service/src/presentation/...`
- `backend/apps/control-plane/monitoring-service/src/application/...`
- `backend/apps/control-plane/monitoring-service/test/...`

**Estimated scope:** Medium

### Checkpoint: Phase 1 Complete

- [ ] All accepted phase-1 scopes are polled from summary views.
- [ ] Internal monitoring state is the backend truth for operational health.
- [ ] Alertmanager receives deduplicated lifecycle transitions.
- [ ] REST and Socket.IO both expose backend-composed monitoring state.
- [ ] Detail views use live adapters only for explainability, not primary alert evaluation.

## Risks and Mitigations

## Phase-1 Checkpoint Strategy Note

- `PollRackMonitoringUseCase` accepts an optional `changedSinceSummaryTs`.
- If omitted, the caller intentionally requests a `full poll`.
- If provided, the caller requests an `incremental poll` using `summary_ts > checkpoint`.
- The scheduler uses `full poll` on each tick for `rack_current_summary`, because the current-summary view is overwrite-in-place rather than an append-only event source.
- Manual poll requests do not own or mutate the scheduler checkpoint.
- Phase 1 does not introduce a dedicated persistence store just for checkpoint continuity.
- `monitoring_states` and fingerprint-based transition logic remain the operational source of truth.

| Risk | Impact | Mitigation |
|------|--------|------------|
| Monitoring state repository choice is undecided | High | Decide persistence store before repository implementation begins |
| Polling cadence overloads ClickHouse or backend | Medium | Start with rack-first slice, use incremental checkpoint queries, measure before widening cadence |
| Alert labels are unstable across transitions | High | Define stable identity labels early in Task 7 and lock them with tests |
| Alertmanager route/receiver config drifts from backend-emitted labels | High | Add Task 8A validation using real config checks and receiver-path verification before production rollout |
| Summary contracts drift from ClickHouse views | Medium | Add adapter tests and spec-based contract checks before multi-scope rollout |
| UI confuses operational and notification state | Medium | Keep API response fields explicitly separated and verify in presentation tests |

## Parallelization Opportunities

- Safe to parallelize after foundation:
  - service, node, and container adapters/tests once rack slice patterns are stable
  - documentation and API contract writing in parallel with backend adapter work
- Must be sequential:
  - monitoring domain state contract
  - initial rack vertical slice
  - first Alertmanager bridge contract
- Needs coordination:
  - any shared DTO/Socket payload shape between presentation and application layers

## Open Questions

- Which persistence technology should hold internal monitoring state in phase 1?
- Should rack and service poll every cycle while node/container poll on a lower cadence?
- What is the exact MVP alert rule set for the first production slice?
- Do we want one composed monitoring API by default, or separate overview/detail endpoints from the start?

## Verification

- [ ] Every task has acceptance criteria
- [ ] Every task has a verification step
- [ ] Task dependencies are identified and ordered correctly
- [ ] No task intentionally requires more than ~5 files without further subdivision
- [ ] Checkpoints exist between major phases
- [ ] The human has reviewed and approved the plan
