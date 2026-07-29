# Rack Investigation Overview API Contract

Frontend-facing contract for `GET /monitoring/racks/:rackId/overview`.

Source of truth:

- Controller: `backend/apps/control-plane/monitoring-service/src/presentation/http/controllers/rack-overview.controller.ts`
- Response DTOs: `backend/apps/control-plane/monitoring-service/src/presentation/http/dto/rack-investigation-overview-response.dto.ts`
- Shared rack DTOs: `backend/apps/control-plane/monitoring-service/src/presentation/http/dto/rack-overview-response.dto.ts`
- Use case: `backend/apps/control-plane/monitoring-service/src/application/use-cases/get-rack-investigation-overview.use-case.ts`

## Endpoint

- Method: `GET`
- URL: `/monitoring/racks/:rackId/overview`
- Purpose: Returns investigation summary data for one rack.

## Auth

- Requires `Authorization: Bearer <token>`
- Requires permission: `dashboard.read`

## Path Params

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `rackId` | `string` | yes | Stable rack identifier in monitoring scope |

## Query Params

None.

## Success Response

Status: `200 OK`

```ts
interface ResponseEnvelope<T> {
  data: T;
  meta: {
    requestId?: string;
    correlationId?: string;
    version: 'v1';
    timestamp: string;
  };
}

type RackSeverity = 'healthy' | 'stale' | 'warning' | 'high' | 'critical';
type RackStatus = 'healthy' | 'alerting' | 'unknown';

type RackAlertSeverity = 'warning' | 'critical';
type RackAlertScope = 'node' | 'rack' | 'workload' | 'service';
type RackAlertCategory =
  | 'availability'
  | 'resource'
  | 'thermal'
  | 'runtime'
  | 'network'
  | 'connectivity';
type RackAlertStatus = 'firing' | 'resolved';
type RackAlertTriageStatus =
  | 'new'
  | 'acknowledged'
  | 'incident_created'
  | 'suppressed';

interface RackInvestigationOverviewResponse {
  generatedAt: string;
  scope: 'rack';
  view: 'rack_investigation_overview';
  rack: {
    rackInfo: {
      id: string;
      rackCode: string;
      displayName: string;
      lifecycleState: string | null;
      capacityState: string | null;
      siteCode: string | null;
      roomCode: string | null;
      rowCode: string | null;
      positionCode: string | null;
      capacityLimit: number | null;
      notes: string | null;
      vendor: string | null;
      metadata: Record<string, unknown>;
      updatedAt: string;
    };
    healthStatus: {
      severityCode: number;
      severityText: 'HEALTHY' | 'STALE' | 'WARNING' | 'HIGH' | 'CRITICAL';
      isRackLevelFailure: boolean;
      hasSignalLoss: boolean;
      hasOverrideFlag: boolean;
    };
    blastRadius: {
      totalNodes: number;
      badNodes: number;
      criticalNodes: number;
      warningNodes: number;
      staleNodes: number;
      silentDeadNodes: number;
      badNodeRatio: number;
    };
    aggregateMetrics: {
      avgCpuUsagePct: number | null;
      avgMemoryUsedPct: number | null;
      maxDiskUsedPct: number | null;
      maxCpuTemperatureC: number | null;
      sumNetworkRxBytesSec: number | null;
      sumNetworkTxBytesSec: number | null;
    };
    culprit: {
      worstNodeId: string;
      worstMetricKey: string;
      worstMetricTags: Record<string, unknown>;
      worstMetricValueNumeric: number | null;
      worstMetricValueText: string | null;
    };
    trend: {
      delta1m: number;
      delta5m: number;
      lastChangeAgeSec: number | null;
    };
  };
  alerts: {
    summary: {
      rackAlertCount: number;
      childAlertCount: number;
      criticalCount: number;
      warningCount: number;
    };
    rack: RackInvestigationAlert[];
    child: RackInvestigationAlert[];
  };
  nodeSnapshot: {
    totalNodes: number;
    returned: number;
    selectionMode: 'problem_first_then_recent';
    items: RackNodeSnapshotItem[];
  };
  navigation: {
    nodesUrl: string;
  };
}

interface RackInvestigationAlert {
  fingerprint: string;
  alertName: string;
  scopeType: RackAlertScope;
  nodeId: string | null;
  workloadId: string | null;
  severity: RackAlertSeverity;
  category: RackAlertCategory;
  status: RackAlertStatus;
  summary: string;
  description: string;
  metricKey: string | null;
  currentValue: string | null;
  threshold: string | null;
  startsAt: string;
  endsAt: string | null;
  dashboardUrl: string | null;
  runbookUrl: string | null;
  triageStatus: RackAlertTriageStatus;
  incident: {
    incidentId: string;
    incidentCode: string;
    status: string;
    severity: 'HIGH' | 'CRITICAL';
    title: string;
    createdAt: string;
    linkedAt: string | null;
  } | null;
}

interface RackNodeSnapshotItem {
  nodeId: string;
  status: RackStatus;
  severity: RackSeverity;
  lastSeenAt: string;
  freshnessSec: number;
  collectorStatus: 'UNKNOWN';
  alertCounters: {
    criticalMetricCount: number;
    warningMetricCount: number;
    staleMetricCount: number;
  };
  currentMetrics: {
    cpuUsagePct: number | null;
    memoryUsedPct: number | null;
    diskUsedPct: number | null;
    cpuTemperatureC: number | null;
  };
  worstMetric: {
    metricKey: string | null;
    metricValueNumeric: number | null;
    metricValueText: string | null;
  };
}
```

## Example Response

```json
{
  "data": {
    "generatedAt": "2026-07-19T11:02:54.220Z",
    "scope": "rack",
    "view": "rack_investigation_overview",
    "rack": {
      "rackInfo": {
        "id": "rack-a1",
        "rackCode": "LOCAL-LAB-01",
        "displayName": "Local Lab 01",
        "lifecycleState": "ACTIVE",
        "capacityState": "AVAILABLE",
        "siteCode": "MY-HOME",
        "roomCode": "ROOM-01",
        "rowCode": "ROW-1",
        "positionCode": "P-1",
        "capacityLimit": 42,
        "notes": null,
        "vendor": "DELL",
        "metadata": {},
        "updatedAt": "2026-07-16T11:35:59.000Z"
      },
      "healthStatus": {
        "severityCode": 4,
        "severityText": "CRITICAL",
        "isRackLevelFailure": false,
        "hasSignalLoss": true,
        "hasOverrideFlag": true
      },
      "blastRadius": {
        "totalNodes": 12,
        "badNodes": 3,
        "criticalNodes": 1,
        "warningNodes": 1,
        "staleNodes": 1,
        "silentDeadNodes": 1,
        "badNodeRatio": 0.25
      },
      "aggregateMetrics": {
        "avgCpuUsagePct": 73.4,
        "avgMemoryUsedPct": 68.2,
        "maxDiskUsedPct": 91.8,
        "maxCpuTemperatureC": 84.1,
        "sumNetworkRxBytesSec": 1200000,
        "sumNetworkTxBytesSec": 980000
      },
      "culprit": {
        "worstNodeId": "node-critical",
        "worstMetricKey": "cpu_usage_pct",
        "worstMetricTags": {},
        "worstMetricValueNumeric": 98,
        "worstMetricValueText": "98"
      },
      "trend": {
        "delta1m": 0,
        "delta5m": 2,
        "lastChangeAgeSec": 120
      }
    },
    "alerts": {
      "summary": {
        "rackAlertCount": 1,
        "childAlertCount": 2,
        "criticalCount": 1,
        "warningCount": 2
      },
      "rack": [
        {
          "fingerprint": "rack-a1:signal-loss",
          "alertName": "RackSignalLoss",
          "scopeType": "rack",
          "nodeId": null,
          "workloadId": null,
          "severity": "critical",
          "category": "connectivity",
          "status": "firing",
          "summary": "Rack is disconnected",
          "description": "No heartbeat was received for the rack.",
          "metricKey": "rack.heartbeat.loss",
          "currentValue": "0",
          "threshold": "1",
          "startsAt": "2026-07-19T11:30:00.000Z",
          "endsAt": null,
          "dashboardUrl": "/d/monitoring-overview",
          "runbookUrl": null,
          "triageStatus": "incident_created",
          "incident": {
            "incidentId": "incident-01",
            "incidentCode": "INC-0001",
            "status": "OPEN",
            "severity": "CRITICAL",
            "title": "Rack signal loss",
            "createdAt": "2026-07-19T11:35:00.000Z",
            "linkedAt": "2026-07-19T11:36:00.000Z"
          }
        }
      ],
      "child": []
    },
    "nodeSnapshot": {
      "totalNodes": 12,
      "returned": 2,
      "selectionMode": "problem_first_then_recent",
      "items": [
        {
          "nodeId": "node-critical",
          "status": "alerting",
          "severity": "critical",
          "lastSeenAt": "2026-07-19T11:35:59.000Z",
          "freshnessSec": 12,
          "collectorStatus": "UNKNOWN",
          "alertCounters": {
            "criticalMetricCount": 1,
            "warningMetricCount": 0,
            "staleMetricCount": 0
          },
          "currentMetrics": {
            "cpuUsagePct": 91.2,
            "memoryUsedPct": 77.4,
            "diskUsedPct": 61.8,
            "cpuTemperatureC": 86.1
          },
          "worstMetric": {
            "metricKey": "cpu_usage_pct",
            "metricValueNumeric": 98.4,
            "metricValueText": "98.4"
          }
        }
      ]
    },
    "navigation": {
      "nodesUrl": "/monitoring/racks/rack-a1/nodes"
    }
  },
  "meta": {
    "requestId": "4e1d35b3-8d5d-4a42-8e35-3c6f4a2cb8f7",
    "correlationId": "4e1d35b3-8d5d-4a42-8e35-3c6f4a2cb8f7",
    "version": "v1",
    "timestamp": "2026-07-19T11:02:54.220Z"
  }
}
```

## Error Responses

### `401 Unauthorized`

- Missing or invalid bearer token

### `403 Forbidden`

- Authenticated user does not have `dashboard.read`

### `404 Not Found`

- Returned when the service has no current monitoring summary for `rackId`

Example shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Not Found",
    "details": {
      "status": 404,
      "type": "about:blank",
      "instance": "/monitoring/racks/rack-missing/overview",
      "reason": "Not Found",
      "detail": "Rack overview snapshot not found for rackId=rack-missing"
    }
  },
  "meta": {
    "requestId": "4e1d35b3-8d5d-4a42-8e35-3c6f4a2cb8f7",
    "correlationId": "4e1d35b3-8d5d-4a42-8e35-3c6f4a2cb8f7",
    "version": "v1",
    "timestamp": "2026-07-19T11:02:54.220Z"
  }
}
```

## Frontend Notes

- `nodeSnapshot.items` is not the full node list. It is a capped investigation snapshot selected as `problem_first_then_recent`.
- Use `nodeSnapshot.totalNodes` to show the real rack size.
- Use `navigation.nodesUrl` when the user wants the full rack node list screen.
- `alerts.rack` contains rack-scoped alerts only.
- `alerts.child` contains node/workload alerts inside the rack.
