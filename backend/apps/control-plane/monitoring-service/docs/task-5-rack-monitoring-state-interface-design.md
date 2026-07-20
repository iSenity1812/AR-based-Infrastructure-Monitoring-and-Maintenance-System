# Interface Design: Task 5 Rack Monitoring State External-Read Contract

## Objective
Define the API and internal composition contracts for `GET /monitoring/racks/state` after it is migrated from local polling truth to the external-alert-backed `AlertCurrentState` read model.

This document focuses on interface shapes, response evolution, and aggregation contracts.

## Locked Decisions
The following design decisions are considered settled for Task 5 phase 1:

1. Compose rack state only from `scopeType = rack` active alerts.
2. Preserve `view = "monitoring_state"` for compatibility.
3. Keep existing `operational` and `notification` fields at top-level during the first migration phase.
4. Add new consumer-first fields alongside the old ones instead of moving old fields into a `legacy` block immediately.

## Design Goals
- consumer-first for dashboard usage
- additive and backward-compatible
- explicit and self-descriptive
- deterministic when multiple rack alerts exist
- stable enough that frontend can migrate incrementally

## Public API In Scope
### Endpoint
```http
GET /monitoring/racks/state
```

### Auth
No auth change in Task 5.

Expected behavior:
- same route
- same permission model
- same response envelope
- new response fields added inside `data.items[]`

## Current Response Contract
Current item contract is effectively:

```ts
interface RackMonitoringStateItemDto {
  rackId: string;
  rackName: string;
  rackCode: string;
  operational: RackMonitoringOperationalStateDto;
  notification: RackMonitoringNotificationStateDto;
}
```

This remains valid in Task 5 phase 1.

## Proposed Additive Response Contract
### Top-level response
Task 5 should preserve envelope and top-level shape:

```ts
interface MonitoringRackStateResponseDto {
  generatedAt: string;
  scope: 'rack';
  view: 'monitoring_state';
  items: RackMonitoringStateItemDto[];
}
```

Reason:
- `scope` and `view` are observable contract markers
- preserving them reduces accidental consumer breakage

## Rack Item Evolution
### Full phase-1 item contract
```ts
interface RackMonitoringStateItemDto {
  rackId: string;
  rackName: string;
  rackCode: string;

  // Existing compatibility fields
  operational: RackMonitoringOperationalStateDto;
  notification: RackMonitoringNotificationStateDto;

  // New consumer-first fields
  state: RackAlertStateDto;
  alertSummary: RackAlertSummaryDto;
  primaryAlert: RackPrimaryAlertDto | null;
  activeAlerts: RackActiveAlertDto[];
}
```

This is the main API design choice for Task 5.

## New Consumer-First DTOs
### 1. Rack alert state block
```ts
interface RackAlertStateDto {
  status: 'healthy' | 'alerting';
  highestSeverity: 'none' | 'warning' | 'critical';
  activeAlertCount: number;
  lastChangedAt: string | null;
}
```

Purpose:
- immediate rack-level operator answer
- no need for consumer to interpret local lifecycle flags

### 2. Rack alert summary block
```ts
interface RackAlertSummaryDto {
  critical: number;
  warning: number;
}
```

Phase-1 scope:
- counts only active rack-scoped alerts
- no child node/workload roll-up yet

### 3. Primary alert block
```ts
interface RackPrimaryAlertDto {
  fingerprint: string;
  alertName: string;
  severity: 'warning' | 'critical';
  category:
    | 'availability'
    | 'resource'
    | 'thermal'
    | 'runtime'
    | 'network'
    | 'connectivity';
  status: 'firing' | 'resolved';
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  dashboardUrl: string | null;
  runbookUrl: string | null;
}
```

Purpose:
- one immediately renderable alert card per rack
- deterministic summary object for tables, cards, and badges

### 4. Active alert list block
```ts
interface RackActiveAlertDto {
  fingerprint: string;
  alertName: string;
  severity: 'warning' | 'critical';
  category:
    | 'availability'
    | 'resource'
    | 'thermal'
    | 'runtime'
    | 'network'
    | 'connectivity';
  status: 'firing' | 'resolved';
  summary: string;
  startsAt: string;
}
```

Purpose:
- lightweight drill-down list
- enough for list rendering without overloading the rack-state endpoint

## Compatibility Fields
### Existing `operational`
Task 5 phase 1 keeps:

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

Compatibility meaning in Task 5:
- these are transitional fields
- they may be mapped from new external alert aggregation rather than local polling truth
- they should not drive new frontend behavior if consumer-first fields are available

### Existing `notification`
Task 5 phase 1 keeps:

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

Compatibility meaning in Task 5:
- remains present for old consumers
- becomes less important once alert truth is externally sourced
- should not be expanded further unless a consumer still explicitly needs it

## Internal Aggregation Contract
Task 5 needs an internal composition interface between repository reads and DTO mapping.

### Aggregation input
```ts
interface RackAlertAggregationInput {
  rackId: string;
  alerts: AlertCurrentState[];
}
```

Constraint:
- `alerts` must already be filtered to active rack-scoped alerts for that rack

### Aggregation output
```ts
interface RackAlertAggregationResult {
  state: RackAlertStateDto;
  alertSummary: RackAlertSummaryDto;
  primaryAlert: RackPrimaryAlertDto | null;
  activeAlerts: RackActiveAlertDto[];
}
```

Purpose:
- clean separation between read-model querying and HTTP DTO mapping
- makes testing deterministic and focused

## Repository Contract Gaps
Current repository capability:

```ts
listActiveByRackId(rackId: string): Promise<AlertCurrentState[]>
```

This is sufficient for per-rack lookup, but may be awkward for building the whole rack state list efficiently.

Recommended phase-1 contract extension:
```ts
abstract listByScopeTypeAndStatus(
  scopeType: 'rack',
  status: 'firing' | 'resolved',
): Promise<AlertCurrentState[]>;
```

or a narrower convenience:

```ts
abstract listActiveRackAlerts(): Promise<AlertCurrentState[]>;
```

Reason:
- Task 5 `GET /monitoring/racks/state` likely needs all rack alerts in one query
- repeated `listActiveByRackId` calls would be N+1 shaped

## Aggregation Rules
### Source filtering
Phase-1 Task 5 should:
- include only `status = firing`
- include only `scopeType = rack`

### Highest severity
Rules:
- any `critical` alert => `highestSeverity = critical`
- else any `warning` alert => `highestSeverity = warning`
- else `none`

### Status
Rules:
- zero active alerts => `healthy`
- one or more active alerts => `alerting`

### Count summary
Rules:
- `critical` = number of active critical rack alerts
- `warning` = number of active warning rack alerts

### Primary alert selection
Ordering precedence:
1. severity descending
2. `lastStatusChangedAt` descending
3. `startsAt` descending
4. `alertName` ascending

## Mapping To Compatibility Fields
Task 5 must define deterministic mapping from new external semantics to old compatibility fields.

### Proposed compatibility mapping
```ts
severityCode:
  critical -> 3
  warning -> 2
  none -> 0

lifecycleStatus:
  alerting -> 'active'
  healthy -> 'resolved'
```

Notes:
- this is compatibility mapping, not native truth
- document this explicitly so future maintainers do not mistake it for domain truth

### Compatibility timestamps
Recommended mapping:
- `lastStateChangedAt` <- `state.lastChangedAt`
- `openedAt` <- `primaryAlert.startsAt` when alerting
- `resolvedAt` <- `null` in phase 1 because the endpoint is focused on active state composition

This area is lossy by nature; new fields are the real source of meaning.

## Example Phase-1 Response
```json
{
  "data": {
    "generatedAt": "2026-07-15T15:00:00.000Z",
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
          "fingerprint": "56b08c98fd42c43a",
          "firstObservedAt": "2026-07-15T14:20:00.000Z",
          "lastObservedAt": "2026-07-15T14:28:00.000Z",
          "lastStateChangedAt": "2026-07-15T14:20:00.000Z",
          "openedAt": "2026-07-15T14:20:00.000Z",
          "resolvedAt": null
        },
        "notification": {
          "syncStatus": "open_synced",
          "lastNotificationAttemptAt": null,
          "lastNotificationSyncedAt": null
        },
        "state": {
          "status": "alerting",
          "highestSeverity": "critical",
          "activeAlertCount": 2,
          "lastChangedAt": "2026-07-15T14:20:00.000Z"
        },
        "alertSummary": {
          "critical": 1,
          "warning": 1
        },
        "primaryAlert": {
          "fingerprint": "56b08c98fd42c43a",
          "alertName": "RackSignalLossPresent",
          "severity": "critical",
          "category": "connectivity",
          "status": "firing",
          "summary": "Rack A1 signal loss with 1 silent node(s)",
          "description": "Rack A1 is reporting signal loss.",
          "startsAt": "2026-07-15T14:20:00.000Z",
          "endsAt": null,
          "dashboardUrl": "/d/monitoring-overview",
          "runbookUrl": "/docs/runbooks/alerting/rack-signal-loss-present"
        },
        "activeAlerts": [
          {
            "fingerprint": "56b08c98fd42c43a",
            "alertName": "RackSignalLossPresent",
            "severity": "critical",
            "category": "connectivity",
            "status": "firing",
            "summary": "Rack A1 signal loss with 1 silent node(s)",
            "startsAt": "2026-07-15T14:20:00.000Z"
          }
        ]
      }
    ]
  },
  "meta": {
    "requestId": "req-1",
    "correlationId": "corr-1",
    "version": "v1",
    "timestamp": "2026-07-15T15:00:00.000Z"
  }
}
```

## DTO File Direction
Recommended evolution strategy:
- update `rack-monitoring-state-response.dto.ts` in place for additive fields
- do not create a second competing response DTO file unless we are intentionally versioning

Reason:
- one-version rule
- keeps implementation and Swagger easier to reason about

## Validation Boundary
There is no new request input for Task 5 `GET /monitoring/racks/state`, so validation focus is:
- repository output trust
- defensive handling of missing optional alert annotation fields
- deterministic sort and aggregation logic

## Recommended Decisions
- Preserve route, auth, envelope, and `view` string
- Keep `operational` and `notification` top-level in phase 1
- Add `state`, `alertSummary`, `primaryAlert`, and `activeAlerts`
- Aggregate only rack-scoped active alerts in phase 1
- Add a repository method that can fetch active rack alerts in bulk

## Remaining Implementation Notes
- `activeAlerts` can remain uncapped in phase 1 because rack-scoped alert volume is expected to be small; if payload growth becomes visible, add a cap in a later task without changing `activeAlertCount`.
- `notification` should stay present for compatibility, but phase-1 consumers should treat it as transitional rather than authoritative.
- `overrideFlag` should be treated as a legacy compatibility field in Task 5, not as a new source of meaning for frontend logic.
