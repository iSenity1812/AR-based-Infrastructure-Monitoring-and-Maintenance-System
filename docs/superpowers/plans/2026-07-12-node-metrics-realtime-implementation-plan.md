# Implementation Plan: Node Metrics Realtime

Date: 2026-07-12
Status: Draft
Spec: `docs/superpowers/specs/2026-07-12-node-metrics-realtime-spec.md`
Owner: Monitoring Service

## 1. Goal

Implement the node metrics realtime experience:

- `GET /api/v1/monitoring/nodes/:nodeId/metrics`
- `monitoring.node.metrics.updated`
- `monitoring.node.metrics.workloads.changed`

The endpoint bootstraps the metrics tab. Socket.IO events stream new metric buckets and tracked workload membership changes.

## 2. Non-Goals

Do not implement in this plan:

- node analysis or diagnosis API
- alert reasoning
- action hints
- incident workflow integration
- full workload listing
- room-by-node websocket optimization unless the current codebase already provides a ready abstraction

## 3. Implementation Order

### Task 1: Add Public Contracts

Add REST DTOs/models for:

- `NodeMetricsResponse`
- `NodeMetricsConfig`
- `NodeMetricsWorkloadSummary`
- `NodeMetricsWorkload`
- `NodeMetricsSeedWindow`
- `NodeMetricsSeedPoint`

Add realtime event models for:

- `NodeMetricsUpdatedEvent`
- `NodeMetricsWorkloadsChangedEvent`

Acceptance criteria:

- REST response shape matches the spec
- WS payload shapes match the spec
- metric keys are represented as explicit supported string unions/enums where practical
- missing metric values are allowed as `null`

### Task 2: Add Selection Policy

Create a workload selection helper/service for metrics.

Supported `selectionMode` values:

- `top_cpu_then_memory`
- `top_memory_then_cpu`
- `abnormal_first_then_top_cpu`
- `abnormal_only`
- `pinned_workloads`
- `manual_ids`

V1 default:

- `top_cpu_then_memory`

V1 default limit:

- `5`

Acceptance criteria:

- default policy sorts by latest CPU descending
- tie-break uses latest memory descending
- final tie-break is stable by workload identity
- supported enum values exist even if some modes are implementation-reserved in v1

### Task 3: Add Read Repository Port

Add an application-layer repository port for node metrics reads.

Required methods:

- read node current metadata by `nodeId`
- read current workload population by `nodeId`
- read node seed metric buckets by `nodeId`
- read workload seed metric buckets by `nodeId` and tracked workload IDs
- read latest realtime bucket candidates for changed nodes if needed by existing polling lifecycle

Acceptance criteria:

- application layer does not depend directly on ClickHouse client
- method names reflect use cases, not table names
- node not found can be represented clearly for REST `404`

### Task 4: Implement ClickHouse Repository

Implement the repository port using current serving tables.

Likely inputs:

- `telemetry_db.node_current_summary`
- `telemetry_db.container_current_summary`
- node trend serving source
- workload trend serving source

Implementation notes:

- confirm exact trend serving table/view names before coding final SQL
- return ISO-8601-compatible timestamps to the mapper layer
- keep query result rows internal to infrastructure
- map database nulls to application nulls

Acceptance criteria:

- node metadata query returns one row per `nodeId`
- workload population query returns all known workloads for the node
- seed window queries are bounded and aligned to configured `bucketSec`
- if no workload exists, response can still be composed with empty arrays

### Task 5: Add Metrics Composer Use Case

Add an application service/use case to compose REST bootstrap response.

Inputs:

- `nodeId`
- default metrics config
- current node metadata
- workload population
- seed node points
- seed workload points

Outputs:

- `NodeMetricsResponse`

Acceptance criteria:

- returns `404`-compatible result when node snapshot is missing
- computes `freshnessSec` from `lastSeenAt`
- includes fixed v1 `nodeMetricKeys`
- includes fixed v1 `workloadMetricKeys`
- selects tracked workloads before composing `seedWindow.workloads`
- seed points only include tracked workloads

### Task 6: Add REST Controller

Add endpoint:

- `GET /api/v1/monitoring/nodes/:nodeId/metrics`

Controller behavior:

- validate `nodeId` as a required route param
- call metrics use case
- return existing service response/envelope pattern
- reuse monitoring auth/permissions pattern used by existing monitoring endpoints

Acceptance criteria:

- successful response matches spec
- missing node returns `404`
- node with no workloads returns `200`, `workloadSummary.total = 0`, `workloads = []`

### Task 7: Extend Realtime Port and Gateway

Extend realtime application port with:

- `emitNodeMetricsUpdated`
- `emitNodeMetricsWorkloadsChanged`

Extend Socket.IO gateway to emit:

- `monitoring.node.metrics.updated`
- `monitoring.node.metrics.workloads.changed`

Acceptance criteria:

- event names exactly match spec
- event payloads are public DTOs, not raw database rows
- existing rack and node overview events keep working

### Task 8: Add Realtime Sync Use Case

Add a sync use case that builds metric bucket events.

Responsibilities:

- detect new bucket candidates
- compose `NodeMetricsUpdatedEvent`
- compare tracked workload membership with previous state
- emit `NodeMetricsWorkloadsChangedEvent` only when membership changes
- emit `NodeMetricsUpdatedEvent` for new metric buckets

Acceptance criteria:

- no long historical list is emitted over WS
- membership change event is not emitted on every tick
- event `workloads` only contains currently tracked workload IDs
- public event payloads use the same metric keys as REST `metricsConfig`

### Task 9: Wire Into Existing Polling Lifecycle

Integrate metrics realtime sync into the existing monitoring polling/update lifecycle.

Preferred approach:

- mirror the pattern already used by rack realtime and node overview realtime

Acceptance criteria:

- metrics sync runs without blocking existing rack/overview sync
- failures are logged and isolated
- existing scheduler tests are updated for the new dependency

### Task 10: Tests

Add unit tests for:

- workload selection `top_cpu_then_memory`
- workload selection tie-break behavior
- composer response mapping
- composer handling of no workloads
- composer handling of missing metric values as `null`
- membership changed detection
- no membership event when tracked workload IDs are unchanged

Add controller/integration-style tests for:

- `GET /api/v1/monitoring/nodes/:nodeId/metrics` success shape
- `404` when node not found
- `200` with empty workloads when node exists without workloads

Add gateway tests for:

- `monitoring.node.metrics.updated`
- `monitoring.node.metrics.workloads.changed`

## 4. Validation Plan

Run:

- TypeScript build for monitoring-service
- targeted unit tests for node metrics files
- existing realtime gateway tests
- scheduler tests touched by dependency changes

Expected known risk:

- if the repo's Jest harness still has the existing runtime issue, TypeScript build remains the primary verification and test failure should be reported explicitly.

## 5. Manual Data Verification

Use ClickHouse sample rows to verify:

- one real `nodeId` from `node_current_summary`
- workload population from `container_current_summary`
- seed window has bounded point count
- returned tracked workloads do not exceed 5
- WS bucket payload only includes one timestamp per event

## 6. Open Questions Before Implementation

These can be answered during code exploration:

- exact node trend serving table/view used for `seedWindow.points[].node`
- exact workload trend serving table/view used for `seedWindow.points[].workloads`
- whether current websocket abstraction supports namespace-wide events only or room-by-node
- whether existing REST serializer wraps payloads or returns raw business object

## 7. Suggested File Areas

Likely areas to touch:

- `backend/apps/control-plane/monitoring-service/src/application/ports`
- `backend/apps/control-plane/monitoring-service/src/application/services`
- `backend/apps/control-plane/monitoring-service/src/application/use-cases`
- `backend/apps/control-plane/monitoring-service/src/infrastructure/database/clickhouse`
- `backend/apps/control-plane/monitoring-service/src/presentation/http/controllers`
- `backend/apps/control-plane/monitoring-service/src/presentation/http/dto`
- `backend/apps/control-plane/monitoring-service/src/presentation/websocket/gateways`
- `backend/apps/control-plane/monitoring-service/src/app.module.ts`

## 8. Definition Of Done

This task is done when:

- REST `/metrics` contract is implemented
- both Socket.IO events are implemented
- realtime sync emits delta buckets, not full history
- workload membership changes are separately detectable
- compile verification passes
- tests are added or updated for the new behavior
- any unavailable verification is clearly reported
