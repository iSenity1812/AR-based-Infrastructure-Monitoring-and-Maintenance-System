# Monitoring Service Socket.IO Contract

## Scope

This document covers the current Socket.IO realtime contract exposed by `monitoring-service` for frontend consumption.

Covered:

- Socket.IO namespace
- outbound event names
- payload shapes
- frontend subscription guidance

Not covered:

- REST snapshot endpoints
- persistence models
- internal poll scheduling

## Service Basics

| Property | Value |
| --- | --- |
| **Service** | `monitoring-service` |
| **Transport** | Socket.IO |
| **Namespace** | `/monitoring` |
| **Direction** | server to client only |
| **Client auth** | same JWT session context as the monitoring UI |

Current implementation details:

- the gateway is namespace-scoped at `/monitoring`
- the server emits events with `server.emit(...)`
- there are no `@SubscribeMessage()` handlers in the current implementation
- delivery is broadcast to the namespace, not room-targeted

## Connection Rules

### Namespace

Frontend clients should connect to:

```text
/monitoring
```

### Authentication

The gateway itself does not define a separate auth handshake in code. Frontend should reuse the same authenticated session or token strategy already used by the monitoring UI.

### Delivery Model

The current gateway broadcasts events to all connected clients in the namespace.

Frontend behavior should be:

- listen globally on the namespace
- filter events by `rackId` or `nodeId` in the client
- treat realtime events as delta updates, not full snapshots

## Event Contract

### `monitoring.rack.state.changed`

Emitted when rack monitoring state changes.

#### Purpose

Use this event to keep the rack overview UI in sync when a rack activates or resolves.

#### Payload

```json
{
  "scope": "rack",
  "view": "monitoring_state_delta",
  "rackId": "rack-a1",
  "rackName": "Rack A1",
  "rackCode": "RACK-A1",
  "transitionKind": "activate",
  "changedAt": "2026-07-08T09:55:00.000Z",
  "operational": {
    "severityCode": 3,
    "overrideFlag": true,
    "lifecycleStatus": "active",
    "fingerprint": "rack:rack-a1|source:rack_current_summary|severity:3|override:1",
    "firstObservedAt": "2026-07-08T09:55:00.000Z",
    "lastObservedAt": "2026-07-08T09:59:30.000Z",
    "lastStateChangedAt": "2026-07-08T09:55:00.000Z",
    "openedAt": "2026-07-08T09:55:00.000Z",
    "resolvedAt": null
  },
  "notification": {
    "syncStatus": "open_synced",
    "lastNotificationAttemptAt": "2026-07-08T09:55:02.000Z",
    "lastNotificationSyncedAt": "2026-07-08T09:55:03.000Z"
  }
}
```

#### Field Notes

- `transitionKind` is currently limited to `activate` and `resolve`
- `operational.severityCode` is a backend severity code, not a UI label
- `notification.syncStatus` reflects outbound sync state for the rack monitoring flow

#### Frontend Use

For rack overview, this event should be treated as an invalidation signal:

- update the visible rack card if the `rackId` matches a currently rendered rack
- refresh the rack overview snapshot when the screen needs an authoritative resync
- use the event payload for lightweight local patching when possible

---

### `monitoring.rack.overview.updated`

Emitted when the public rack overview card changes.

#### Purpose

Use this event for the rack overview screen. It is shaped like a single `riskCards[]` item from the REST snapshot, so the frontend can patch one card without learning the internal monitoring delta format.

#### Payload

```json
{
  "event": "monitoring.rack.overview.updated",
  "scope": "rack",
  "view": "operator_dashboard",
  "rack": {
    "id": "rack-a1",
    "name": "Rack A1",
    "code": "RACK-A1"
  },
  "status": {
    "severity": "critical",
    "override": true,
    "rackLevelFailure": true,
    "signalLoss": true,
    "staleNodes": 1
  },
  "metrics": {
    "totalNodes": 24,
    "badNodes": 13,
    "criticalNodes": 4,
    "warningNodes": 8,
    "badNodeRatio": 0.5417
  },
  "culprit": {
    "nodeId": "node-17",
    "metric": {
      "key": "node.memory_used_pct",
      "tags": {
        "host": "node-17"
      },
      "value": {
        "numeric": 98.4,
        "text": "98.4"
      }
    }
  },
  "trend": {
    "delta1m": 0,
    "delta5m": 0,
    "lastChangeAgeSec": 0
  },
  "updatedAt": "2026-07-08T10:00:00.000Z",
  "location": {
    "site": "DC01",
    "room": "ROOM-A",
    "row": "ROW-03",
    "position": "POS-12"
  }
}
```

#### Frontend Use

- patch the matching card in `riskCards`
- if the rack is not currently rendered, ignore it or use it to refresh the overview snapshot
- use this event as the primary realtime signal for the rack overview screen

#### Relation to `monitoring.rack.state.changed`

- `monitoring.rack.state.changed` remains the internal monitoring delta event
- `monitoring.rack.overview.updated` is the frontend-friendly public event
- both may be emitted for the same rack transition during the migration window

---

### `monitoring.node.overview.updated`

Emitted when a node overview snapshot changes.

#### Purpose

Use this when the UI shows a node detail panel or a node-focused drill-down.

#### Payload

```json
{
  "nodeId": "node-msi-8bc4df0d",
  "emittedAt": "2026-07-08T09:59:30.000Z",
  "node": {
    "nodeId": "node-msi-8bc4df0d",
    "status": "alerting",
    "severity": "high",
    "lastSeenAt": "2026-07-08T09:59:30.000Z",
    "freshnessSec": 3
  },
  "summaryMetrics": {
    "cpuUsagePct": 82.4,
    "memoryUsagePct": 67.1,
    "diskUsagePct": 91.2,
    "cpuTemperatureC": 80,
    "networkRxBytesSec": 1843200,
    "networkTxBytesSec": 902144,
    "primaryNicStatus": "up",
    "worstMetric": {
      "metricKey": "cpuTemperatureC",
      "metricValueNumeric": 80,
      "metricValueText": "80"
    },
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
      "serviceName": "control-plane-api",
      "status": "running",
      "healthStatus": "healthy",
      "cpuUsagePct": 18.2,
      "memoryUsagePct": 12.4,
      "restartCount": 0,
      "pidCount": 3,
      "worstMetricKey": "cpuUsagePct",
      "isAbnormal": false
    }
  ]
}
```

#### Frontend Use

- keep a node detail panel in sync
- replace the visible node snapshot when `nodeId` matches the active node
- do not use this event as the rack overview source of truth

---

### `monitoring.node.metrics.updated`

Emitted when node metric samples change.

#### Payload

```json
{
  "event": "monitoring.node.metrics.updated",
  "nodeId": "node-msi-8bc4df0d",
  "ts": "2026-07-08T09:59:30.000Z",
  "bucketSec": 60,
  "node": {
    "cpuUsagePct": 82.4,
    "memoryUsagePct": 67.1,
    "diskUsagePct": 91.2,
    "cpuTemperatureC": 80,
    "networkRxBytesSec": 1843200,
    "networkTxBytesSec": 902144
  },
  "workloads": [
    {
      "workloadId": "container-nginx-01",
      "cpuUsagePct": 18.2,
      "memoryUsagePct": 12.4
    }
  ]
}
```

#### Frontend Use

- suitable for metric tiles or compact node charts
- not required for rack overview cards

---

### `monitoring.node.metrics.workloads.changed`

Emitted when the workload slice for a node changes.

#### Payload

```json
{
  "event": "monitoring.node.metrics.workloads.changed",
  "nodeId": "node-msi-8bc4df0d",
  "ts": "2026-07-08T09:59:30.000Z",
  "workloadSummary": {
    "total": 52,
    "returned": 5,
    "selectionMode": "abnormal_first_then_top_cpu"
  },
  "workloads": [
    {
      "workloadId": "container-nginx-01",
      "workloadType": "container",
      "name": "nginx",
      "status": "running",
      "latestCpuUsagePct": 18.2,
      "latestMemoryUsagePct": 12.4
    }
  ]
}
```

#### Frontend Use

- suitable for workload-focused panels
- not required for rack overview cards

## Recommended Frontend Flow

1. Open a Socket.IO connection to `/monitoring`.
2. Render the initial rack overview from the HTTP snapshot endpoint.
3. Listen for `monitoring.rack.overview.updated`.
4. If the event matches a rendered rack, patch the visible card directly.
5. Optionally also listen for `monitoring.rack.state.changed` during migration or for lower-level monitoring views.
6. Use node events only when the UI has a node drill-down or detail panel.

## Integration Notes

- current realtime delivery is namespace-wide, so client-side filtering is required
- no client-to-server messages are implemented yet
- additive fields may appear in payloads over time
- consumers should not depend on undocumented fields

## Coverage

This document reflects the current Socket.IO implementation in `monitoring-service`:

- namespace: `/monitoring`
- emitted events: 5
- subscribed events: 0
- room-based routing: not implemented
