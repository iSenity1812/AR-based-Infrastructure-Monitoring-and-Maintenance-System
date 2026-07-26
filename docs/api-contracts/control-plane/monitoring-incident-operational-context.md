# Monitoring Incident Operational Context API Contract

## Purpose

This document defines the current two-API screen contract for the operational
context incident detail experience.

The screen composes data from:

- `incident-workflow-service` for persisted Incident detail and previous Incidents
- `monitoring-service` for current monitoring context and factual timeline

Current contract scope:

- `GET /api/v1/incidents/:id`
- `GET /api/v1/monitoring/scopes/:scopeType/:scopeId/investigation`

## 1. Incident Detail

### `GET /api/v1/incidents/:id`

Returns the persisted Incident plus lightweight previous Incidents for the same
scope.

#### Authorization

- Bearer authentication is required
- the caller must have permission `INCIDENTS_READ`

#### Path Parameters

- `id` - string, required, Incident identifier

#### Success Response `200`

```json
{
  "data": {
    "id": "6a61840f39ef5be41a0b9c27",
    "incidentCode": "MON-ALERT-EFA67617732ABE0203ADA182175EB6F1",
    "title": "Rack Critical",
    "description": "Rack severity code is 3",
    "severity": "CRITICAL",
    "status": "OPEN",
    "ticketIds": [],
    "createdBy": {
      "userId": "6a577236e306cfc2b4931bb6",
      "username": "admin01",
      "fullName": "admin01",
      "source": "monitoring_alert_handoff"
    },
    "metadata": {
      "source": "monitoring_alert",
      "scopeType": "rack",
      "rackId": "6a5792c1ea8de69105cf48dd"
    },
    "capturedSnapshot": {
      "schemaVersion": "incident.context.v1",
      "capturedAt": "2026-07-22T14:45:59.795Z",
      "window": {
        "from": "2026-07-22T14:15:59.795Z",
        "to": "2026-07-22T14:45:59.795Z",
        "interval": "1m"
      },
      "completeness": "complete",
      "unavailableSources": [],
      "alert": {},
      "scope": {
        "scopeType": "rack",
        "scopeId": "6a5792c1ea8de69105cf48dd"
      },
      "metricEvidence": [],
      "sourceRefs": []
    },
    "relatedIncidents": [
      {
        "id": "6a61840c39ef5be41a0b9c23",
        "incidentCode": "MON-ALERT-CC96AC336B5A0307",
        "title": "Rack Signal Loss",
        "severity": "CRITICAL",
        "status": "OPEN",
        "createdAt": "2026-07-22T03:01:32.000Z",
        "updatedAt": "2026-07-22T03:01:32.000Z"
      }
    ],
    "createdAt": "2026-07-22T14:45:59.918Z",
    "updatedAt": "2026-07-22T14:45:59.918Z"
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-07-24T10:00:00.000Z"
  }
}
```

#### Response Semantics

- `capturedSnapshot` is immutable incident creation evidence.
- `relatedIncidents` excludes the current Incident.
- `relatedIncidents` is sorted newest-first by `createdAt`.
- `relatedIncidents` currently uses scope derived from:
  - `capturedSnapshot.scope.scopeType + capturedSnapshot.scope.scopeId`
  - fallback metadata for legacy alert incidents:
    - node: `metadata.scopeType=node` + `metadata.nodeId`
    - rack: `metadata.scopeType=rack` + `metadata.rackId`

#### Empty-State Behavior

- if the Incident has no derivable scope, `relatedIncidents` is `[]`
- if no previous Incidents exist for the scope, `relatedIncidents` is `[]`

## 2. Monitoring Investigation

### `GET /api/v1/monitoring/scopes/:scopeType/:scopeId/investigation`

Returns current monitoring context, metric series, and factual monitoring
timeline for the selected scope and time window.

#### Authorization

- Bearer authentication is required
- the caller must have permission `DASHBOARD_READ`

#### Path Parameters

- `scopeType` - `node` or `rack`
- `scopeId` - monitoring scope identifier

#### Query Parameters

- `from` - ISO-8601 string, required for explicit investigation
- `to` - ISO-8601 string, required for explicit investigation
- `interval` - `1m` or `5m`
- `metricKey` - optional for node investigations

#### Success Response Shape Notes

- `scope` identifies the current screen scope
- `currentContext` is current monitoring truth, separate from Incident captured truth
- `metricSeries` is the chart payload for the selected investigation window
- `monitoringTimeline` contains factual monitoring transitions only

Current timeline event types:

- `alert.fired`
- `alert.resolved`
- `node.online`
- `node.stale`

## 3. Frontend Composition Flow

The current screen is a two-call composition:

1. Call `GET /api/v1/incidents/:id`
2. Read `capturedSnapshot.scope.scopeType` and `capturedSnapshot.scope.scopeId`
3. Use the selected investigation window to call:
   `GET /api/v1/monitoring/scopes/:scopeType/:scopeId/investigation?...`
4. Render:
   - captured context from Incident
   - current context from Monitoring
   - factual monitoring timeline from Monitoring
   - previous Incidents from Incident Workflow

## 4. Manual E2E Scenarios

### Scenario A: Node Incident

1. Open one real node Incident id.
2. Call `GET /api/v1/incidents/:id`.
3. Expect:
   - `capturedSnapshot.scope.scopeType = "node"`
   - `capturedSnapshot.scope.scopeId = "<nodeId>"`
   - `relatedIncidents` excludes current `id`
4. Call `GET /api/v1/monitoring/scopes/node/:nodeId/investigation`.
5. Expect:
   - `monitoringTimeline` ordered by `occurredAt`
   - only node events in the selected range

### Scenario B: Rack Incident

1. Open one real rack Incident id.
2. Call `GET /api/v1/incidents/:id`.
3. Expect:
   - `capturedSnapshot.scope.scopeType = "rack"`
   - `capturedSnapshot.scope.scopeId = "<rackId>"`
   - `relatedIncidents` contains older rack Incidents when present
4. Call `GET /api/v1/monitoring/scopes/rack/:rackId/investigation`.
5. Expect:
   - `monitoringTimeline` contains factual rack alert transitions in range
   - `metricSeries` remains rack-specific and granularity-safe

## Notes

- This contract reflects the current implementation after checkpoint 5.
- Targeted Jest execution is currently blocked in this workspace by the known
  `jest-runtime` harness error `this._moduleMocker.clearMocksOnScope is not a function`.
