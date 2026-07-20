# Monitoring Service API Contract

## Node Overview Snapshot + Realtime

This document defines the public contract for the current node overview scope in `monitoring-service`.

Scope covered:

- `GET /api/v1/monitoring/nodes/:nodeId/overview`
- Socket.IO event `monitoring.node.overview.changed`

This contract is snapshot-first:

- the REST endpoint is the source of truth for node overview state
- realtime is a lightweight change signal
- the workload list is intentionally condensed, not a full inventory
- deep diagnosis and history queries are out of scope

## REST API

### `GET /api/v1/monitoring/nodes/:nodeId/overview`

Returns an operator-facing node overview snapshot for a single node.

#### Authorization

- Bearer authentication is required
- the endpoint is protected by `JwtAuthGuard`
- the caller must have permission `DASHBOARD_READ`

#### Path Parameters

- `nodeId` - string, required, stable node identifier from monitoring scope

#### Success Response `200`

The OpenAPI contract for this endpoint is an envelope with `data` and `meta`.

```json
{
  "data": {
    "node": {
      "nodeId": "node-msi-341b683e",
      "status": "alerting",
      "severity": "high",
      "lastSeenAt": "2026-07-17T18:04:29.000Z",
      "freshnessSec": 3,
      "fingerprintSeenAt": "2026-07-17T18:04:34.000Z",
      "batteryModel": "MS-158L",
      "cpuArchitecture": "386",
      "cpuModel": "AMD Ryzen 7 5800H with Radeon Graphics",
      "gpuModelPrimary": "AMD Radeon(TM) Graphics",
      "hardwareSerial": "BSS-0123456789",
      "logicalCpuCount": 16,
      "macAddress": "50:C2:E8:0B:14:A5",
      "motherboardModel": "MSI MS-158L",
      "osProduct": "Windows 11",
      "primaryIpv4": "192.168.1.2",
      "ssdModelPrimary": "KINGSTON SNV2S1000G"
    },
    "summaryMetrics": {
      "primaryNicStatus": {
        "value": "dormant",
        "unit": "state"
      },
      "worstMetric": {
        "metricKey": "node.tcp_retransmit_pct",
        "metricValueNumeric": 19.604,
        "metricValueText": "19.604"
      },
      "alertCounters": {
        "criticalMetricCount": 2,
        "warningMetricCount": 4,
        "staleMetricCount": 0
      }
    },
    "workloadSummary": {
      "total": 50,
      "unhealthy": 2,
      "nonRunning": 1,
      "returned": 5,
      "selectionMode": "abnormal_first_then_top_cpu"
    },
    "workloads": [
      {
        "workloadId": "db8559e332ec64dfa558917710d5afb621c0a7ea8b5f91193c5c288ba28d663d",
        "workloadType": "container",
        "name": "backend-shared-vector",
        "serviceName": "vector",
        "status": "running",
        "healthStatus": "unhealthy",
        "restartCount": 0,
        "worstMetricKey": "container.runtime_id",
        "isAbnormal": true
      }
    ],
    "realtime": {
      "transport": "socket.io",
      "channel": "monitoring.node.node-msi-341b683e.overview.changed"
    }
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-07-19T10:00:00.000Z"
  }
}
```

#### Response Semantics

- `data.node.nodeId` echoes the requested node identifier.
- `data.node.lastSeenAt` is derived from the snapshot summary timestamp and normalized to ISO-8601.
- `data.node.freshnessSec` is computed at response time as the non-negative age in seconds of `lastSeenAt`.
- `data.node.fingerprintSeenAt` is normalized to ISO-8601 when present, otherwise `null`.
- the remaining `data.node.*` fingerprint fields are passthrough hardware and identity context fields.
- `data.summaryMetrics` contains a small triage-oriented subset only.
- unavailable values in metric fields should be returned as `null`.
- `data.workloadSummary.total` counts all workloads for the node.
- `data.workloadSummary.returned` counts only the selected overview subset.
- `data.workloads` is a capped attention list, not the full workload inventory.
- `data.realtime.channel` is the node-specific Socket.IO event name for change notifications.

#### `data.node` Schema

- `nodeId` - string
- `status` - `"healthy" | "alerting" | "unknown"`
- `severity` - `"healthy" | "stale" | "warning" | "high" | "critical"`
- `lastSeenAt` - ISO-8601 datetime string
- `freshnessSec` - non-negative integer
- `fingerprintSeenAt` - ISO-8601 datetime string or `null`
- `batteryModel` - string or `null`
- `cpuArchitecture` - string or `null`
- `cpuModel` - string or `null`
- `gpuModelPrimary` - string or `null`
- `hardwareSerial` - string or `null`
- `logicalCpuCount` - number or `null`
- `macAddress` - string or `null`
- `motherboardModel` - string or `null`
- `osProduct` - string or `null`
- `primaryIpv4` - string or `null`
- `ssdModelPrimary` - string or `null`

#### `data.summaryMetrics` Schema

- `primaryNicStatus.value` - string or `null`
- `primaryNicStatus.unit` - string or `null`
- `worstMetric.metricKey` - string or `null`
- `worstMetric.metricValueNumeric` - number or `null`
- `worstMetric.metricValueText` - string or `null`
- `alertCounters.criticalMetricCount` - number
- `alertCounters.warningMetricCount` - number
- `alertCounters.staleMetricCount` - number

#### `data.workloadSummary` Schema

- `total` - number
- `unhealthy` - number
- `nonRunning` - number
- `returned` - number
- `selectionMode` - `"abnormal_first_then_top_cpu"`

#### `data.workloads[]` Schema

- `workloadId` - string
- `workloadType` - `"container"`
- `name` - string
- `serviceName` - string
- `status` - string
- `healthStatus` - string
- `restartCount` - number
- `worstMetricKey` - string or `null`
- `isAbnormal` - boolean

### Workload Selection Rules

The overview workload list is capped to `5` items.

Selection order:

1. abnormal workloads first
2. then higher `cpuUsagePct`
3. then higher `memoryUsagePct`
4. then lexical `name` as a stable tiebreaker

A workload is considered abnormal when at least one of the following is true:

- `healthStatus` is `unhealthy` after trim/lowercase normalization
- `status` is not `running` after trim/lowercase normalization
- `restartCount > 0`

Derived counters:

- `unhealthy` counts workloads where `healthStatus === "unhealthy"` after normalization
- `nonRunning` counts workloads where `status !== "running"` after normalization

### Node Status Derivation

`status` is derived from snapshot signals:

- `unknown` when the snapshot is considered unknown
- `alerting` when `criticalMetricCount > 0` or `warningMetricCount > 0`
- `healthy` otherwise

The snapshot is considered unknown when either:

- `freshnessSec < 0`
- `isAnyStale >= 1` and `staleMetricCount > 0` and `criticalMetricCount === 0` and `warningMetricCount === 0`

In current implementation, `freshnessSec` is clamped to a non-negative value before this check, so the effective unknown case is the stale-only condition above.

### Node Severity Derivation

`severity` is derived from snapshot severity and counter signals:

- `critical` when `maxSeverityCode >= 4`
- `high` when `maxSeverityCode >= 3` or `criticalMetricCount > 0`
- `warning` when `maxSeverityCode >= 2` or `warningMetricCount > 0`
- `stale` when `maxSeverityCode >= 1` or `isAnyStale >= 1` or `staleMetricCount > 0`
- `healthy` otherwise

`severity` does not directly use `freshnessSec` in the current implementation.

### Error Responses

Expected error conditions:

- `401 Unauthorized` - missing or invalid bearer token
- `403 Forbidden` - authenticated caller lacks `DASHBOARD_READ`
- `404 Not Found` - no current node snapshot exists for `nodeId`
- `500 Internal Server Error` - unexpected backend failure

The current controller does not define explicit path validation for `nodeId`; any `400 Bad Request` behavior would have to come from framework-level validation added elsewhere.

## Realtime Contract

### Socket.IO Transport

- namespace: `/monitoring`
- broadcast event: `monitoring.node.overview.changed`
- node-specific event: `monitoring.node.{nodeId}.overview.changed`

The gateway emits both the shared event name and the node-specific channel using the same payload.

### Event Payload

```json
{
  "event": "monitoring.node.overview.changed",
  "nodeId": "node-msi-341b683e",
  "channel": "monitoring.node.node-msi-341b683e.overview.changed",
  "changedAt": "2026-07-19T10:00:00.000Z",
  "fingerprint": "{\"node\":{\"nodeId\":\"node-msi-341b683e\"}}"
}
```

Fields:

- `event` - fixed string `monitoring.node.overview.changed`
- `nodeId` - affected node identifier
- `channel` - node-specific channel name
- `changedAt` - ISO-8601 emission timestamp
- `fingerprint` - JSON string fingerprint of the normalized public overview subset used for change detection

### Realtime Emission Rules

The polling sync use case maintains an in-memory checkpoint and an in-memory fingerprint map.

Current behavior:

- on the first sync run after process start, the use case initializes `checkpointSummaryTs` and emits nothing
- on later runs, it queries changed node ids since the checkpoint for reporting, then iterates the current overview-sync candidate node ids
- for each candidate node, it rebuilds the overview snapshot
- if overview composition fails for a node, that node is skipped and a warning is logged
- if the computed fingerprint matches the previous fingerprint for that node, no event is emitted
- if the fingerprint changed or the node has not been seen before in memory, one event is emitted
- after the sync loop finishes, the checkpoint is updated to the latest node change summary timestamp

The fingerprint currently includes only:

- `node`
- `summaryMetrics`
- `workloadSummary`
- `workloads`

The `realtime` block is intentionally excluded from change detection.

### Consumer Flow

1. The client calls `GET /api/v1/monitoring/nodes/:nodeId/overview`.
2. The client renders the snapshot from the REST response.
3. The client connects to Socket.IO namespace `/monitoring`.
4. The client listens to either `monitoring.node.overview.changed` or `data.realtime.channel`.
5. When a matching event arrives, the client refetches `GET /api/v1/monitoring/nodes/:nodeId/overview`.

## Notes

- The controller is mounted at `monitoring/nodes`, so the public route is `GET /api/v1/monitoring/nodes/:nodeId/overview` when the service is served under `/api/v1`.
- The documented contract reflects the current DTOs, controller annotations, composer logic, and realtime sync implementation as of July 19, 2026.
