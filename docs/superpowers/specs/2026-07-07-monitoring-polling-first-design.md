# Spec: Monitoring Polling-First Architecture

## Assumptions I'm Making

1. The current phase targets `monitoring + alerting architecture design`, not immediate implementation.
2. `ClickHouse serving views` are the primary operational read models for monitoring decisions.
3. The first production phase should be `polling-first`, not full `event-driven` or `hybrid`.
4. `Alertmanager` is the `notification lifecycle engine`, not the primary operational truth store.
5. The dashboard should follow `option 3`: show both internal monitoring state and Alertmanager notification state.
6. Scope priority for phase 1 is `rack`, `service`, `node`, then `container`.
7. Frontend realtime delivery uses backend-composed payloads over `Socket.IO`, not direct reads from ClickHouse or Alertmanager.

If any of these are wrong, the spec should be revised before implementation planning.

## Objective

Design the phase-1 monitoring architecture for the platform so that operators can:

- know the current operational health of racks, services, nodes, and containers
- understand why an entity is degraded or critical
- receive alert notifications through Alertmanager without making Alertmanager the primary monitoring truth
- view a consistent dashboard model that separates:
  - `operational state`
  - `notification state`

The target user is the `Operator` running the monitoring dashboard and triaging infrastructure/runtime issues.

Success means:

- the team has a clear monitoring architecture boundary
- polling workers know which ClickHouse views to query
- alerting rules know which layer to evaluate
- frontend/backend contracts can be designed against a stable monitoring model

## Tech Stack

- `ClickHouse` for telemetry serving views and history
- `NestJS` control plane / monitoring API / Socket.IO gateway
- `Polling worker` in application layer (`NestJS cron` or separate worker service)
- `Alertmanager (Prometheus Alertmanager)` for firing/resolved/silence/routing lifecycle
- `Socket.IO` for realtime UI delta push
- Existing semantic policy source:
  - `telemetry_db.metric_profile`
  - `telemetry_db.dict_metric_profile`

## Commands

These are the repository-relevant commands known today. They are mostly documentation/reference commands because this spec is architecture-first.

```powershell
# Review ClickHouse module order
Get-Content -Raw backend/apps/clickhouse-init/init.manifest

# Review all ClickHouse serving definitions
Get-ChildItem backend/apps/clickhouse-init -Recurse -File

# Search serving objects and schema definitions
rg -n "CREATE (TABLE|VIEW|MATERIALIZED VIEW)|DROP (TABLE|VIEW) IF EXISTS" backend/apps/clickhouse-init

# Review telemetry serving contract
Get-Content -Raw docs/telemetry_node_serving_model.md

# Review data pipeline architecture
Get-Content -Raw docs/data_pipeline_architecture.md
```

## Project Structure

This spec assumes the monitoring implementation will live inside the existing control-plane microservice boundary:

```text
backend/apps/clickhouse-init/                         -> ClickHouse schema, serving views, history tables
backend/apps/control-plane/monitoring-service/src/    -> Monitoring microservice source code
backend/apps/control-plane/monitoring-service/src/application/     -> Use cases, polling orchestration, rule evaluation
backend/apps/control-plane/monitoring-service/src/domain/           -> Monitoring state, rule models, state transitions
backend/apps/control-plane/monitoring-service/src/infrastructure/   -> ClickHouse client, Alertmanager client, persistence adapters
backend/apps/control-plane/monitoring-service/src/presentation/    -> HTTP endpoints, Socket.IO gateway, DTOs
backend/apps/control-plane/monitoring-service/src/adapters/        -> Boundary adapters and anti-corruption layer
docs/                                                -> Architecture and serving model source-of-truth docs
docs/superpowers/specs/                              -> Specs for planned features and architectural decisions
```

## Code Style

This architecture should preserve the existing style already established in `clickhouse-init` and the broader repo:

- serving logic is explicit, layered, and scope-oriented
- the monitoring microservice follows clean architecture boundaries:
  - `presentation` for transport
  - `application` for orchestration
  - `domain` for business rules
  - `infrastructure` for external systems
  - `adapters` for translation between boundaries
- avoid hidden semantics in application code when the database layer already computes them
- prefer readable, named contracts over generic payload blobs
- separate `operational state` from `notification state`

Example contract style for backend DTOs or internal projections:

```ts
type MonitoringEntityState = {
  scopeType: 'rack' | 'service' | 'node' | 'container';
  scopeId: string;
  severityCode: 0 | 1 | 2 | 3 | 4;
  summaryTs: string;
  culpritMetricKey: string | null;
  culpritEntityId: string | null;
  hasOverrideFlag: boolean;
};
```

Key conventions:

- use `summary-first` contracts for alert evaluation
- use `live/detail` contracts only for drill-down and explanation
- keep naming aligned with ClickHouse serving outputs wherever possible

## Testing Strategy

Phase 1 testing should focus on semantic correctness and operational behavior, not only unit tests.

### Test levels

- `Spec validation`
  - verify boundaries and source-of-truth choices are internally consistent
- `SQL smoke validation`
  - confirm the selected monitoring source views exist and return the expected grain
- `Rule evaluation tests`
  - given summary rows, ensure rule engine produces the correct monitoring state transitions
- `Alert bridge tests`
  - ensure firing/resolved payloads sent to Alertmanager are idempotent and correctly mapped
- `Realtime delivery tests`
  - ensure Socket.IO pushes are emitted only on meaningful state changes

### Priority scenarios

- rack becomes critical because one child node is critical
- service becomes degraded because running containers drop below expected count
- entity remains degraded across multiple polling cycles
- entity returns to healthy and triggers resolve path
- dashboard shows critical operational state even when Alertmanager state is silenced
- dashboard distinguishes:
  - internal monitoring state
  - Alertmanager notification state

## Boundaries

- Always:
  - Use `ClickHouse serving views` as the monitoring read model source.
  - Evaluate phase-1 alert rules from `summary` views first.
  - Treat `Alertmanager` as notification lifecycle infrastructure, not monitoring truth.
  - Keep dashboard contracts explicit about `operational state` vs `notification state`.
  - Use `Socket.IO` only as a realtime delivery channel from backend-composed state.

- Ask first:
  - Adding new persistent state stores beyond the current planned backend/database boundaries
  - Moving rule semantics from ClickHouse into application-only logic
  - Switching from polling-first to hybrid/event-driven in phase 1
  - Letting frontend read Alertmanager directly or query ClickHouse directly

- Never:
  - Recompute the full scope roll-up semantics from raw telemetry in the monitoring worker
  - Make Alertmanager the only source for operator dashboard truth
  - Use raw telemetry tables as the primary polling source for monitoring state
  - Collapse operational state and notification state into one ambiguous dashboard status

## Monitoring Data Model

### 1. Operational state

This is the system's internal truth about infrastructure/runtime health.

Primary characteristics:

- derived from ClickHouse serving views
- operator-first
- optimized for health understanding, ranking, culprit explanation, and blast radius

Primary source views by scope:

- `telemetry_db.rack_current_summary`
- `telemetry_db.service_current_summary`
- `telemetry_db.node_current_summary`
- `telemetry_db.container_current_summary`

Usage:

- dashboard overview
- list and ranking views
- alert rule evaluation
- monitoring state persistence

### 2. Notification state

This is the delivery/lifecycle truth managed by Alertmanager.

Primary characteristics:

- firing/resolved
- grouped/inhibited/silenced
- routing and receiver outcome

Usage:

- alert panels
- operator on-call awareness
- notification audit and reconciliation

### 3. Detail/live state

This is the metric-level detail used after the operator has identified an unhealthy entity.

Primary source views:

- `telemetry_db.node_current_live`
- `telemetry_db.container_current_live`
- `telemetry_db.service_current_live`

Usage:

- explainability
- drill-down
- triage detail

### 4. Trend/history state

This is the longitudinal view used for RCA and later sustained-condition alert logic.

Primary source views:

- `telemetry_db.rack_summary_trend_1m`
- `telemetry_db.rack_summary_trend_5m`
- `telemetry_db.v_rack_summary_history`
- `telemetry_db.container_summary_trend_1m`
- `telemetry_db.container_summary_trend_5m`
- `telemetry_db.service_summary_trend_1m`
- `telemetry_db.service_summary_trend_5m`
- `telemetry_db.v_service_summary_history`
- `telemetry_db.v_agg_1m_by_scope_metric`
- `telemetry_db.v_agg_5m_by_scope_metric`

Usage:

- charts
- RCA
- later sustained/noise-control rules

## Proposed Phase-1 Architecture

### 1. Core decision

Phase 1 uses:

- `Polling-first`
- `Summary-first for alerting`
- `Summary + live for monitoring UX`

### 2. Polling worker responsibilities

The monitoring worker should:

- run on a fixed cadence, initially `10s-15s`
- query summary views for rows whose `summary_ts` is newer than the previous checkpoint
- evaluate rule conditions against those summary rows
- update internal monitoring state
- create alert bridge actions for Alertmanager when state transitions occur
- emit backend realtime events when monitoring state changes materially

### 3. Preferred scope priority

Phase 1 evaluation order:

1. `rack`
2. `service`
3. `node`
4. `container`

Reasoning:

- rack is the strongest operator prioritization layer
- service is the strongest workload impact layer
- node and container are more detailed diagnostic layers

### 4. Rule source strategy

Phase 1 rules should primarily consume:

- `rack_current_summary`
- `service_current_summary`
- `node_current_summary`
- `container_current_summary`

Live/detail views should only be used when:

- a summary row needs explanation
- a notification payload needs richer culprit context
- the UI opens a detail panel or drill-down screen

### 5. Monitoring state persistence

The backend should maintain an internal monitoring state read model with fields conceptually similar to:

- `rule_id`
- `scope_type`
- `scope_id`
- `current_monitoring_state`
- `severity_code`
- `first_seen_at`
- `last_seen_at`
- `last_evaluated_at`
- `summary_ts`
- `culprit_metric_key`
- `culprit_entity_id`
- `state_fingerprint`
- `alertmanager_sync_state`

Purpose:

- dedup repeated polling matches
- know when a state became active
- know when to send firing vs resolved
- support dashboard operational state even if Alertmanager is temporarily unavailable

### 6. Alertmanager bridge behavior

Alertmanager integration should:

- receive only deduplicated state transitions from the monitoring engine
- map monitoring state to alert labels/annotations
- send `firing` when an entity enters an actionable alert state
- send `resolved` when the entity returns healthy or exits the alert condition

It should not:

- be treated as the sole source for dashboard health truth
- replace internal monitoring state storage

### 7. Frontend contract strategy

Dashboard behavior should be:
- initial state via backend API snapshot
- incremental updates via Socket.IO
- overview pages use summary-derived monitoring state
- detail views use summary + live + trend/history

The UI should explicitly distinguish:

- `Operational Health`
- `Alert Status`

Example:

- `Rack A1: Critical`
- `Alert: Firing`

or

- `Service auth-api: Critical`
- `Alert: Silenced`

This distinction is required to avoid confusing operational degradation with notification lifecycle.

## What Existing ClickHouse Init Already Enables

### Strongly ready for phase 1

- `latest-known` layer exists
- `current-live` layer exists
- `current-summary` layer exists for node, rack, container, service
- `trend` layer exists for short and medium windows
- `history` layer exists for rack and service
- metric severity semantics are already centralized in `metric_profile`

### Architectural implication

Because the database layer already computes rich semantics, the application monitoring engine should:

- consume the semantic outputs
- not rebuild the whole semantic stack from raw telemetry

This is the strongest reason to choose `polling-first + summary-first`.

## Success Criteria

This spec is successful if implementation planning can proceed with these statements accepted as true:

- monitoring phase 1 uses `polling-first`
- alert rules evaluate primarily from `summary` views
- dashboard monitoring UX uses `summary + live`
- Alertmanager remains a notification lifecycle engine, not monitoring truth
- backend stores its own internal monitoring state
- frontend receives backend-composed state and differentiates health from alert status

## Open Questions

- Where should the internal monitoring state be stored in phase 1: `MongoDB`, `Redis`, or another service-owned persistence layer?
- Should phase-1 polling query all four scopes every cycle, or stagger them by priority/cadence?
- Which minimum alert rule set should be considered MVP:
  - rack only
  - rack + service
  - rack + service + node
- Should phase-1 backend expose separate APIs for:
  - monitoring operational state
  - alert notification state
  - or a composed payload by default?
