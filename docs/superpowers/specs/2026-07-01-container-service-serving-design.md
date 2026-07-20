# Container and Service Serving Design

## Metadata
- Date: 2026-07-01
- Status: Draft for review
- Scope: ClickHouse serving workload for `container` and `service`
- Audience: Principal Data Architect, Backend/Telemetry team, Dashboard/API team

## 1. Overview

This design defines the next serving workload after the Node and Rack serving layers: `container_service_serving`.

The purpose of this workload is to turn normalized raw telemetry for `scope_type = 'container'` and `scope_type = 'service'` into operator-facing serving views that support:

- current operational state
- severity ranking
- culprit identification
- short-term and medium-term trends
- service-level cluster health derived from both native `service.*` telemetry and container roll-up

The design follows the same core architecture already established for Node and Rack:

- policy-driven severity using `telemetry_db.dict_metric_profile`
- separation between latest-state and current-live semantics
- operator-first severity logic
- 2-stage aggregation where needed
- trend views from `v_agg_1m_by_scope_metric` and `v_agg_5m_by_scope_metric`

## 2. Goals

The serving workload must answer these operator questions:

- Which containers are currently unhealthy, stopped, or approaching OOM risk?
- Which service is down, degraded, or impacted by bad child containers?
- Which exact container and metric are the current culprit for a degraded service?
- What is the blast radius of a service issue in terms of affected containers?
- How has container/service health evolved over the last 1 hour, 6 hours, 24 hours, and 7 days?

## 3. Non-Goals

This design does not cover:

- alert lifecycle and incident workflow
- frontend UI implementation
- topology dictionary beyond existing `rack` and future optional service topology extensions
- backfill scripts for historical container/service serving data
- non-ClickHouse orchestration logic

## 4. Architectural Decision

### 4.1 Chosen Approach: Hybrid Service Semantics

The service serving layer will use a hybrid design.

`service.*` metrics are treated as the cluster-level truth emitted by the collector. They provide the native service state, including:

- `service.container_count`
- `service.running_container_count`
- `service.cpu_usage_pct_sum`
- `service.memory_used_bytes_sum`

At the same time, `container_current_live` is used as the evidence layer for:

- worst container identification
- bad/critical container counts
- service blast radius
- cross-checking service degradation with child container reality

This hybrid model is preferred over both pure service-only and pure container-derived approaches because it gives the operator both:

- native service-state semantics
- forensic detail down to the exact culprit container

### 4.2 Consequences

Benefits:

- preserves collector semantics for service health
- keeps operator-facing culprit tracing
- aligns with the proven Node/Rack serving pattern
- avoids making service severity depend solely on incomplete child metrics

Costs:

- service serving logic is more complex than rack serving
- precedence rules between `service.*` and child container roll-up must be explicit

## 5. Source Telemetry Contract

### 5.1 Container Metrics Observed in Sample Telemetry

The sample telemetry contains the following `container.*` metric keys:

- `container.name`
- `container.image`
- `container.image_tag`
- `container.runtime_id`
- `container.status`
- `container.state`
- `container.health_status`
- `container.restart_count`
- `container.service_name`
- `container.node_id`
- `container.port_binding_count`
- `container.mount_count`
- `container.network_count`
- `container.cpu_usage_pct`
- `container.memory_used_bytes`
- `container.memory_used_pct`
- `container.memory_limit_bytes`
- `container.network_rx_bytes_sec`
- `container.network_tx_bytes_sec`
- `container.block_read_bytes_sec`
- `container.block_write_bytes_sec`
- `container.pid_count`

The sample also shows that container records carry tags such as:

- `container_name`
- `service_name`

### 5.2 Service Metrics Observed in Sample Telemetry

The sample telemetry contains the following `service.*` metric keys:

- `service.container_count`
- `service.running_container_count`
- `service.cpu_usage_pct_sum`
- `service.memory_used_bytes_sum`

The sample shows `scope_id = service_name` and also carries a `service_name` tag.

## 6. Semantic Model

### 6.1 Container Entity Semantics

`container` is treated as an operational entity with both lifecycle state and workload metrics.

Identity:

- `container_id = scope_id`
- `service_name` is sourced from `container.service_name`, with tag-based fallback allowed when needed
- `node_id` is sourced from `container.node_id`, with tag-based fallback allowed when needed

Behavior:

- state and health metrics are first-class operator signals
- resource metrics are severity-scored dynamically by dictionary policy
- OOM risk is a derived metric from raw bytes and limit

### 6.2 Service Entity Semantics

`service` is treated as a logical cluster-like workload entity.

Identity:

- `service_id = scope_id`
- `service_name = scope_id`

Behavior:

- `service.*` expresses native cluster state from the collector
- child containers provide blast radius and culprit detail
- service severity is the maximum of:
  - cluster state severity from `service.*`
  - worst child container severity

## 7. Operator-First Severity Logic

### 7.1 Container Severity Precedence

The severity pipeline for `container_current_live` is:

1. Freshness evaluation
2. Hard state overrides
3. Derived OOM risk override
4. Dictionary-driven numeric severity
5. Final severity and ranking flags

The hard overrides are:

- if `container.health_status = 'unhealthy'` then `severity_code = 3` and `override_flag = 1`
- if `container.state != 'running'` then `severity_code = 3`
- if `container.memory_used_bytes / container.memory_limit_bytes >= 0.9` then `severity_code = 3` and `override_flag = 1`

Then numeric metrics such as CPU, memory utilization, network throughput, block I/O, PID count, and restart count are evaluated using `telemetry_db.dict_metric_profile`.

### 7.2 Service Severity Precedence

The severity pipeline for `service_current_live` is:

1. Freshness evaluation for service metrics
2. Cluster-state evaluation from `service.*`
3. Child-container roll-up evaluation
4. Final worst-case selection

Cluster-state rules:

- if `service.running_container_count = 0` then `severity_code = 3` and `override_flag = 1`
- if `service.running_container_count < service.container_count` then `severity_code = 2`

Then service severity becomes the maximum of:

- cluster-state severity from `service.*`
- worst child container severity derived from `container_current_live`

This ensures a service can be marked degraded even when cluster counts still look nominal but one child container is already the dominant operational risk.

## 8. Freshness Semantics

Container and service freshness should follow the same serving contract already used for Node:

- `fresh`: `dateDiff('second', latest_ts, now()) <= 30`
- `stale`: `dateDiff('second', latest_ts, now()) <= 120`
- `unknown`: anything older than 120 seconds

This keeps the serving model operationally consistent across Node, Rack, Container, and Service.

## 9. Dictionary Policy Requirements

All numeric metrics must use `telemetry_db.dict_metric_profile` instead of hardcoded thresholds.

Required policy seed extensions include at minimum:

- `container.cpu_usage_pct`
- `container.memory_used_pct`
- `container.memory_used_bytes`
- `container.memory_limit_bytes`
- `container.network_rx_bytes_sec`
- `container.network_tx_bytes_sec`
- `container.block_read_bytes_sec`
- `container.block_write_bytes_sec`
- `container.pid_count`
- `container.restart_count`
- `service.cpu_usage_pct_sum`
- `service.memory_used_bytes_sum`
- `service.container_count`
- `service.running_container_count`

The only intentionally non-dictionary operator rules are:

- `container.health_status = unhealthy`
- `container.state != running`
- `container.memory_used_bytes / container.memory_limit_bytes >= 0.9`
- `service.running_container_count` compared to `service.container_count`

These are explicit semantic rules, not ordinary threshold metrics.

## 10. Serving Model

### 10.1 Container Latest State

`container_latest_state` is the finalized latest-known layer for `scope_type = 'container'`.

Responsibilities:

- filter and normalize container metrics from `v_latest_state_by_scope`
- classify semantic groups
- keep metric-series granularity
- do not compute severity yet

### 10.2 Container Current Live

`container_current_live` is the real-time operator layer.

Responsibilities:

- apply freshness semantics
- apply hard lifecycle overrides
- compute OOM-risk override from bytes and memory limit
- apply dictionary-based severity for numeric metrics
- emit:
  - `severity_code`
  - `override_flag`
  - `is_ranking_metric`
  - `live_state`
  - `stale_age_sec`

### 10.3 Container Current Summary

`container_current_summary` collapses metric-series rows into one operator-facing row per container.

Responsibilities:

- one row per `container_id`
- determine current worst metric via `argMax(tuple(severity_code, override_flag, latest_ts))`
- emit inventory fields such as `service_name` and `node_id`
- expose current culprit metric/value

### 10.4 Service Latest State

`service_latest_state` is the finalized latest-known layer for `scope_type = 'service'`.

Responsibilities:

- filter service metrics from `v_latest_state_by_scope`
- keep service-native series and values
- do not compute cluster severity yet

### 10.5 Service Current Live

`service_current_live` is the hybrid service-serving layer.

Responsibilities:

- evaluate freshness for service-native metrics
- derive cluster severity from:
  - `service.container_count`
  - `service.running_container_count`
- join or roll up child evidence from `container_current_live`
- compute:
  - worst child container
  - bad/critical child counts
  - service blast radius

### 10.6 Service Current Summary

`service_current_summary` emits one row per service for dashboard/API usage.

Responsibilities:

- one row per `service_id`
- expose current cluster severity
- expose blast radius fields:
  - `total_containers`
  - `running_containers`
  - `bad_containers`
  - `critical_containers`
  - `non_running_containers`
- expose:
  - `worst_container_id`
  - `worst_metric_key`
  - `worst_metric_value_numeric`
  - `worst_metric_value_text`

## 11. Aggregation Strategy

### 11.1 Spatial Aggregation

Container summary uses metric-series to container roll-up.

Service summary uses a hybrid 2-stage roll-up:

1. metric-series -> container summary
2. container summary + `service.*` -> service summary

Container-to-service roll-up fields:

- `total_containers = uniq(container_id)`
- `running_containers = uniqIf(container_id, container_state = 'running')`
- `bad_containers = uniqIf(container_id, severity_code >= 2)`
- `critical_containers = uniqIf(container_id, severity_code = 3)`
- `non_running_containers = uniqIf(container_id, container_state != 'running')`

Culprit selection:

- `worst_container_id = argMax(container_id, tuple(container_severity, override_flag, latest_ts))`
- culprit metric is inherited from the winning container summary row

### 11.2 Temporal Aggregation

The trend strategy must match the existing platform convention:

- `1m` buckets for short-term windows such as 1 hour and 6 hours
- `5m` buckets for medium-term windows such as 24 hours and 7 days

Numeric container/service metrics:

- `value_last` for current-point semantics
- `value_max` for spike visibility in 1m windows
- `value_avg` for smooth trend reading in 5m windows
- `value_p95` for burst-sensitive trend analysis

State metrics such as `container.state`, `container.health_status`, and `container.status`:

- use `text_last`
- bucket severity is still worst-case within the bucket

Final bucket severity:

- always use worst-case semantics
- never average the severity code

## 12. Proposed SQL Module Structure

The workload should be created under:

`backend/apps/clickhouse-init/07_container_service_serving/`

Proposed files:

1. `01_container_latest_state.sql`
2. `02_container_current_live.sql`
3. `03_container_current_summary.sql`
4. `04_service_latest_state.sql`
5. `05_service_current_live.sql`
6. `06_service_current_summary.sql`
7. `07_container_summary_trend_1m.sql`
8. `08_container_summary_trend_5m.sql`
9. `09_service_summary_trend_1m.sql`
10. `10_service_summary_trend_5m.sql`

Rationale:

- complete the container layer first
- make service-serving depend on container-serving instead of re-deriving directly from raw telemetry
- keep current-state semantics separate from trend semantics
- preserve the modular execution style already used in `clickhouse-init`

## 13. Query-Facing Output Expectations

### 13.1 Container Current Summary

Expected operator-facing columns:

- `container_id`
- `service_name`
- `node_id`
- `summary_ts`
- `container_severity_code`
- `has_override_flag`
- `live_state`
- `worst_metric_key`
- `worst_metric_tags_json`
- `worst_metric_value_numeric`
- `worst_metric_value_text`

### 13.2 Service Current Summary

Expected operator-facing columns:

- `service_id`
- `summary_ts`
- `service_severity_code`
- `has_override_flag`
- `total_containers`
- `running_containers`
- `bad_containers`
- `critical_containers`
- `non_running_containers`
- `bad_container_ratio`
- `is_service_level_failure`
- `worst_container_id`
- `worst_metric_key`
- `worst_metric_tags_json`
- `worst_metric_value_numeric`
- `worst_metric_value_text`

## 14. Failure Semantics

The workload must distinguish between these scenarios:

- stopped container
- unhealthy running container
- container near OOM
- degraded service with some but not all running containers
- service down with zero running containers
- stale/unknown telemetry

The operator should be able to see not only that a service is degraded, but also whether the root cause is:

- service orchestration state
- one or more unhealthy child containers
- high resource pressure inside one specific container

## 15. Testing Expectations

Minimum validation scenarios for implementation:

1. A running healthy container with normal metrics stays at severity 0.
2. `container.health_status = unhealthy` forces severity 3 and override 1.
3. `container.state != running` forces severity 3.
4. `memory_used_bytes / memory_limit_bytes >= 0.9` forces severity 3.
5. Dictionary threshold changes affect numeric severity without rewriting historical rows.
6. A service with `running_container_count = 0` becomes severity 3.
7. A service with `running_container_count < container_count` becomes severity 2.
8. A service with healthy service counters but one critical child container surfaces the critical child as culprit.
9. Trend queries preserve worst-case severity per bucket.
10. Freshness transitions from fresh -> stale -> unknown behave consistently with Node serving.

## 16. Risks and Open Implementation Notes

- `container.memory_used_bytes / container.memory_limit_bytes` requires both metrics to be present in the current container snapshot. Missing limit values must not divide by zero.
- service trend logic must decide how to represent buckets where `service.*` is present but some child container metrics are missing.
- if `service.scope_id` ever diverges from logical `service_name`, the joining key must be revisited.
- the first implementation should prefer correctness and explainability over compact SQL.

## 17. Recommendation

Proceed with the hybrid serving implementation exactly as defined in this document.

This is the best trade-off because it:

- respects collector-native service semantics
- preserves deep operator observability
- remains aligned with the existing Node and Rack serving architecture
- avoids hardcoding metric thresholds into historical data paths
