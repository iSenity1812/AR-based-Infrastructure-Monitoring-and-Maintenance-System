# Node Metrics Realtime Spec

Date: 2026-07-12
Status: Draft
Owner: Monitoring Service

## 1. Summary

This spec defines the `node metrics` contract for Monitoring Service.

Scope of this spec:

- `GET /api/v1/monitoring/nodes/:nodeId/metrics`
- `monitoring.node.metrics.updated`
- `monitoring.node.metrics.workloads.changed`

The goal is to support a realtime operator-facing metrics panel for a single node:

- bootstrap the metrics tab quickly
- stream node metric buckets continuously
- stream tracked workload metric buckets continuously
- keep analysis and alert reasoning out of this API

This API is intentionally separate from:

- `GET /api/v1/monitoring/nodes/:nodeId/overview`
- future `node analysis` or `node insight` APIs

## 2. Product Intent

When an operator opens a node metrics panel, they want to answer:

- is this node under compute pressure right now
- is it memory-constrained
- is there thermal risk
- is network activity abnormal
- which workloads are consuming the most resources

This API must prioritize:

- low-latency bootstrap
- stable chart streaming
- simple frontend rendering
- bounded payload size

This API must not try to explain root cause. Root-cause interpretation belongs to a future analysis API.

## 3. High-Level Flow

1. Operator opens the `Node Metrics` tab.
2. Frontend calls `GET /api/v1/monitoring/nodes/:nodeId/metrics`.
3. Monitoring Service returns:
   - node freshness metadata
   - metrics stream configuration
   - tracked workload metadata
   - a short seed window for immediate chart render
4. Frontend subscribes to Socket.IO event `monitoring.node.metrics.updated`.
5. Monitoring Service emits one delta event per bucket.
6. Frontend appends new points to local chart buffers.
7. If tracked workloads change, Monitoring Service emits `monitoring.node.metrics.workloads.changed`.
8. Frontend remaps workload charts without reloading the whole panel.

## 4. Bounded Responsibilities

### 4.1 Node Metrics API owns

- node-level metric streaming contract
- tracked workload metric streaming contract
- tracked workload selection policy metadata
- bootstrap seed window

### 4.2 Node Metrics API does not own

- alert reasoning
- diagnosis or root-cause scoring
- action hints
- incident workflow state
- full workload inventory browsing

## 5. Data Sources

Primary serving inputs for this phase:

- `telemetry_db.node_current_summary`
- `telemetry_db.container_current_summary`
- node trend serving source for bucketed history
- workload trend serving source for bucketed history

Assumption:

- overview remains snapshot-first
- metrics uses a short historical seed window plus realtime deltas
- exact trend table names can be finalized during implementation if current serving sources differ from this draft

## 6. REST Contract

### 6.1 Endpoint

`GET /api/v1/monitoring/nodes/:nodeId/metrics`

### 6.2 Purpose

Bootstrap the realtime metrics panel for a node.

It returns:

- node identity and freshness
- metrics stream configuration
- tracked workload metadata
- a short chart seed window

It does not return a long historical series.

### 6.3 Response Shape

```json
{
  "node": {
    "nodeId": "node-msi-8bc4df0d",
    "lastSeenAt": "2026-07-12T09:12:30Z",
    "freshnessSec": 4
  },
  "metricsConfig": {
    "transport": "socket.io",
    "channel": "monitoring.node.metrics.updated",
    "bucketSec": 10,
    "retentionSec": 900,
    "nodeMetricKeys": [
      "cpuUsagePct",
      "memoryUsagePct",
      "diskUsagePct",
      "cpuTemperatureC",
      "networkRxBytesSec",
      "networkTxBytesSec"
    ],
    "workloadMetricKeys": [
      "cpuUsagePct",
      "memoryUsagePct"
    ]
  },
  "workloadSummary": {
    "total": 32,
    "returned": 5,
    "selectionMode": "top_cpu_then_memory"
  },
  "workloads": [
    {
      "workloadId": "container-api-01",
      "workloadType": "container",
      "name": "control-plane-api",
      "status": "running",
      "latestCpuUsagePct": 46.1,
      "latestMemoryUsagePct": 38.7
    },
    {
      "workloadId": "container-nginx-01",
      "workloadType": "container",
      "name": "nginx",
      "status": "running",
      "latestCpuUsagePct": 18.2,
      "latestMemoryUsagePct": 12.4
    }
  ],
  "seedWindow": {
    "from": "2026-07-12T09:10:00Z",
    "to": "2026-07-12T09:12:30Z",
    "points": [
      {
        "ts": "2026-07-12T09:12:00Z",
        "node": {
          "cpuUsagePct": 79.1,
          "memoryUsagePct": 75.2,
          "diskUsagePct": 71.4,
          "cpuTemperatureC": 78.8,
          "networkRxBytesSec": 2210000,
          "networkTxBytesSec": 1700000
        },
        "workloads": [
          {
            "workloadId": "container-api-01",
            "cpuUsagePct": 42.8,
            "memoryUsagePct": 37.9
          }
        ]
      }
    ]
  }
}
```

## 7. Field Semantics

### 7.1 `node`

- `nodeId`: canonical node identifier
- `lastSeenAt`: latest snapshot timestamp for the node
- `freshnessSec`: derived from `lastSeenAt` at response time

### 7.2 `metricsConfig`

- `transport`: fixed value `socket.io` in v1
- `channel`: fixed value `monitoring.node.metrics.updated`
- `bucketSec`: aggregation bucket size for streamed points
- `retentionSec`: intended client-side rolling buffer retention
- `nodeMetricKeys`: exact node metrics the client should render
- `workloadMetricKeys`: exact workload metrics the client should render

### 7.3 `workloadSummary`

- `total`: total workload population on the node
- `returned`: number of tracked workloads returned in the bootstrap payload
- `selectionMode`: policy used to pick tracked workloads

### 7.4 `workloads`

The tracked subset of workloads for the metrics panel.

This is not a full workload listing.

### 7.5 `seedWindow`

A short historical window used only for initial chart render.

Rules:

- must be short and bounded
- should contain the same metric keys as `metricsConfig`
- should align with `bucketSec`
- should be optional in implementation only if frontend explicitly supports empty-chart bootstrap

## 8. Metric Key Selection

### 8.1 Node Metric Keys

V1 fixed node metric set:

- `cpuUsagePct`
- `memoryUsagePct`
- `diskUsagePct`
- `cpuTemperatureC`
- `networkRxBytesSec`
- `networkTxBytesSec`

Rationale:

- these six metrics give operators a fast picture of compute, memory, storage, thermal, and network pressure
- each metric is understandable without extra domain interpretation

### 8.2 Workload Metric Keys

V1 fixed workload metric set:

- `cpuUsagePct`
- `memoryUsagePct`

Rationale:

- enough to identify workload resource hotspots
- small and stable payload
- clean separation from analysis concerns

## 9. Workload Selection Policy

### 9.1 V1 Default

Default `selectionMode`:

- `top_cpu_then_memory`

Default limit:

- `5`

### 9.2 Supported Selection Modes

V1 contract should support these enum values even if only one is initially active:

- `top_cpu_then_memory`
- `top_memory_then_cpu`
- `abnormal_first_then_top_cpu`
- `abnormal_only`
- `pinned_workloads`
- `manual_ids`

### 9.3 Selection Rules

For `top_cpu_then_memory`:

- sort by latest workload `cpuUsagePct` descending
- tie-break by latest workload `memoryUsagePct` descending
- final tie-break by stable workload identity

For `top_memory_then_cpu`:

- sort by latest workload `memoryUsagePct` descending
- tie-break by latest workload `cpuUsagePct` descending

For `abnormal_first_then_top_cpu`:

- select abnormal workloads first
- fill remaining slots by latest workload `cpuUsagePct` descending

For `abnormal_only`:

- return only abnormal workloads

For `pinned_workloads`:

- return workload IDs pinned by client or user preset

For `manual_ids`:

- return explicit workload IDs from a request preset or server-side selection input

## 10. Realtime Contract

### 10.1 Primary Event

Event name:

- `monitoring.node.metrics.updated`

Purpose:

- emit one new metrics bucket for the node and the currently tracked workloads

Payload:

```json
{
  "event": "monitoring.node.metrics.updated",
  "nodeId": "node-msi-8bc4df0d",
  "ts": "2026-07-12T09:12:40Z",
  "bucketSec": 10,
  "node": {
    "cpuUsagePct": 84.1,
    "memoryUsagePct": 76.8,
    "diskUsagePct": 71.4,
    "cpuTemperatureC": 81.0,
    "networkRxBytesSec": 2510000,
    "networkTxBytesSec": 1840000
  },
  "workloads": [
    {
      "workloadId": "container-api-01",
      "cpuUsagePct": 47.3,
      "memoryUsagePct": 39.1
    },
    {
      "workloadId": "container-nginx-01",
      "cpuUsagePct": 17.6,
      "memoryUsagePct": 12.3
    }
  ]
}
```

Rules:

- each event corresponds to one new bucket timestamp
- no long historical replay in this event
- frontend appends the point to local buffers
- absent metric values must be `null` rather than fabricated

### 10.2 Membership Change Event

Event name:

- `monitoring.node.metrics.workloads.changed`

Purpose:

- notify clients that the tracked workload set changed

Payload:

```json
{
  "event": "monitoring.node.metrics.workloads.changed",
  "nodeId": "node-msi-8bc4df0d",
  "ts": "2026-07-12T09:13:00Z",
  "workloadSummary": {
    "total": 32,
    "returned": 5,
    "selectionMode": "top_cpu_then_memory"
  },
  "workloads": [
    {
      "workloadId": "container-api-01",
      "workloadType": "container",
      "name": "control-plane-api",
      "status": "running",
      "latestCpuUsagePct": 49.2,
      "latestMemoryUsagePct": 39.8
    }
  ]
}
```

Rules:

- emit only when tracked workload membership changes
- do not emit on every bucket if membership is unchanged
- frontend should remap workload charts using this event

## 11. Frontend Consumption Model

The client should:

1. call REST `/metrics`
2. render tracked workloads and seed window immediately
3. subscribe to `monitoring.node.metrics.updated`
4. append one point per incoming bucket
5. rotate local buffers according to `retentionSec`
6. handle `monitoring.node.metrics.workloads.changed` by remapping tracked workload lanes

The server should not act as a long-history replay stream for this panel in v1.

## 12. Error Handling

- return `404` if `nodeId` has no known current snapshot
- return `200` with `workloadSummary.total = 0` and `workloads = []` if the node exists but no workloads are currently known
- metric values with no source data must be `null`
- seed window may contain fewer points than the theoretical window if source data is sparse

## 13. Non-Goals

This spec does not include:

- root-cause analysis
- alert suppression logic
- metric threshold interpretation
- workload restart diagnostics
- physical action hints
- room-by-node websocket optimization

## 14. Open Implementation Notes

- decide exact seed window length in implementation, but it should stay short and operator-friendly
- confirm the final trend serving source names for node and workload bucket history
- keep the REST and WS metric key sets aligned
- normalize timestamps to ISO-8601 UTC
- prefer stable field names between REST bootstrap and WS delta payloads

## 15. Suggested Next Step

After this spec is approved:

1. add DTOs for REST bootstrap and both websocket events
2. add read adapters for node seed buckets and workload seed buckets
3. implement tracked workload selection policy
4. implement `/metrics` bootstrap endpoint
5. implement `monitoring.node.metrics.updated`
6. implement `monitoring.node.metrics.workloads.changed`
7. add tests for selection policy, seed window mapping, and event emission behavior
