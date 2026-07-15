# Monitoring Service API Contract

> Backend implementation: `backend/apps/control-plane/monitoring-service/`
>
> Scope: public monitoring read models and manual polling APIs currently implemented in the service.
>
> Note: health endpoints are intentionally omitted from this contract, per request.

---

## Service Overview

| Property | Value |
| --- | --- |
| **Service** | `monitoring-service` |
| **Base path** | `/api/v1` |
| **Transport** | REST / JSON |
| **Auth** | JWT bearer token |
| **Primary consumer** | Control Plane UI, operator dashboard, and backend integrations |
| **Primary responsibility** | Monitoring read models, rack overview payloads, monitoring state reads, and manual polling for debugging / validation |

### Request / correlation IDs

The service preserves request tracing in the response envelope:

- request header: `X-Request-Id`
- request header: `X-Correlation-Id`
- response meta: `requestId`, `correlationId`

If the headers are missing, the service still returns a `meta` object with `version` and `timestamp`.

---

## Transport And Response Rules

### Authentication

All documented endpoints require:

```http
Authorization: Bearer <accessToken>
```

The current controller layer applies:

- `JwtAuthGuard`
- `PermissionsGuard`

### Authorization

The rack monitoring endpoints currently require:

- `PERMISSION_CODES.DASHBOARD_READ`

### Success envelope

All documented endpoints return the standard envelope shape:

```json
{
  "data": {},
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id",
    "version": "v1",
    "timestamp": "2026-07-08T10:00:00.000Z"
  }
}
```

### Error envelope

Errors are wrapped by `ProblemDetailsExceptionFilter`:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Bad Request",
    "details": {
      "status": 400,
      "type": "about:blank",
      "instance": "/api/v1/monitoring/racks/poll",
      "reason": "Bad Request",
      "detail": "The request payload is invalid.",
      "invalidParams": [
        {
          "name": "payload",
          "reason": "changedSinceSummaryTs must be a valid ISO 8601 date string"
        }
      ]
    }
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id",
    "version": "v1",
    "timestamp": "2026-07-08T10:00:00.000Z"
  }
}
```

Observed error codes in current implementation:

- `BAD_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_SERVER_ERROR`

---

## Endpoints

### `GET /api/v1/monitoring/racks/overview`

Returns the operator-facing rack overview dashboard payload.

**Auth**

- required
- permission: `DASHBOARD_READ`

**Purpose**

This is the high-level overview view for operators. It combines:

- fleet summary counters
- top-risk rack cards
- rack list sort metadata
- UI filter metadata

**Response**

- `200 OK`
- body type: `MonitoringRackOverviewResponseDto`

Representative shape:

```json
{
  "data": {
    "generatedAt": "2026-07-08T10:00:00.000Z",
    "scope": "rack",
    "view": "operator_dashboard",
    "overview": {
      "counts": {
        "total": 48,
        "critical": 6,
        "warning": 11,
        "stale": 3,
        "signalLoss": 2,
        "rackLevelFailure": 4
      }
    },
    "riskCards": [
      {
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
          "staleNodes": 2
        },
        "metrics": {
          "totalNodes": 24,
          "badNodes": 13,
          "criticalNodes": 5,
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
          "delta1m": 1,
          "delta5m": 2,
          "lastChangeAgeSec": 42
        },
        "updatedAt": "2026-07-01T10:15:00+07:00",
        "location": {
          "site": "DC01",
          "room": "ROOM-A",
          "row": "ROW-03",
          "position": "POS-12"
        }
      }
    ],
    "rackList": {
      "sort": [
        "severity",
        "rackLevelFailure",
        "signalLoss",
        "badNodeRatio",
        "staleNodes",
        "updatedAt",
        "rackId"
      ]
    },
    "filters": {
      "severity": ["critical", "warning", "stale", "normal"],
      "onlyFailure": false,
      "onlySignalLoss": false
    }
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id",
    "version": "v1",
    "timestamp": "2026-07-08T10:00:00.000Z"
  }
}
```

---

### `GET /api/v1/monitoring/racks/state`

Returns the backend-owned monitoring state for racks, including Alertmanager synchronization metadata.

**Auth**

- required
- permission: `DASHBOARD_READ`

**Purpose**

This endpoint is the operational state view for the monitoring subsystem itself. It is not the same thing as the dashboard overview.

Use this endpoint when the UI or backend needs to know:

- current rack lifecycle status
- current alert sync status
- last observed timestamps
- current active / resolved monitoring lineage

**Response**

- `200 OK`
- body type: `MonitoringRackStateResponseDto`

Representative shape:

```json
{
  "data": {
    "generatedAt": "2026-07-08T10:00:00.000Z",
    "scope": "rack",
    "view": "monitoring_state",
    "items": [
      {
        "rackId": "rack-a1",
        "rackName": "Rack A1",
        "rackCode": "RACK-A1",
        "operational": {
          "severityCode": 3,
          "overrideFlag": true,
          "lifecycleStatus": "active",
          "fingerprint": "rack:rack-a1|source:rack_current_summary|severity:3|override:1|culprit:node-17|metric:cpu_usage_pct",
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
    ]
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "request-id",
    "version": "v1",
    "timestamp": "2026-07-08T10:00:00.000Z"
  }
}
```

---

### `POST /api/v1/monitoring/racks/poll`

Manually triggers rack monitoring polling for debugging and real-data verification.

**Auth**

- required
- permission: `DASHBOARD_READ`

**Purpose**

This is a debug / operational endpoint. It exists so the team can:

- force a poll from Swagger/Postman
- validate real ClickHouse data end-to-end
- inspect how many rows were processed or skipped
- observe lifecycle transitions produced by the poll

**Request body**

Optional.

```json
{
  "changedSinceSummaryTs": "2026-07-08T16:05:00.000Z"
}
```

Field rules:

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| `changedSinceSummaryTs` | string | no | ISO 8601 date string | Omit it to force a full poll |

The current controller rejects unknown fields.

**Response**

- `200 OK`
- body type: `RackMonitoringPollResponseDto`

Representative shape:

```json
{
  "data": {
    "generatedAt": "2026-07-08T10:15:00.000Z",
    "scope": "rack",
    "view": "monitoring_poll",
    "changedSinceSummaryTs": null,
    "processedRows": 3,
    "skippedRows": 0,
    "transitionCount": 2,
    "transitionCounts": {
      "activate": 1,
      "resolve": 1,
      "repeatedActive": 0,
      "noop": 0
    },
    "affectedRackIds": ["rack-a1", "rack-b2"],
    "nextCheckpointSummaryTs": "2026-07-08T10:15:00.000Z"
  },
  "meta": {
    "requestId": "request-id",
    "correlationId": "correlation-id",
    "version": "v1",
    "timestamp": "2026-07-08T10:15:00.000Z"
  }
}
```

---

## Shared Models

### `ResponseMetaDto`

```ts
interface ResponseMetaDto {
  requestId?: string;
  correlationId?: string;
  version: 'v1';
  timestamp: string;
}
```

### `RackOverviewCountsDto`

```ts
interface RackOverviewCountsDto {
  total: number;
  critical: number;
  warning: number;
  stale: number;
  signalLoss: number;
  rackLevelFailure: number;
}
```

### `RackOverviewOverviewDto`

```ts
interface RackOverviewOverviewDto {
  counts: RackOverviewCountsDto;
}
```

### `RackOverviewRiskCardDto`

```ts
interface RackOverviewRiskCardDto {
  rack: {
    id: string;
    name: string;
    code: string;
  };
  status: {
    severity: 'normal' | 'warning' | 'critical';
    override: boolean;
    rackLevelFailure: boolean;
    signalLoss: boolean;
    staleNodes: number;
  };
  metrics: {
    totalNodes: number;
    badNodes: number;
    criticalNodes: number;
    warningNodes: number;
    badNodeRatio: number;
  };
  culprit: {
    nodeId: string;
    metric: {
      key: string;
      tags: Record<string, unknown>;
      value: {
        numeric: number;
        text: string;
      };
    };
  };
  trend: {
    delta1m: number;
    delta5m: number;
    lastChangeAgeSec: number | null;
  };
  updatedAt: string;
  location: {
    site?: string;
    room?: string;
    zone?: string;
    row?: string;
    position?: string;
  };
}
```

### `RackOverviewRackListDto`

```ts
interface RackOverviewRackListDto {
  sort: string[];
}
```

### `RackOverviewFiltersDto`

```ts
interface RackOverviewFiltersDto {
  severity: string[];
  onlyFailure: boolean;
  onlySignalLoss: boolean;
}
```

### `RackMonitoringOperationalStateDto`

```ts
interface RackMonitoringOperationalStateDto {
  severityCode: number;
  overrideFlag: boolean;
  lifecycleStatus: 'active' | 'resolved';
  fingerprint: string;
  firstObservedAt: string;
  lastObservedAt: string;
  lastStateChangedAt: string;
  openedAt: string | null;
  resolvedAt: string | null;
}
```

### `RackMonitoringNotificationStateDto`

```ts
interface RackMonitoringNotificationStateDto {
  syncStatus:
    | 'idle'
    | 'pending_open'
    | 'open_synced'
    | 'pending_resolve'
    | 'resolve_synced'
    | 'sync_failed';
  lastNotificationAttemptAt: string | null;
  lastNotificationSyncedAt: string | null;
}
```

### `RackMonitoringStateItemDto`

```ts
interface RackMonitoringStateItemDto {
  rackId: string;
  rackName: string;
  rackCode: string;
  operational: RackMonitoringOperationalStateDto;
  notification: RackMonitoringNotificationStateDto;
}
```

### `RackMonitoringPollTransitionCountsDto`

```ts
interface RackMonitoringPollTransitionCountsDto {
  activate: number;
  resolve: number;
  repeatedActive: number;
  noop: number;
}
```

### `RackMonitoringPollResponseDto`

```ts
interface RackMonitoringPollResponseDto {
  generatedAt: string;
  scope: 'rack';
  view: 'monitoring_poll';
  changedSinceSummaryTs: string | null;
  processedRows: number;
  skippedRows: number;
  transitionCount: number;
  transitionCounts: RackMonitoringPollTransitionCountsDto;
  affectedRackIds: string[];
  nextCheckpointSummaryTs: string | null;
}
```

### `RackMonitoringPollRequestDto`

```ts
interface RackMonitoringPollRequestDto {
  changedSinceSummaryTs?: string;
}
```

---

## Enums

### `RackMonitoringNotificationSyncStatus`

| Value | Meaning |
| --- | --- |
| `idle` | No notification flow is currently in progress |
| `pending_open` | Active monitoring state exists but has not yet been synced outward |
| `open_synced` | Active monitoring state has been synced to Alertmanager |
| `pending_resolve` | Resolve flow exists but has not yet been synced outward |
| `resolve_synced` | Resolve flow has been synced to Alertmanager |
| `sync_failed` | Outbound synchronization failed |

### `RackMonitoringTransitionKind`

Used by poll result internals and the realtime flow:

| Value | Meaning |
| --- | --- |
| `activate` | A new meaningful monitoring condition has been created |
| `resolve` | A previous condition has been resolved |
| `repeated_active` | Poll observed the same active posture again |
| `noop` | No meaningful transition |

---

## Pagination, Filtering & Sorting

- Pagination is not implemented on the documented rack monitoring endpoints.
- `GET /monitoring/racks/overview` returns a complete overview payload.
- `GET /monitoring/racks/state` returns the current rack monitoring state collection.
- `POST /monitoring/racks/poll` does not support query filters.
- Request-body filtering is limited to the optional `changedSinceSummaryTs` checkpoint.

---

## File Upload

Not implemented.

---

## Business Notes

- `GET /monitoring/racks/overview` is the operator-facing dashboard view.
- `GET /monitoring/racks/state` is the backend-owned monitoring state view, including synchronization metadata for Alertmanager.
- `POST /monitoring/racks/poll` is intentionally exposed for manual validation and debugging.
- The service returns a uniform `data/meta` envelope for success responses.
- Current poll DTO validation is strict: unknown request properties are rejected.
- The current implementation treats `changedSinceSummaryTs` as optional. Omitting it forces a full poll.
- The current scheduler behavior is internal and not part of the public HTTP contract.

---

## Coverage Report

| Metric | Value |
| --- | --- |
| Controllers analyzed | 2 public monitoring controllers |
| Public endpoints documented | 3 |
| Shared DTO groups documented | 9 |
| Enums documented | 2 |
| Error codes documented | 6 |
| Health endpoints included | No |

### Public endpoints included

- `GET /api/v1/monitoring/racks/overview`
- `GET /api/v1/monitoring/racks/state`
- `POST /api/v1/monitoring/racks/poll`

### Public endpoints intentionally excluded

- `GET /api/v1/health`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
