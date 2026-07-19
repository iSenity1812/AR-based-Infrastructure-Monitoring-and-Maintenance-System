# Monitoring Service API Contract

## Node Metrics Bootstrap + Realtime

This document defines the public contract for the current node metrics scope in `monitoring-service`.

Scope covered:

- `GET /api/v1/monitoring/nodes/:nodeId/metrics`
- `GET /api/v1/monitoring/nodes/:nodeId/metrics/live`
- advertised realtime channel `monitoring.node.{nodeId}.metrics.updated`
- related workload-membership realtime channel `monitoring.node.{nodeId}.metrics.workloads.changed`

This contract is chart-bootstrap first:

- the REST endpoint returns the initial metrics seed window
- realtime updates extend or refresh the visible chart state
- the tracked workload list is intentionally capped
- this contract does not expose arbitrary metric selection

## REST API

### `GET /api/v1/monitoring/nodes/:nodeId/metrics`

Returns the bootstrap payload for node-level realtime charts.

#### Authorization

- Bearer authentication is required
- the endpoint is protected by `JwtAuthGuard`
- the caller must have permission `DASHBOARD_READ`

#### Path Parameters

- `nodeId` - string, required, stable node identifier from monitoring scope

#### Query Parameters

- `from` - string, optional, inclusive ISO-8601 lower bound for the requested seed window
- `to` - string, optional, inclusive ISO-8601 upper bound for the requested seed window

The current controller does not declare DTO validation for these query parameters. They are forwarded as optional strings into the metrics range resolver.

#### Success Response `200`

The OpenAPI contract for this endpoint is an envelope with `data` and `meta`.

```json
{
  "data": {
    "nodeId": "node-msi-8bc4df0d",
    "metricsConfig": {
      "transport": "socket.io",
      "channel": "monitoring.node.node-msi-8bc4df0d.metrics.updated",
      "bucketSec": 60,
      "retentionSec": 900,
      "nodeMetricKeys": [
        "cpuUsagePct",
        "memoryUsagePct",
        "diskUsagePct",
        "cpuTemperatureC",
        "networkRxBytesSec",
        "networkTxBytesSec"
      ],
      "workloadMetricKeys": ["cpuUsagePct", "memoryUsagePct"]
    },
    "meta": {
      "units": {
        "cpuUsagePct": "%",
        "memoryUsagePct": "%",
        "diskUsagePct": "%",
        "cpuTemperatureC": "C",
        "networkRxBytesSec": "bytes/sec",
        "networkTxBytesSec": "bytes/sec",
        "workloadCpuUsagePct": "%",
        "workloadMemoryUsagePct": "%"
      }
    },
    "workloads": [
      {
        "workloadId": "container-api-01",
        "workloadType": "container",
        "name": "control-plane-api"
      }
    ],
    "seedWindow": {
      "from": "2026-07-19T09:48:00.000Z",
      "to": "2026-07-19T10:03:00.000Z",
      "resolutionSec": 60,
      "timestamps": [
        "2026-07-19T09:48:00.000Z",
        "2026-07-19T09:49:00.000Z",
        "2026-07-19T09:50:00.000Z"
      ],
      "nodeMetrics": {
        "cpuUsagePct": [79.1, 81.4, null],
        "memoryUsagePct": [75.2, 75.1, null],
        "diskUsagePct": [71.4, 71.4, null],
        "cpuTemperatureC": [78.8, 79.4, null],
        "networkRxBytesSec": [2210000, 2200000, null],
        "networkTxBytesSec": [1700000, 1680000, null]
      },
      "workloadMetrics": {
        "container-api-01": {
          "cpuUsagePct": [42.8, 40.5, null],
          "memoryUsagePct": [37.9, 37.4, null]
        }
      }
    }
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-07-19T10:03:00.000Z"
  }
}
```

#### Response Semantics

- `data.nodeId` is copied from the current node snapshot returned by the repository.
- `data.metricsConfig` advertises the fixed transport and metric-key contract used by the realtime chart flow.
- `data.workloads` contains only the tracked workload subset used for workload chart series.
- `data.seedWindow.timestamps` is the authoritative x-axis for every returned series.
- every array in `data.seedWindow.nodeMetrics` aligns 1:1 with `data.seedWindow.timestamps`.
- every workload series inside `data.seedWindow.workloadMetrics` aligns 1:1 with `data.seedWindow.timestamps`.
- missing buckets are represented by `null`, not omitted.
- `data.seedWindow.from` and `data.seedWindow.to` are derived from the completed timestamp grid, not merely echoed from the raw query string.

#### `data.metricsConfig` Schema

- `transport` - `"socket.io"`
- `channel` - string, node-specific metrics update channel
- `bucketSec` - `60`
- `retentionSec` - `900`
- `nodeMetricKeys` - array of:
  - `cpuUsagePct`
  - `memoryUsagePct`
  - `diskUsagePct`
  - `cpuTemperatureC`
  - `networkRxBytesSec`
  - `networkTxBytesSec`
- `workloadMetricKeys` - array of:
  - `cpuUsagePct`
  - `memoryUsagePct`

#### `data.meta.units` Schema

- `cpuUsagePct` - `%`
- `memoryUsagePct` - `%`
- `diskUsagePct` - `%`
- `cpuTemperatureC` - `C`
- `networkRxBytesSec` - `bytes/sec`
- `networkTxBytesSec` - `bytes/sec`
- `workloadCpuUsagePct` - `%`
- `workloadMemoryUsagePct` - `%`

#### `data.workloads[]` Schema

- `workloadId` - string
- `workloadType` - `"container"`
- `name` - string

#### `data.seedWindow` Schema

- `from` - ISO-8601 datetime string or `null`
- `to` - ISO-8601 datetime string or `null`
- `resolutionSec` - number
- `timestamps` - array of ISO-8601 datetime strings
- `nodeMetrics.cpuUsagePct` - array of `number | null`
- `nodeMetrics.memoryUsagePct` - array of `number | null`
- `nodeMetrics.diskUsagePct` - array of `number | null`
- `nodeMetrics.cpuTemperatureC` - array of `number | null`
- `nodeMetrics.networkRxBytesSec` - array of `number | null`
- `nodeMetrics.networkTxBytesSec` - array of `number | null`
- `workloadMetrics` - object keyed by `workloadId`
- `workloadMetrics[workloadId].cpuUsagePct` - array of `number | null`
- `workloadMetrics[workloadId].memoryUsagePct` - array of `number | null`

### Seed Window Resolution Rules

The current implementation resolves the requested window as follows:

- if `to` is omitted, `to` defaults to current time
- if `from` is omitted, `from` defaults to `to - 900 seconds`
- both `from` and `to` are floored to a minute or higher selected resolution
- if parsed `from` is later than parsed `to`, `from` is clamped down to `to`
- if parsing fails, the resolver falls back to a safe default window ending at current time

The current implementation then selects `resolutionSec` from these candidates:

- `60`
- `300`
- `900`
- `1800`
- `3600`
- `10800`
- `21600`
- `43200`
- `86400`

Selection rule:

- pick the first resolution where the completed bucket count is at most `500`

The returned timestamp grid is fully expanded from resolved `from` to resolved `to` at `resolutionSec` steps, inclusive.

### Workload Tracking Rules

The tracked workload list is capped to `5` items.

The REST endpoint uses the default selection mode `top_cpu_then_memory`.

Selection order:

1. higher `cpuUsagePct`
2. then higher `memoryUsagePct`
3. then lexical `workloadId` as a stable tiebreaker

Even though the repository contract supports additional selection modes, the current REST bootstrap flow does not expose selection mode as a request parameter and always uses the default above.

### Not Found and Empty-State Behavior

- if no current node snapshot exists for `nodeId`, the endpoint returns `404 Not Found`
- if the node exists but there are no workloads, `data.workloads` is an empty array
- if there are no metric buckets in the requested window, `timestamps` may be empty and the series arrays will be empty
- if some timestamps are present but a metric is missing for a bucket, the corresponding series value is `null`

### Error Responses

Expected error conditions:

- `401 Unauthorized` - missing or invalid bearer token
- `403 Forbidden` - authenticated caller lacks `DASHBOARD_READ`
- `404 Not Found` - no current node metrics snapshot exists for `nodeId`
- `500 Internal Server Error` - unexpected backend failure

The current controller does not define explicit request validation for malformed `from` or `to`. Invalid values are currently normalized by the range resolver rather than rejected up front.

---

### `GET /api/v1/monitoring/nodes/:nodeId/metrics/live`

Returns a live metrics bootstrap payload for short-interval node and container charts.

#### Authorization

- Bearer authentication is required
- the endpoint is protected by `JwtAuthGuard`
- the caller must have permission `DASHBOARD_READ`

#### Path Parameters

- `nodeId` - string, required, stable node identifier from monitoring scope

#### Query Parameters

- `from` - string, optional, inclusive ISO-8601 lower bound for the requested live window
- `to` - string, optional, inclusive ISO-8601 upper bound for the requested live window
- `interval` - string, optional, requested live bucket interval in seconds

#### Success Response `200`

The response envelope and payload shape are intentionally the same as `GET /api/v1/monitoring/nodes/:nodeId/metrics`.

Differences are expressed through payload values rather than a different schema:

- `data.metricsConfig.bucketSec` is dynamic for the live request
- `data.metricsConfig.retentionSec` reflects the resolved live window size
- `data.seedWindow.resolutionSec` matches the resolved live interval
- `data.seedWindow.timestamps` uses the live interval grid

Representative live payload:

```json
{
  "data": {
    "nodeId": "node-msi-8bc4df0d",
    "metricsConfig": {
      "transport": "socket.io",
      "channel": "monitoring.node.node-msi-8bc4df0d.metrics.updated",
      "bucketSec": 5,
      "retentionSec": 300,
      "nodeMetricKeys": [
        "cpuUsagePct",
        "memoryUsagePct",
        "diskUsagePct",
        "cpuTemperatureC",
        "networkRxBytesSec",
        "networkTxBytesSec"
      ],
      "workloadMetricKeys": ["cpuUsagePct", "memoryUsagePct"]
    },
    "meta": {
      "units": {
        "cpuUsagePct": "%",
        "memoryUsagePct": "%",
        "diskUsagePct": "%",
        "cpuTemperatureC": "C",
        "networkRxBytesSec": "bytes/sec",
        "networkTxBytesSec": "bytes/sec",
        "workloadCpuUsagePct": "%",
        "workloadMemoryUsagePct": "%"
      }
    },
    "workloads": [
      {
        "workloadId": "container-api-01",
        "workloadType": "container",
        "name": "control-plane-api"
      }
    ],
    "seedWindow": {
      "from": "2026-07-19T09:58:00.000Z",
      "to": "2026-07-19T10:03:00.000Z",
      "resolutionSec": 5,
      "timestamps": [
        "2026-07-19T10:02:50.000Z",
        "2026-07-19T10:02:55.000Z",
        "2026-07-19T10:03:00.000Z"
      ],
      "nodeMetrics": {
        "cpuUsagePct": [70.1, 71.8, 72.4],
        "memoryUsagePct": [84.7, 84.9, 85.0],
        "diskUsagePct": [84.6, 84.6, 84.7],
        "cpuTemperatureC": [79, 80, 80],
        "networkRxBytesSec": [4180, 4202, 4169],
        "networkTxBytesSec": [2281, 2290, 2274]
      },
      "workloadMetrics": {
        "container-api-01": {
          "cpuUsagePct": [40.2, 40.8, null],
          "memoryUsagePct": [36.4, 36.7, null]
        }
      }
    }
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-07-19T10:03:00.000Z"
  }
}
```

#### Live Window Resolution Rules

The current live implementation resolves the requested window as follows:

- if `interval` is omitted, it defaults to `5` seconds
- if `to` is omitted, `to` defaults to current time floored to the resolved interval
- if `from` is omitted, `from` defaults to `to - 300 seconds`
- if parsing fails, the resolver falls back to a safe default window ending at current time
- if parsed `from` is later than parsed `to`, `from` is clamped down to `to`
- if the requested range would exceed `400` points, `from` is capped forward so the returned grid stays within `400` points

Currently allowed live interval values are:

- `1`
- `5`
- `10`
- `15`
- `30`
- `60`

If `interval` is missing or unsupported, the live endpoint falls back to `5`.

#### Live Data Source Notes

The live endpoint uses raw telemetry aggregation at query time from `telemetry_db.telemetry_metrics`.

Current metric-key mapping:

- node:
  - `node.cpu_usage_pct`
  - `node.memory_used_pct`
  - `node.disk_used_pct`
  - `node.cpu_temperature_c`
  - `node.network_rx_bytes_sec`
  - `node.network_tx_bytes_sec`
- workload:
  - `container.cpu_usage_pct`
  - `container.memory_used_pct`

The tracked workload list still reuses the same workload selection logic as the standard `/metrics` endpoint.

#### Live Empty-State Behavior

- if no current node snapshot exists for `nodeId`, the endpoint returns `404 Not Found`
- if the node exists but there are no tracked workloads, `data.workloads` is an empty array
- if the live query produces no metric rows for the requested window, `timestamps` still reflects the resolved interval grid and the returned series are all `null`
- if a specific metric is missing for a returned timestamp, that series value is `null`

#### Live Error Responses

Expected error conditions are the same as `GET /api/v1/monitoring/nodes/:nodeId/metrics`:

- `401 Unauthorized` - missing or invalid bearer token
- `403 Forbidden` - authenticated caller lacks `DASHBOARD_READ`
- `404 Not Found` - no current node metrics snapshot exists for `nodeId`
- `500 Internal Server Error` - unexpected backend failure

## Realtime Relationship

### Advertised Channel

The REST response exposes:

- `data.metricsConfig.channel = monitoring.node.{nodeId}.metrics.updated`

This is the node-specific realtime channel for metric value updates.

### Related Workload Membership Channel

The current implementation also emits a separate channel:

- `monitoring.node.{nodeId}.metrics.workloads.changed`

This second channel is relevant because the tracked workload slice can change independently from metric value updates.

### Realtime Event Shapes

The fixed node metrics update event shape is:

```json
{
  "event": "monitoring.node.metrics.updated",
  "nodeId": "node-msi-8bc4df0d",
  "channel": "monitoring.node.node-msi-8bc4df0d.metrics.updated",
  "ts": "2026-07-19T10:03:00.000Z",
  "bucketSec": 60,
  "node": {
    "cpuUsagePct": 82.4,
    "memoryUsagePct": 67.1,
    "diskUsagePct": 91.2,
    "cpuTemperatureC": 80,
    "networkRxBytesSec": 1843200,
    "networkTxBytesSec": 902144
  },
  "workloads": {
    "container-api-01": {
      "cpuUsagePct": 18.2,
      "memoryUsagePct": 12.4
    }
  }
}
```

The workload-membership change event shape is:

```json
{
  "event": "monitoring.node.metrics.workloads.changed",
  "nodeId": "node-msi-8bc4df0d",
  "channel": "monitoring.node.node-msi-8bc4df0d.metrics.workloads.changed",
  "ts": "2026-07-19T10:03:00.000Z",
  "workloadSummary": {
    "total": 52,
    "returned": 5,
    "selectionMode": "top_cpu_then_memory"
  },
  "workloads": [
    {
      "workloadId": "container-api-01",
      "workloadType": "container",
      "name": "control-plane-api",
      "status": "running",
      "latestCpuUsagePct": 18.2,
      "latestMemoryUsagePct": 12.4
    }
  ]
}
```

### Realtime Semantics

- Socket.IO namespace: `/monitoring`
- the gateway emits both the global event name and the node-specific `channel`
- the metrics update event may intentionally contain all-`null` values when the current node snapshot is older than `60` seconds
- the metrics update event timestamp `ts` is bucket-aligned to `bucketSec`
- workload-membership changes are fingerprinted separately from metric-value changes
- on the first sync run after process start, the realtime sync initializes its checkpoint and emits nothing

## Consumer Flow

1. The client calls `GET /api/v1/monitoring/nodes/:nodeId/metrics`.
2. The client renders chart series from `data.seedWindow`.
3. The client connects to Socket.IO namespace `/monitoring`.
4. The client listens to `data.metricsConfig.channel` for metric updates.
5. The client also listens to `monitoring.node.{nodeId}.metrics.workloads.changed` to detect changes in the tracked workload slice.
6. If workload membership changes, the client should refresh the REST bootstrap payload or rebuild the chart state accordingly.

## Notes

- The controller is mounted at `monitoring/nodes`, so the public route is `GET /api/v1/monitoring/nodes/:nodeId/metrics` when the service is served under `/api/v1`.
- This document reflects the current controller annotations, DTOs, composer logic, and realtime sync implementation as of July 19, 2026.
