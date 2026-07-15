# Monitoring Service API Contract

## Node Overview Snapshot + Realtime

This document defines the public contract for the current `node overview` scope in `monitoring-service`.

Scope covered:

- `GET /api/v1/monitoring/nodes/:nodeId/overview`
- WebSocket event `monitoring.node.overview.updated`

This contract is intentionally snapshot-first:

- overview is a shallow drill-down
- deep insight and trend analysis are out of scope for this document
- workload list is condensed and not a full listing
- realtime payload mirrors the REST payload so the frontend can reuse the same mapper

## Design Goals

The overview response should answer these operator questions quickly:

- Is this node healthy right now?
- What is the most important evidence on the node?
- Which workloads on this node are worth attention first?
- Is the data fresh enough to trust for action?

## Non-Goals

The following are not part of this contract:

- deep diagnosis or root-cause analysis
- historical trend queries such as `node_summary_trend_1m`
- full workload inventory for a node
- physical asset metadata such as rack position or serial number

## REST API

### `GET /api/v1/monitoring/nodes/:nodeId/overview`

Returns a snapshot overview for a single node.

#### Path Parameters

- `nodeId` - string, required

#### Authorization

Uses the existing monitoring-service auth and permission pattern already used by rack endpoints.

#### Success Response `200`

```json
{
  "node": {
    "nodeId": "node-msi-8bc4df0d",
    "status": "alerting",
    "severity": "high",
    "lastSeenAt": "2026-07-10T09:12:30Z",
    "freshnessSec": 3
  },
  "summaryMetrics": {
    "cpuUsagePct": 82.4,
    "memoryUsagePct": 67.1,
    "diskUsagePct": 91.2,
    "cpuTemperatureC": 80.0,
    "networkRxBytesSec": 1843200,
    "networkTxBytesSec": 902144,
    "primaryNicStatus": "up",
    "worstMetric": "cpuTemperatureC",
    "alertCounters": {
      "criticalMetricCount": 1,
      "warningMetricCount": 2,
      "staleMetricCount": 0
    }
  },
  "workloadSummary": {
    "total": 52,
    "unhealthy": 2,
    "nonRunning": 1,
    "highCpu": 7,
    "highMemory": 4,
    "returned": 5,
    "selectionMode": "abnormal_first_then_top_cpu"
  },
  "workloads": [
    {
      "workloadId": "container-nginx-01",
      "workloadType": "container",
      "name": "nginx",
      "status": "running",
      "cpuUsagePct": 18.2,
      "memoryUsagePct": 12.4
    },
    {
      "workloadId": "container-api-01",
      "workloadType": "container",
      "name": "control-plane-api",
      "status": "running",
      "cpuUsagePct": 46.1,
      "memoryUsagePct": 38.7
    }
  ]
}
```

#### Response Semantics

- `node.nodeId` is the requested node identifier.
- `node.status` is derived from current snapshot semantics and is a public UI state.
- `node.severity` is derived from the latest severity signal and is a public UI state.
- `node.lastSeenAt` is the snapshot timestamp returned by the serving row.
- `node.freshnessSec` is derived from `lastSeenAt` at response time.
- `summaryMetrics` contains only the snapshot metrics currently exposed by the service.
- any metric that has no available value must be returned as `null`, not fabricated.
- `workloadSummary.total` reflects the full node population, not just the returned top five.
- `workloads` is a condensed attention list, not the full workload inventory.

#### Summary Metrics Schema

`summaryMetrics` should contain the following fields:

- `cpuUsagePct` - number or `null`
- `memoryUsagePct` - number or `null`
- `diskUsagePct` - number or `null`
- `cpuTemperatureC` - number or `null`
- `networkRxBytesSec` - number or `null`
- `networkTxBytesSec` - number or `null`
- `primaryNicStatus` - string or `null`
- `worstMetric` - string or `null`
- `alertCounters.criticalMetricCount` - integer
- `alertCounters.warningMetricCount` - integer
- `alertCounters.staleMetricCount` - integer

#### Workload Summary Schema

`workloadSummary` should contain:

- `total` - integer
- `unhealthy` - integer
- `nonRunning` - integer
- `highCpu` - integer
- `highMemory` - integer
- `returned` - integer
- `selectionMode` - `"abnormal_first_then_top_cpu"`

#### Workload Item Schema

Each workload item contains:

- `workloadId` - string
- `workloadType` - `"container"`
- `name` - string
- `status` - string
- `cpuUsagePct` - number or `null`
- `memoryUsagePct` - number or `null`

### Selection Rules for `workloads`

The overview workload list is intentionally capped to keep the payload small and operator-focused.

Selection order:

1. abnormal workloads first
2. then highest CPU usage
3. then highest memory usage
4. limit to 5 items

For this contract, a workload is treated as abnormal when the backend decides it is not in a clean operating state.

#### Filtering Behavior

- if a node has only a small number of workloads, all of them may be returned
- if a node has many workloads, only the most relevant five are returned
- if a node has workloads but none are abnormal, the list falls back to the highest CPU consumers
- if no workloads are found, return an empty array and `workloadSummary.total = 0`

### Node Derivation Rules

Public node state is derived from snapshot semantics, not exposed directly from raw internal codes.

Recommended public mapping:

- `healthy` / `none` when there is no warning, no critical signal, and no severe staleness
- `alerting` / `medium` when warning signals exist but no critical signal exists
- `alerting` / `high` when a critical signal exists
- `unknown` when the snapshot is too stale or current truth is not available

The service must not expose raw internal severity codes in the public API.

### Error Responses

The endpoint should follow the existing monitoring-service error envelope and behavior.

Expected error conditions:

- `400 Bad Request` - invalid `nodeId`
- `401 Unauthorized` - missing authentication
- `403 Forbidden` - missing monitoring access permission
- `404 Not Found` - node snapshot not found
- `500 Internal Server Error` - unexpected backend failure

## WebSocket Contract

### Event: `monitoring.node.overview.updated`

Realtime event emitted when the public overview snapshot for a node changes.

#### Delivery Shape

The websocket event should reuse the same business payload shape as the REST endpoint:

- `node`
- `summaryMetrics`
- `workloadSummary`
- `workloads`

This keeps frontend rendering logic consistent between initial load and subsequent updates.

#### Subscription Model

Current implementation uses namespace-wide delivery with client-side filtering.

Rules:

- the event payload always includes `node.nodeId`
- the client decides whether to render it for the currently open node panel
- there is no requirement for a room-per-node design in this phase

#### Emission Rules

Emit the event when any public overview field changes:

- `node.status`
- `node.severity`
- `node.lastSeenAt`
- `node.freshnessSec`
- any `summaryMetrics` field
- any `workloadSummary` field
- the top-5 workload list

Do not emit when the normalized public overview snapshot is unchanged.

## Example Consumer Flow

1. Frontend opens a node overview panel.
2. Frontend requests `GET /api/v1/monitoring/nodes/:nodeId/overview`.
3. Frontend renders the snapshot immediately.
4. Frontend listens for `monitoring.node.overview.updated`.
5. If the event matches the open `nodeId`, frontend replaces the visible overview state.

## Implementation Notes

The contract currently reflects the snapshot-only overview implementation:

- node snapshot source: `telemetry_db.node_current_summary`
- workload source: `telemetry_db.container_current_summary`
- realtime sync is driven from the existing poll cycle
- deep insight should be designed separately in a later contract

