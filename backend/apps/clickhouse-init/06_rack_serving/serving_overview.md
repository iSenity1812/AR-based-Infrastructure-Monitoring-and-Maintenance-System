# Rack Serving View Architecture Documentation

## 1. System Overview / Tổng quan hệ thống

**VI:** Trong hệ thống telemetry này, `Rack` là một **Logical Entity** chứ không phải một telemetry producer độc lập. Rack không tự phát sinh metric CPU, memory, network hay trạng thái vận hành riêng. Toàn bộ trạng thái hiện tại của Rack phải được **suy diễn (derived)** và **tổng hợp (rolled up)** từ các `Node` vật lý nằm bên trong Rack đó. Vì vậy, Rack serving layer không phải là lớp ingest dữ liệu mới, mà là lớp diễn giải nghiệp vụ ở trên `node_current_live`.

**EN:** In this telemetry system, a `Rack` is a **logical entity**, not an independent telemetry producer. A rack does not emit its own CPU, memory, network, or operational metrics. Its current state must be **derived** and **rolled up** from the physical `Node` entities mounted inside that rack. Therefore, the rack serving layer is not a new ingestion boundary; it is a business-oriented serving layer built on top of `node_current_live`.

**VI:** Ánh xạ `node_id <-> rack_id` được cung cấp theo luồng **event-driven**. Topology events từ Redpanda được đồng bộ vào bảng cơ sở topology trong ClickHouse, sau đó được nạp vào RAM Dictionary `telemetry_db.dict_node_topology`. Dictionary này cho phép tra cứu thời gian thực bằng `dictGet(...)`, giúp mọi query serving map `node_id` sang `rack_id` mà không cần join nặng với bảng topology mỗi lần đọc.

**EN:** The `node_id <-> rack_id` mapping is provided through an **event-driven** topology flow. Topology events from Redpanda are synchronized into a base topology table in ClickHouse and then exposed through the in-memory dictionary `telemetry_db.dict_node_topology`. This dictionary enables real-time lookup via `dictGet(...)`, allowing serving queries to resolve `node_id` to `rack_id` without performing heavy joins against topology tables on every read.

---

## 2. Core Architectural Principles

### 2.1. “Critical Wins Over Stale”

The rack severity model intentionally prioritizes **operational severity (`0..3`) over stale/unknown severity (`4`)** during worst-case evaluation.

This rule exists because stale telemetry and operational failure are not semantically equivalent:

- `critical` means the platform still has enough visibility to assert that a node is in an actively bad state.
- `stale` or `unknown` means the system has lost observability for some node-level signals.
- If stale were allowed to dominate all other severities, a rack containing both a burning node and a silent node would collapse into a single “stale” label, which is operationally misleading.

This creates an information-blindness problem for operators:

- the dashboard would surface loss of signal,
- but hide the fact that an observed node is already overloaded, down, or thermally critical.

The design therefore separates concerns:

- **Rack operational severity** uses `0..3` and answers: “How bad is the currently observable operational state?”
- **Signal-loss indicators** such as `silent_dead_nodes`, `stale_nodes`, and `has_signal_loss` answer: “How much observability have we lost?”

This dual-channel design preserves both truths simultaneously.

### 2.2. Two-Stage Aggregation Pipeline

A direct roll-up from metric-series level to rack level is unsafe because `node_current_live` is not one row per node; it is one row per:

- `node_id`
- `metric_key`
- `series_key`

A single node may therefore contribute many rows:

- one row per disk volume
- one row per NIC
- one row per TCP address family
- one row per SSD
- one row per GPU index

If the rack layer were to count `severity >= 2` directly from metric rows, one unhealthy node could inflate `bad_nodes` multiple times. This would corrupt blast-radius metrics and make `is_rack_level_failure` unreliable.

The two-stage pipeline solves this:

1. **Stage 1: Metric-series -> Node**
   - Collapse all metric rows for the same node into one node-level operational summary.
   - Compute `node_is_bad`, `node_is_unknown`, `node_has_override_flag`, and the node-level culprit metric.
2. **Stage 2: Node -> Rack**
   - Roll up the node-level summaries into a single rack row.
   - Count node-based blast radius correctly.
   - Select the rack-level culprit node and metric using stable weighted tie-breaking.

This is not just a performance convenience. It is a correctness requirement.

---

## 3. Data Schema & Data Dictionary

### 3.1. Identity & Freshness

| Column       | Type       | Meaning                                                                                                                                                                                                                                                    |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rack_id`    | `String`   | Logical rack identifier resolved from `dict_node_topology` using `node_id`.                                                                                                                                                                                |
| `summary_ts` | `DateTime` | Latest observed timestamp among all node summaries contributing to the rack. Implemented as `max(node_summary_ts)`, which itself is derived from `max(latest_ts)` at node level. It indicates the freshest supporting observation inside the rack summary. |

### 3.2. Severity & Culprit

| Column                       | Type              | Meaning                                                                                            |
| ---------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `rack_severity_code`         | `UInt8` / numeric | Highest **operational** severity across nodes in the rack. Uses `0..3`, excluding stale dominance. |
| `worst_node_id`              | `String`          | Node selected as the primary culprit for the rack.                                                 |
| `worst_metric_key`           | `String`          | Metric key that best explains why the culprit node is driving rack severity.                       |
| `worst_metric_tags_json`     | `String`          | Series tags of the culprit metric, preserving volume/NIC/drive context.                            |
| `worst_metric_value_numeric` | `Float64`         | Numeric value of the culprit metric when applicable.                                               |
| `worst_metric_value_text`    | `String`          | Text/state value of the culprit metric when applicable.                                            |
| `has_override_flag`          | `UInt8`           | Rack-level boolean indicating whether any node inside the rack contains an override-grade signal.  |

### 3.3. Blast Radius

| Column                  | Type     | Meaning                                                                                                    |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `total_nodes`           | `UInt64` | Total number of nodes mapped to the rack and present in the roll-up.                                       |
| `bad_nodes`             | `UInt64` | Count of nodes whose node-level operational severity is `>= 2`.                                            |
| `critical_nodes`        | `UInt64` | Count of nodes with node-level severity `= 3`.                                                             |
| `warning_nodes`         | `UInt64` | Count of nodes with node-level severity `= 2`.                                                             |
| `stale_nodes`           | `UInt64` | Count of nodes having at least one `live_state IN ('stale', 'unknown')`.                                   |
| `bad_node_ratio`        | `Float`  | `bad_nodes / total_nodes`, rounded for dashboard use.                                                      |
| `is_rack_level_failure` | `UInt8`  | `1` when `bad_nodes / total_nodes > 0.5`; otherwise `0`. Represents majority-impact failure at rack scope. |

### 3.4. Signal Loss

| Column              | Type     | Meaning                                                                                                                                                           |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `silent_dead_nodes` | `UInt64` | Count of nodes having at least one `live_state = 'unknown'`. This captures silent failures such as power loss, upstream cable loss, or severe observability gaps. |
| `has_signal_loss`   | `UInt8`  | `1` when `silent_dead_nodes > 0`; otherwise `0`. Used as a rack-level signal-loss flag for operator awareness.                                                    |

---

## 4. Algorithmic Weighting via ClickHouse `argMax`

### 4.1. Why `if(severity_code = 4, -1, severity_code)` is used in Stage 1

At node level, the system must identify the metric that best explains the node’s operational problem.

However, stale/unknown (`severity_code = 4`) is intentionally **not** allowed to outrank observed operational severity when selecting the node culprit. The expression:

```sql
if(severity_code = 4, -1, severity_code)
```

forces stale signals below all operational severities:

- `critical (3)` remains stronger than `warning (2)`
- `warning (2)` remains stronger than `healthy/info`
- `stale (4)` is demoted to `-1` only for culprit selection ordering

This does **not** erase stale information. It simply prevents stale from hijacking the culprit metric when a real observed failure already exists.

That is the implementation of the “Critical Wins Over Stale” principle.

### 4.2. Tie-breaking in Stage 2

At rack level, `argMax` receives the tuple:

```sql
tuple(
  node_max_operational_severity,
  node_has_override_flag,
  node_summary_ts
)
```

This gives deterministic tie-breaking:

1. **Primary weight:** `node_max_operational_severity`
   - More severe nodes outrank less severe nodes.
2. **Secondary weight:** `node_has_override_flag`
   - If severities tie, nodes with override-grade conditions win.
3. **Tertiary weight:** `node_summary_ts`
   - If both severity and override tie, the more recently observed node wins.

This weighting prevents unstable culprit selection and makes dashboard output explainable.

---

## 5. Production Integration & Runbook

### 5.1. Complete `CREATE VIEW` Statement

```sql
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.rack_current_summary;

CREATE VIEW telemetry_db.rack_current_summary AS
SELECT
    rack_id,
    max(node_summary_ts) AS summary_ts,
    max(node_max_operational_severity) AS rack_severity_code,
    max(node_has_override_flag) AS has_override_flag,
    count() AS total_nodes,
    sum(node_is_bad) AS bad_nodes,
    sum(node_is_critical) AS critical_nodes,
    sum(node_is_warning) AS warning_nodes,
    sum(node_is_stale) AS stale_nodes,
    sum(node_is_unknown) AS silent_dead_nodes,
    round(sum(node_is_bad) / count(), 4) AS bad_node_ratio,
    if(count() > 0 AND sum(node_is_bad) / count() > 0.5, 1, 0) AS is_rack_level_failure,
    if(sum(node_is_unknown) > 0, 1, 0) AS has_signal_loss,
    argMax(
        node_id,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_node_id,
    argMax(
        node_worst_metric_key,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_key,
    argMax(
        node_worst_metric_tags_json,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_tags_json,
    argMax(
        node_worst_metric_value_numeric,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_value_numeric,
    argMax(
        node_worst_metric_value_text,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_value_text
FROM
(
    SELECT
        ifNull(
            dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
            ''
        ) AS rack_id,
        node_id,
        max(latest_ts) AS node_summary_ts,
        maxIf(severity_code, severity_code < 4) AS node_max_operational_severity,
        max(severity_code) AS node_max_any_severity,
        max(override_flag) AS node_has_override_flag,
        max(if(severity_code >= 2 AND severity_code < 4, 1, 0)) AS node_is_bad,
        max(if(severity_code = 3, 1, 0)) AS node_is_critical,
        max(if(severity_code = 2, 1, 0)) AS node_is_warning,
        max(if(live_state IN ('stale', 'unknown'), 1, 0)) AS node_is_stale,
        max(if(live_state = 'unknown', 1, 0)) AS node_is_unknown,
        argMax(
            metric_key,
            tuple(
                if(severity_code = 4, -1, severity_code),
                override_flag,
                latest_ts
            )
        ) AS node_worst_metric_key,
        argMax(
            tags_json,
            tuple(
                if(severity_code = 4, -1, severity_code),
                override_flag,
                latest_ts
            )
        ) AS node_worst_metric_tags_json,
        argMax(
            latest_value_numeric,
            tuple(
                if(severity_code = 4, -1, severity_code),
                override_flag,
                latest_ts
            )
        ) AS node_worst_metric_value_numeric,
        argMax(
            latest_value_text,
            tuple(
                if(severity_code = 4, -1, severity_code),
                override_flag,
                latest_ts
            )
        ) AS node_worst_metric_value_text
    FROM telemetry_db.node_current_live
    WHERE ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) != ''
    GROUP BY
        rack_id,
        node_id
) AS node_rollup
GROUP BY rack_id;
```

### 5.2. Backend API Query for Dashboard Rack List

The dashboard should sort racks by actual operational risk first, then by blast radius, then by signal-loss spread.

```sql
SELECT
    rack_id,
    summary_ts,
    rack_severity_code,
    worst_node_id,
    worst_metric_key,
    worst_metric_tags_json,
    worst_metric_value_numeric,
    worst_metric_value_text,
    total_nodes,
    bad_nodes,
    critical_nodes,
    warning_nodes,
    stale_nodes,
    silent_dead_nodes,
    bad_node_ratio,
    is_rack_level_failure,
    has_signal_loss,
    has_override_flag
FROM telemetry_db.rack_current_summary
ORDER BY
    rack_severity_code DESC,
    has_override_flag DESC,
    is_rack_level_failure DESC,
    bad_nodes DESC,
    silent_dead_nodes DESC,
    summary_ts DESC,
    rack_id ASC;
```

### 5.3. Operational Runbook Notes

- Use `rack_severity_code` as the primary ordering signal for rack triage.
- Use `worst_node_id` and `worst_metric_key` as the first drill-down hint in the UI.
- Use `is_rack_level_failure` to visually mark blast-radius escalation.
- Use `has_signal_loss` and `silent_dead_nodes` to surface observability collapse separately from operational degradation.
- Do not treat `silent_dead_nodes` as a replacement for operational severity; it is an additional operator signal.

This design yields a rack-serving layer that is explainable, operationally actionable, and stable under metric-series multiplicity.
