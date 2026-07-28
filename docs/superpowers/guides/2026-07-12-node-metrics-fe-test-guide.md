# Node Metrics FE, Swagger, and Postman Test Guide

Date: 2026-07-12
Feature: Node Metrics Realtime

## REST Bootstrap

Request:

```http
GET /api/v1/monitoring/nodes/{nodeId}/metrics
Authorization: Bearer <token>
```

Expected:

- response is wrapped in `{ data, meta }`
- `data.metricsConfig.bucketSec` is `60`
- `data.metricsConfig.retentionSec` is `900`
- `data.workloadSummary.returned <= 5`
- `data.workloads` is a tracked subset, not a full workload list
- `data.seedWindow.points` is short and bounded
- missing metric values are `null`

Minimal expected shape:

```json
{
  "data": {
    "node": {
      "nodeId": "node-msi-8bc4df0d",
      "lastSeenAt": "2026-07-12T09:12:30.000Z",
      "freshnessSec": 4
    },
    "metricsConfig": {
      "transport": "socket.io",
      "channel": "monitoring.node.metrics.updated",
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
    "workloads": [],
    "seedWindow": {
      "from": null,
      "to": null,
      "points": []
    }
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-07-12T09:12:31.000Z"
  }
}
```

## Socket.IO

Connect to namespace:

```text
/monitoring
```

Listen to:

```text
monitoring.node.metrics.updated
monitoring.node.metrics.workloads.changed
```

`monitoring.node.metrics.updated` expected payload:

```json
{
  "event": "monitoring.node.metrics.updated",
  "nodeId": "node-msi-8bc4df0d",
  "ts": "2026-07-12T09:13:00.000Z",
  "bucketSec": 60,
  "node": {
    "cpuUsagePct": 84.1,
    "memoryUsagePct": 76.8,
    "diskUsagePct": 71.4,
    "cpuTemperatureC": 81,
    "networkRxBytesSec": 2510000,
    "networkTxBytesSec": 1840000
  },
  "workloads": [
    {
      "workloadId": "container-api-01",
      "cpuUsagePct": 47.3,
      "memoryUsagePct": 39.1
    }
  ]
}
```

`monitoring.node.metrics.workloads.changed` expected payload:

```json
{
  "event": "monitoring.node.metrics.workloads.changed",
  "nodeId": "node-msi-8bc4df0d",
  "ts": "2026-07-12T09:13:00.000Z",
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

## FE Checklist

- Call REST `/metrics` when the Metrics tab opens.
- Render initial charts from `data.seedWindow.points`.
- Filter socket events by `nodeId`.
- Append each `metrics.updated` payload as exactly one chart point.
- Keep chart buffers capped at `retentionSec`.
- Remap workload chart lanes only when `workloads.changed` arrives.
