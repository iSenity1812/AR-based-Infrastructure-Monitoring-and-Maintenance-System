# Ticket: Incident Operational Context V1

## Status

- State: `IN_PROGRESS`
- Date: `2026-07-23`
- Source spec:
  `docs/superpowers/specs/2026-07-23-incident-operational-context-spec.md`
- Progress:
  - `2026-07-23`: Checkpoint 1 implemented in code.
  - `2026-07-23`: `incident-workflow-service` build passed for checkpoint 1.
  - `2026-07-23`: Targeted Incident Workflow Jest specs were added, but local
    execution remains blocked by the known `jest-runtime` harness error
    `this._moduleMocker.clearMocksOnScope is not a function`.
  - `2026-07-23`: Checkpoint 2 implementation started.
  - `2026-07-23`: Checkpoint 2 code path for Node snapshot handoff was
    implemented in `monitoring-service` and the service build passed.
  - `2026-07-23`: Added a focused `IncidentWorkflowHttpClient` snapshot
    contract spec for the outbound handoff path.
  - `2026-07-23`: `monitoring-service` build still passes after the checkpoint
    2 adapter/spec additions.
  - `2026-07-23`: Focused Monitoring Jest execution is still blocked by the
    same local `jest-runtime` harness error
    `this._moduleMocker.clearMocksOnScope is not a function`.
  - `2026-07-23`: Checkpoint 3 investigation policy, repository queries, use
    case, DTOs, and HTTP endpoint were implemented in `monitoring-service`.
  - `2026-07-23`: Rack incident snapshot composition was extended into
    Monitoring handoff so rack alerts no longer fall back to `capturedSnapshot:
    undefined`.
  - `2026-07-23`: `monitoring-service` build passes after the checkpoint 3
    node/rack investigation and rack snapshot additions.
  - `2026-07-24`: Checkpoint 4 monitoring timeline foundation was implemented
    in `monitoring-service`, including append-only `monitoring_events`,
    alert transition events, node liveness transition sync, and investigation
    timeline hydration.
  - `2026-07-24`: `monitoring-service` build passes after the checkpoint 4
    additions.
  - `2026-07-24`: Targeted Monitoring Jest execution for checkpoint 4 remains
    blocked by the same local `jest-runtime` harness error
    `this._moduleMocker.clearMocksOnScope is not a function`.
  - `2026-07-24`: Checkpoint 5 related-incident lookup and detail response
    wiring were implemented in `incident-workflow-service`.
  - `2026-07-24`: `incident-workflow-service` build passes after the checkpoint
    5 additions.
  - `2026-07-24`: Targeted Incident Workflow Jest execution for checkpoint 5
    remains blocked by the same local `jest-runtime` harness error
    `this._moduleMocker.clearMocksOnScope is not a function`.

## Outcome

Deliver an Incident detail experience for Node and Rack scopes that gives an
on-call technician, on one screen:

- immutable context captured when the Incident was created;
- canonical Asset and Rack identity;
- current monitoring condition;
- a selectable historical investigation window;
- factual Monitoring and workflow timeline entries;
- previous Incidents for the same scope.

## V1 Decisions Used By This Plan

1. `capturedSnapshot` is a typed top-level Incident field.
2. The frontend may call Incident Workflow and Monitoring APIs concurrently.
   A new BFF composition endpoint is not required for V1.
3. Monitoring uses the existing Asset HTTP Node context API for Node identity.
4. Rack identity continues to use the existing Asset gRPC provider.
5. Snapshot enrichment is best-effort and must not block Incident creation.
6. Enrichment sources execute in parallel with configurable timeouts.
7. Liveness V1 uses `online | stale`.
8. Investigation range is limited to 7 days and 400 returned points.
9. Monitoring timeline events are append-only in
   `monitoring_db.monitoring_events`.
10. Incident activity is not added in V1. Incident `createdAt` and existing
    Ticket activities provide workflow timeline data.
11. No LLM, root-cause inference, or causal language is introduced.

## Definition Of Done

Every slice must satisfy:

- targeted tests added before or with behavior changes;
- touched service builds successfully;
- no direct cross-service MongoDB reads;
- no hardcoded Asset identity, measurements, timestamps, or thresholds;
- null and unavailable data are represented honestly;
- public HTTP responses are DTO/presenter output, not Domain Entity internals;
- API contract documentation is updated when a public shape changes;
- unrelated worktree changes remain untouched.

Unless a path starts with `docs/`, service paths listed below are relative to:

```text
backend/apps/control-plane/
```

## Dependency Graph

```mermaid
flowchart TD
    S1["S1 Flat Incident response"]
    S2["S2 Snapshot domain and persistence"]
    S3["S3 Snapshot HTTP contract"]
    S4["S4 Node ClickHouse context reader"]
    S5["S5 Asset Node context client"]
    S6["S6 Node snapshot composer"]
    S7["S7 Node snapshot handoff"]
    S8["S8 Rack snapshot extension"]
    S9["S9 Investigation query policy"]
    S10["S10 Node investigation use case"]
    S11["S11 Node investigation HTTP"]
    S12["S12 Rack investigation path"]
    S13["S13 Monitoring event store"]
    S14["S14 Alert transition events"]
    S15["S15 Node liveness transitions"]
    S16["S16 Monitoring timeline query"]
    S17["S17 Related Incidents and E2E docs"]

    S1 --> S3
    S2 --> S3
    S3 --> S7
    S4 --> S6
    S5 --> S6
    S6 --> S7
    S7 --> S8
    S4 --> S10
    S9 --> S10
    S10 --> S11
    S8 --> S12
    S9 --> S12
    S13 --> S14
    S13 --> S15
    S13 --> S16
    S9 --> S16
    S11 --> S17
    S12 --> S17
    S16 --> S17
```

## Phase 1: Stable Incident Contract

### Slice 1: Return flat Incident HTTP responses

**Description:** Add a stable Incident response DTO/presenter so list, create,
and detail endpoints no longer expose `IncidentEntity.props`.

**Acceptance criteria:**

- [x] Incident HTTP payloads expose flat fields such as `id`, `incidentCode`,
      `severity`, `status`, `createdBy`, and timestamps.
- [x] No Incident response contains a `props` wrapper.
- [x] Monitoring's Incident HTTP client can parse the flat response while
      temporarily retaining backward-compatible parsing.

**Verification:**

- [x] Incident controller/presenter tests cover create, list, and detail.
- [x] `npm run build` passes in `incident-workflow-service`.
- [ ] Manual response check confirms `data.props` is absent.

**Dependencies:** None.

**Files likely touched:**

- `incident-workflow-service/src/presentation/http/dto/incident-response.dto.ts`
- `incident-workflow-service/src/presentation/http/presenters/incident.presenter.ts`
- `incident-workflow-service/src/presentation/http/controllers/incidents.controller.ts`
- `incident-workflow-service/src/presentation/http/controllers/incidents.controller.spec.ts`
- `monitoring-service/src/infrastructure/http/incident-workflow-http.client.ts`

**Estimated scope:** M.

### Slice 2: Add typed captured snapshot to Incident persistence

**Description:** Extend the Incident domain and Mongo model with an immutable,
optional `capturedSnapshot` field without changing existing Incident records.

**Acceptance criteria:**

- [x] New Incidents can persist `capturedSnapshot.schemaVersion =
      incident.context.v1`.
- [x] Existing Incidents without a snapshot continue to load successfully.
- [x] Generic Incident updates cannot overwrite an existing snapshot.

**Verification:**

- [x] Repository tests cover create, read, legacy record, and overwrite refusal.
- [x] `npm run build` passes in `incident-workflow-service`.

**Dependencies:** None.

**Files likely touched:**

- `incident-workflow-service/src/domain/entities/incident.entity.ts`
- `incident-workflow-service/src/domain/ports/incident-repository.port.ts`
- `incident-workflow-service/src/use-cases/commands/incident.commands.ts`
- `incident-workflow-service/src/adapters/persistence/mongoose/schemas/incident.schema.ts`
- `incident-workflow-service/src/adapters/persistence/mongoose/repositories/mongoose-incident.repository.ts`

**Estimated scope:** M.

### Slice 3: Expose captured snapshot through Incident create/detail APIs

**Description:** Complete the public API path for receiving a typed snapshot on
Incident creation and returning it through the flat Incident presenter.

**Acceptance criteria:**

- [x] `POST /incidents` accepts an optional validated `capturedSnapshot`.
- [x] `GET /incidents/:id` returns the stored snapshot unchanged.
- [x] A partial snapshot with `unavailableSources` is accepted.

**Verification:**

- [x] DTO tests reject invalid schema version and malformed timestamps.
- [x] Controller tests cover complete, partial, and absent snapshots.
- [ ] `npm run build` and targeted tests pass.
  Note: build passed; targeted Jest execution is still blocked by the existing
  local harness issue.

**Dependencies:** Slices 1 and 2.

**Files likely touched:**

- `incident-workflow-service/src/presentation/http/dto/create-incident-request.dto.ts`
- `incident-workflow-service/src/presentation/http/dto/incident-response.dto.ts`
- `incident-workflow-service/src/presentation/http/presenters/incident.presenter.ts`
- `incident-workflow-service/src/presentation/http/controllers/incidents.controller.ts`
- `incident-workflow-service/src/presentation/http/controllers/incidents.controller.spec.ts`

**Estimated scope:** M.

## Checkpoint 1: Incident Contract

- [x] Incident Workflow build passes.
- [x] Existing Incident records remain readable.
- [x] Create and detail APIs round-trip complete and partial snapshots.
- [x] HTTP response no longer leaks `props`.
- [ ] Human reviews the snapshot contract before Monitoring integration.

## Phase 2: Node Captured Snapshot

### Slice 4: Implement Node Incident context ClickHouse reader

**Description:** Add one application port and ClickHouse adapter that reads only
the Node data required by an Incident snapshot.

Required datasets:

- `node_current_summary`
- `node_current_live`
- `node_fingerprint_latest`
- `node_summary_trend_1m`
- `v_agg_1m_by_scope_metric`
- `metric_profile`

**Acceptance criteria:**

- [x] Reader returns current condition, heartbeat evidence, observed hardware,
      alert metric trend, and policy values.
- [x] Queries use bound parameters and explicit UTC conversion.
- [x] Missing rows return null/empty results without fabricated zeroes.

**Verification:**

- [x] Adapter tests assert SQL source, bound parameters, and row mapping.
- [ ] Real ClickHouse smoke query succeeds for one Node.
- [x] `npm run build` passes in `monitoring-service`.

**Dependencies:** None.

**Files likely touched:**

- `monitoring-service/src/application/ports/incident-context-read.repository.ts`
- `monitoring-service/src/infrastructure/database/clickhouse/incident-context-clickhouse.repository.ts`
- `monitoring-service/src/infrastructure/database/clickhouse/incident-context-clickhouse.repository.spec.ts`
- `monitoring-service/src/infrastructure/database/clickhouse/monitoring-clickhouse.module.ts`

**Estimated scope:** M.

### Slice 5: Implement authenticated Asset Node context client

**Description:** Add a Monitoring outbound adapter for
`GET /nodes/:nodeId/context` and allow the Monitoring system actor to request
Asset health context.

**Acceptance criteria:**

- [x] Node context maps canonical Node and Rack identity separately from
      observed hardware.
- [x] Automatic handoff system auth includes `assets.health.read`.
- [x] Timeout or invalid Asset response returns a typed unavailable result.

**Verification:**

- [x] HTTP adapter tests cover success, 404, timeout, and malformed payload.
- [x] System-auth test covers the Asset permission.
- [x] Monitoring and Asset builds pass.
  Note: Monitoring build passed in this turn. Asset Service was not rebuilt in
  this turn because its code was only read for contract alignment.

**Dependencies:** None.

**Files likely touched:**

- `monitoring-service/src/application/ports/asset-node-context.provider.ts`
- `monitoring-service/src/infrastructure/http/asset-node-context-http.provider.ts`
- `monitoring-service/src/infrastructure/http/asset-node-context-http.provider.spec.ts`
- `monitoring-service/src/application/services/monitoring-workflow-system-auth.service.ts`
- `monitoring-service/src/infrastructure/config/monitoring-service-config.ts`

**Estimated scope:** M.

### Slice 6: Compose a complete or partial Node snapshot

**Description:** Build a pure application service that combines Alert evidence,
Asset context, ClickHouse context, source references, and completeness status.

**Acceptance criteria:**

- [x] Complete inputs produce `incident.context.v1` with Node Asset, observed
      hardware, condition, impact, metric evidence, and source references.
- [x] Asset or ClickHouse failure produces `partial` or `minimal` snapshot.
- [x] Alert threshold and metric health policy remain separate fields.

**Verification:**

- [x] Unit tests cover complete, Asset-unavailable, ClickHouse-unavailable, and
      missing-heartbeat cases.
- [x] Unit tests prove canonical and observed serial values are not merged.
- [x] `npm run build` passes in `monitoring-service`.
  Note: targeted specs were added; the local Jest runtime issue still prevents
  trustworthy execution in this workspace.

**Dependencies:** Slices 4 and 5.

**Files likely touched:**

- `monitoring-service/src/application/services/incident-context-snapshot-composer.service.ts`
- `monitoring-service/src/application/services/incident-context-snapshot-composer.service.spec.ts`
- `monitoring-service/src/application/dto/incident-context-snapshot.dto.ts`
- `monitoring-service/src/infrastructure/config/monitoring-service-config.ts`
- `monitoring-service/src/infrastructure/config/monitoring-service-config.spec.ts`

**Estimated scope:** M.

### Slice 7: Send Node snapshot during Incident handoff

**Description:** Invoke the snapshot composer before Incident creation and send
the result as top-level `capturedSnapshot` to Incident Workflow.

**Acceptance criteria:**

- [x] Manual and automatic Node handoff persist the same snapshot contract.
- [x] Context enrichment failures do not prevent Incident creation.
- [x] Conflict recovery links the existing Incident without overwriting its
      original snapshot.

**Verification:**

- [x] Handoff use-case tests cover complete and partial snapshots.
- [x] Incident HTTP client contract test covers top-level snapshot payload.
- [x] Monitoring and Incident Workflow builds pass.
  Note: both services built cleanly in this workspace. Manual E2E creation and
  conflict-recovery smoke checks are still pending.
  Targeted Monitoring Jest execution is still blocked by the local
  `jest-runtime` harness error rather than application code.

**Dependencies:** Slices 3 and 6.

**Files likely touched:**

- `monitoring-service/src/application/use-cases/create-incident-from-alert.use-case.ts`
- `monitoring-service/src/application/use-cases/create-incident-from-alert.use-case.spec.ts`
- `monitoring-service/src/application/ports/incident-workflow-client.port.ts`
- `monitoring-service/src/infrastructure/http/incident-workflow-http.client.ts`
- `monitoring-service/src/app.module.ts`

**Estimated scope:** M.

## Checkpoint 2: Node Snapshot E2E

- [ ] A real Node alert creates an Incident with a persisted snapshot.
- [ ] Incident detail shows canonical Asset and captured monitoring condition.
- [ ] Asset or ClickHouse failure yields an honest partial snapshot.
- [ ] Existing idempotent conflict recovery still works.
- [ ] Human reviews one real Node Incident payload.

## Phase 3: Rack Snapshot And Investigation Queries

### Slice 8: Add Rack captured snapshot support

**Description:** Extend the context reader and composer for Rack alerts using
`rack_current_summary`, `v_rack_summary_history`, and the existing Asset Rack
gRPC provider.

**Acceptance criteria:**

- [ ] Rack snapshot includes canonical Rack identity and captured impact.
- [ ] History queries always bind `bucket_granularity`.
- [ ] Rack Asset enrichment failure produces a partial snapshot without guessed
      names.

**Verification:**

- [ ] Rack composer tests cover signal loss, degraded Rack, and missing Asset.
- [ ] ClickHouse tests prove `1m` and `5m` rows are not mixed.
- [ ] A Rack alert creates an Incident with a persisted Rack snapshot.
  Note: code path and focused specs were added in this turn, and the service
  build passes. Local targeted Jest execution is still blocked by the existing
  `jest-runtime` harness issue, and manual Rack handoff smoke testing remains
  pending.

**Dependencies:** Slice 7.

**Files likely touched:**

- `monitoring-service/src/application/ports/incident-context-read.repository.ts`
- `monitoring-service/src/infrastructure/database/clickhouse/incident-context-clickhouse.repository.ts`
- `monitoring-service/src/infrastructure/database/clickhouse/incident-context-clickhouse.repository.spec.ts`
- `monitoring-service/src/application/services/incident-context-snapshot-composer.service.ts`
- `monitoring-service/src/application/services/incident-context-snapshot-composer.service.spec.ts`

**Estimated scope:** M.

### Slice 9: Define investigation range and interval policy

**Description:** Add one reusable policy for validating and normalizing
`from`, `to`, `interval`, timezone conversion, maximum range, and maximum points.

**Acceptance criteria:**

- [ ] Valid intervals are `1m` and `5m`.
- [ ] Ranges greater than 7 days or estimates above 400 points are rejected or
      normalized according to the documented contract.
- [ ] Returned timestamps are UTC ISO-8601.
  Note: policy implementation now enforces `1m|5m`, 7-day max range, and
  400-point max estimate with UTC ISO output. Targeted Jest execution is still
  blocked locally by the harness issue.

**Verification:**

- [ ] Unit tests cover invalid ISO values, reversed range, boundary range,
      interval selection, and DST-independent UTC conversion.
- [ ] `npm run build` passes in `monitoring-service`.

**Dependencies:** None.

**Files likely touched:**

- `monitoring-service/src/application/services/investigation-window-policy.service.ts`
- `monitoring-service/src/application/services/investigation-window-policy.service.spec.ts`
- `monitoring-service/src/presentation/http/dto/investigation-query.dto.ts`
- `monitoring-service/src/infrastructure/config/monitoring-service-config.ts`
- `monitoring-service/src/infrastructure/config/monitoring-service-config.spec.ts`

**Estimated scope:** M.

### Slice 10: Implement Node investigation use case

**Description:** Return current Node condition, selected metric series, source
references, and an empty timeline placeholder for an explicit investigation
window.

**Acceptance criteria:**

- [ ] Primary metric comes from the originating/requested metric key, not a
      fixed TypeScript metric list.
- [ ] Missing samples remain null or produce an empty series.
- [ ] Response distinguishes current observation time from requested window.
  Note: implemented in `GetScopeInvestigationUseCase` and
  `IncidentContextClickhouseRepository`; real ClickHouse smoke verification is
  still pending.

**Verification:**

- [ ] Use-case tests cover data, empty range, missing Node, and partial source.
- [ ] Real ClickHouse smoke query returns at most 400 points.
- [ ] `npm run build` passes in `monitoring-service`.

**Dependencies:** Slices 4 and 9.

**Files likely touched:**

- `monitoring-service/src/application/use-cases/get-scope-investigation.use-case.ts`
- `monitoring-service/src/application/use-cases/get-scope-investigation.use-case.spec.ts`
- `monitoring-service/src/application/dto/scope-investigation-response.dto.ts`
- `monitoring-service/src/application/ports/incident-context-read.repository.ts`

**Estimated scope:** M.

### Slice 11: Expose Node investigation HTTP endpoint

**Description:** Expose the Node path of the generic investigation contract with
auth, validation, and Swagger documentation.

**Acceptance criteria:**

- [ ] `GET /monitoring/scopes/node/:nodeId/investigation` accepts
      `from`, `to`, and `interval`.
- [ ] Invalid ranges return the service's standard problem-details response.
- [ ] Successful payload follows a public DTO and envelope.
  Note: implementation uses the shared path
  `GET /monitoring/scopes/:scopeType/:scopeId/investigation` with Node support
  active now. Manual request verification is still pending.

**Verification:**

- [ ] Controller tests cover success, validation error, empty range, and 404.
- [ ] `npm run build` and targeted controller tests pass.
- [ ] Manual request works with one real Node.

**Dependencies:** Slice 10.

**Files likely touched:**

- `monitoring-service/src/presentation/http/controllers/scope-investigation.controller.ts`
- `monitoring-service/src/presentation/http/controllers/scope-investigation.controller.spec.ts`
- `monitoring-service/src/presentation/http/dto/investigation-query.dto.ts`
- `monitoring-service/src/presentation/http/dto/scope-investigation-response.dto.ts`
- `monitoring-service/src/app.module.ts`

**Estimated scope:** M.

### Slice 12: Extend investigation endpoint for Rack scope

**Description:** Add Rack current condition and history to the same API contract
without introducing a separate response shape.

**Acceptance criteria:**

- [ ] `GET /monitoring/scopes/rack/:rackId/investigation` is supported.
- [ ] Rack response includes current impact and requested-granularity series.
- [ ] Unsupported scope values are rejected.
  Note: shared investigation path now supports Rack and binds
  `bucket_granularity` explicitly in ClickHouse. Manual duplicate-timestamp
  verification is still pending.

**Verification:**

- [ ] Use-case and controller tests cover Rack `1m`, Rack `5m`, empty history,
      and unsupported scope.
- [ ] Manual query has no duplicate bucket timestamps.
- [ ] Monitoring build passes.

**Dependencies:** Slices 8, 9, and 11.

**Files likely touched:**

- `monitoring-service/src/application/use-cases/get-scope-investigation.use-case.ts`
- `monitoring-service/src/application/use-cases/get-scope-investigation.use-case.spec.ts`
- `monitoring-service/src/presentation/http/controllers/scope-investigation.controller.ts`
- `monitoring-service/src/presentation/http/controllers/scope-investigation.controller.spec.ts`
- `monitoring-service/src/presentation/http/dto/scope-investigation-response.dto.ts`

**Estimated scope:** M.

## Checkpoint 3: Dynamic Investigation

- [ ] Node and Rack investigation APIs share one stable contract.
- [ ] Explicit ranges are bounded to 7 days and 400 points.
- [ ] Rack results do not mix granularities.
- [ ] UTC response timestamps match real ClickHouse data.
- [ ] Frontend can render captured and current context separately.

## Phase 4: Factual Monitoring Timeline

### Slice 13: Add append-only Monitoring event store

**Description:** Add the `monitoring_events` schema, repository port, Mongo
adapter, indexes, and module wiring.

**Acceptance criteria:**

- [ ] Event records are append-only and use a unique `eventKey`.
- [ ] Events can be queried chronologically by Node, Rack, alert fingerprint,
      and Incident code.
- [ ] Duplicate append attempts are idempotent.

**Verification:**

- [ ] Repository tests cover append, duplicate, Node query, and Rack query.
- [ ] Required indexes are declared.
- [ ] Monitoring build passes.

**Dependencies:** None.

**Files likely touched:**

- `monitoring-service/src/application/ports/monitoring-event.repository.ts`
- `monitoring-service/src/infrastructure/database/mongodb/monitoring-event.schema.ts`
- `monitoring-service/src/infrastructure/database/mongodb/monitoring-event-mongo.repository.ts`
- `monitoring-service/src/infrastructure/database/mongodb/monitoring-event-mongo.repository.spec.ts`
- `monitoring-service/src/infrastructure/database/mongodb/monitoring-event-mongo.module.ts`

**Estimated scope:** M.

### Slice 14: Record Alert fired and resolved transitions

**Description:** Append one factual event when external alert status changes,
using the persisted previous alert state to avoid polling noise.

**Acceptance criteria:**

- [ ] First firing transition writes `alert.fired`.
- [ ] Firing-to-resolved writes `alert.resolved`.
- [ ] Repeated delivery with unchanged status writes no event.

**Verification:**

- [ ] Sync-external-alert tests cover firing, refresh, resolved, recurrence, and
      duplicate delivery.
- [ ] Existing alert ingestion behavior remains unchanged.
- [ ] Monitoring build passes.

**Dependencies:** Slice 13.

**Files likely touched:**

- `monitoring-service/src/application/use-cases/sync-external-alerts.use-case.ts`
- `monitoring-service/src/application/use-cases/sync-external-alerts.use-case.spec.ts`
- `monitoring-service/src/application/ports/monitoring-event.repository.ts`
- `monitoring-service/src/app.module.ts`

**Estimated scope:** M.

### Slice 15: Record Node online and stale transitions

**Description:** Add an independent Node liveness transition use case driven by
heartbeat freshness and `metric_profile`, then schedule it through the existing
Node realtime scheduler rather than Rack polling.

**Acceptance criteria:**

- [ ] `online -> stale` and `stale -> online` each append one event.
- [ ] Unchanged scheduler cycles append no event.
- [ ] Rack polling scheduler is not a dependency.

**Verification:**

- [ ] Transition use-case tests cover both directions and idempotency.
- [ ] Node scheduler tests prove liveness sync is isolated from Rack polling.
- [ ] Monitoring build passes.

**Dependencies:** Slices 4 and 13.

**Files likely touched:**

- `monitoring-service/src/application/use-cases/sync-node-liveness-transitions.use-case.ts`
- `monitoring-service/src/application/use-cases/sync-node-liveness-transitions.use-case.spec.ts`
- `monitoring-service/src/application/use-cases/node-realtime-sync.scheduler.ts`
- `monitoring-service/src/application/use-cases/node-realtime-sync.scheduler.spec.ts`
- `monitoring-service/src/app.module.ts`

**Estimated scope:** M.

### Slice 16: Return Monitoring timeline in investigation API

**Description:** Query normalized Monitoring events for the requested scope and
window and include them in the investigation response.

**Acceptance criteria:**

- [ ] Timeline is ordered by `occurredAt`.
- [ ] Items expose structured `type`, `data`, and `source`, not inferred cause.
- [ ] Node and Rack timelines are filtered to the requested range.

**Verification:**

- [ ] Use-case tests cover mixed event types, ordering, empty timeline, and range
      filtering.
- [ ] Controller response contract test covers timeline items.
- [ ] Monitoring build passes.

**Dependencies:** Slices 9, 13, and 15.

**Files likely touched:**

- `monitoring-service/src/application/use-cases/get-scope-investigation.use-case.ts`
- `monitoring-service/src/application/use-cases/get-scope-investigation.use-case.spec.ts`
- `monitoring-service/src/application/dto/scope-investigation-response.dto.ts`
- `monitoring-service/src/presentation/http/dto/scope-investigation-response.dto.ts`

**Estimated scope:** M.

## Checkpoint 4: Monitoring Timeline

- [ ] Alert and Node liveness transitions are append-only.
- [ ] Unchanged 5-second scheduler cycles create no timeline noise.
- [ ] Timeline contains factual transitions only.
- [ ] Node transition processing is independent of Rack polling.
- [ ] Investigation API returns ordered events for the selected range.

## Phase 5: Previous Incidents And Delivery Proof

### Slice 17: Add related Incidents, E2E coverage, and API docs

**Description:** Complete the operator history by listing previous Incidents for
the same Node/Rack scope, then document and test the complete two-API screen flow.

**Acceptance criteria:**

- [ ] Incident Workflow can list previous Incidents by `scopeType + scopeId`.
- [ ] Current Incident is excluded and results are newest-first.
- [ ] E2E guide covers NodeStale and RackSignalLossPresent from Incident creation
      through current context and timeline.
- [ ] Monitoring and Incident API contracts document provenance and partial data.

**Verification:**

- [ ] Repository/query tests cover Node, Rack, empty history, and current
      exclusion.
- [ ] Both service builds pass.
- [ ] Targeted tests pass or any known Jest infrastructure failure is recorded.
- [ ] Manual E2E requests match documented expected responses.

**Dependencies:** Slices 11, 12, and 16.

**Files likely touched:**

- `incident-workflow-service/src/domain/ports/incident-repository.port.ts`
- `incident-workflow-service/src/use-cases/commands/incident.commands.ts`
- `incident-workflow-service/src/adapters/persistence/mongoose/repositories/mongoose-incident.repository.ts`
- `incident-workflow-service/src/presentation/http/controllers/incidents.controller.ts`
- `docs/api-contracts/control-plane/monitoring-incident-operational-context.md`

**Estimated scope:** M.

## Checkpoint 5: Complete

- [ ] A technician can open one Incident screen and see captured context,
      current context, timeline, tickets, and previous Incidents.
- [ ] Node and Rack E2E scenarios pass.
- [ ] Snapshot remains unchanged after recovery.
- [ ] No source ownership boundary is violated.
- [ ] Public contracts and test commands are documented.
- [ ] Human reviews payload size and operator usefulness before frontend work.

## Parallelization

Safe parallel groups after contracts are agreed:

| Group | Slices | Constraint |
| --- | --- | --- |
| A | 1 and 2 | Coordinate shared Incident entity/presenter assumptions |
| B | 4 and 5 | Independent ClickHouse and Asset outbound adapters |
| C | 9 and 13 | Independent query policy and event persistence |
| D | 14 and 15 | Start only after Slice 13; disjoint use cases |

Must remain sequential:

```text
1 + 2 -> 3 -> 7
4 + 5 -> 6 -> 7 -> 8
4 + 9 -> 10 -> 11 -> 12
13 -> 14/15 -> 16
11 + 12 + 16 -> 17
```

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Snapshot enrichment slows critical handoff | High | Parallel bounded calls; partial snapshot fallback |
| Snapshot becomes an untyped metadata dump | High | Typed top-level contract and schema version |
| Asset and observed hardware conflict | Medium | Preserve separate objects and source references |
| Rack history returns duplicate timestamps | High | Require and test `bucket_granularity` |
| Raw telemetry expires before review | High | Persist captured evidence; do not rely on 7-day raw TTL |
| Timeline repeats every scheduler tick | High | Emit only on persisted state transition; unique event key |
| Incident creation conflict overwrites evidence | High | Snapshot is first-write immutable |
| System token cannot read Asset context | Medium | Add and test `assets.health.read` permission |
| Jest infrastructure remains unstable | Medium | Run targeted tests and builds; record harness failure clearly |
| Related Incidents amplify existing duplicates | Medium | Treat grouping/dedup as a separate policy concern |

## Explicitly Deferred Tickets

- Incident grouping and dedup across different alerts affecting the same failure.
- Durable outbox/reconciliation for cross-service Incident handoff.
- BFF operational-context composition endpoint.
- Persisting operator-selected investigation windows as evidence.
- Incident activity collection beyond Ticket activities.
- Container and Service operational context.
- LLM diagnosis or recommended actions.

## Review Gate

Before implementation, confirm:

- [ ] Top-level `capturedSnapshot` is accepted.
- [ ] Existing Asset HTTP Node context API may be called by Monitoring.
- [ ] `online | stale` is sufficient for V1 liveness.
- [ ] Seven-day range and 400-point cap are accepted.
- [ ] `monitoring_events` Mongo collection is accepted.
- [ ] Frontend two-call composition is accepted for the first release.
