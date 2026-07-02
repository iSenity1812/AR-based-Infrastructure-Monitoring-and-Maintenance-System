**1. System Actors & Context**

- `Primary Actor`: `Operator` hoặc `AR Dashboard`
- `Endpoint`: `GET /api/v1/monitoring/racks/overview`
- `Protocol`: `REST API / JSON`, bootstrap bằng REST, cập nhật delta qua `WebSocket / Socket.IO`
- `Primary Goal`: cho operator biết ngay rack nào nguy hiểm nhất, rack nào lỗi diện rộng, rack nào mất tín hiệu
- `SLA Target`: end-to-end `< 45ms`
- `Freshness Target`: đọc từ serving layer hiện tại, không query raw telemetry

**Business intent**

- Trang này là `low-resolution operational overview`
- Không drill vào metric-row level
- Mọi rack phải xuất phát từ cùng `single source of truth`: `telemetry_db.rack_current_summary`
- Các trường dẫn xuất như `top_risk_racks`, `severity_trend_delta_*`, `last_change_age_sec` do backend assemble từ serving views

---

**2. The Chosen Datacenter JSON Contract**

```json
{
  "generated_at": "2026-07-01T10:15:00+07:00",
  "scope": "rack",
  "view": "operator_dashboard",
  "summary": {
    "total_racks": 48,
    "critical_racks": 6,
    "warning_racks": 11,
    "stale_racks": 3,
    "signal_loss_racks": 2,
    "rack_level_failure_racks": 4
  },
  "top_risk_racks": [
    {
      "rack_id": "rack-a1",
      "rack_name": "Rack A1",
      "summary_ts": "2026-07-01T10:15:00+07:00",
      "rack_severity_code": 3,
      "has_override_flag": 1,
      "total_nodes": 24,
      "bad_nodes": 13,
      "critical_nodes": 5,
      "warning_nodes": 8,
      "stale_nodes": 2,
      "bad_node_ratio": 0.5417,
      "is_rack_level_failure": 1,
      "has_signal_loss": 1,
      "worst_node_id": "node-17",
      "worst_metric_key": "cpu_usage_pct",
      "worst_metric_tags_json": "{\"host\":\"node-17\"}",
      "worst_metric_value_numeric": 98.4,
      "worst_metric_value_text": "98.4",
      "severity_trend_delta_1m": 1,
      "severity_trend_delta_5m": 2,
      "last_change_age_sec": 42
    }
  ],
  "rack_grid": {
    "sort_by": [
      "rack_severity_code_desc",
      "is_rack_level_failure_desc",
      "has_signal_loss_desc",
      "bad_node_ratio_desc",
      "stale_nodes_desc",
      "summary_ts_desc",
      "rack_id_asc"
    ],
    "items": []
  },
  "filters": {
    "severity": ["critical", "warning", "stale", "normal"],
    "only_failure": false,
    "only_signal_loss": false
  }
}
```

---

**3. Source Mapping**

| Response field                   | Source                                                     | Notes                                                         |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `generated_at`                   | Backend app clock                                          | ISO-8601                                                      |
| `scope`, `view`                  | Backend constant                                           | contract constant                                             |
| `summary.*`                      | `telemetry_db.rack_current_summary`                        | aggregate over all racks                                      |
| `rack_grid.items[*]` base fields | `telemetry_db.rack_current_summary`                        | one row per rack                                              |
| `rack_name`                      | topology/dimension service or rack dictionary if available | optional enrichment                                           |
| `severity_trend_delta_1m`        | `telemetry_db.v_rack_summary_history`                      | current severity - latest `1m` historical severity before now |
| `severity_trend_delta_5m`        | `telemetry_db.v_rack_summary_history`                      | current severity - latest `5m` historical severity before now |
| `last_change_age_sec`            | `telemetry_db.v_rack_summary_history` + current row        | age since last severity/state change                          |
| `top_risk_racks`                 | backend slice of sorted `rack_grid.items`                  | top `N=3` recommended                                         |
| `filters`                        | backend constant/defaults                                  | UI capability descriptor                                      |

---

**4. Serving Views Used**

- `telemetry_db.rack_current_summary`
  - source of truth cho trạng thái hiện tại từng rack
  - chứa severity, blast radius, signal loss, culprit
- `telemetry_db.v_rack_summary_history`
  - source cho trend delta và change tracking
  - dùng `bucket_granularity = '1m'` và `'5m'`

---

**5. Primary Query**

```sql
SELECT
    rack_id,
    summary_ts,
    rack_severity_code,
    has_override_flag,
    total_nodes,
    bad_nodes,
    critical_nodes,
    warning_nodes,
    stale_nodes,
    bad_node_ratio,
    is_rack_level_failure,
    has_signal_loss,
    worst_node_id,
    worst_metric_key,
    worst_metric_tags_json,
    worst_metric_value_numeric,
    worst_metric_value_text
FROM telemetry_db.rack_current_summary
ORDER BY
    rack_severity_code DESC,
    is_rack_level_failure DESC,
    has_signal_loss DESC,
    bad_node_ratio DESC,
    stale_nodes DESC,
    summary_ts DESC,
    rack_id ASC;
```

**Summary query**

```sql
SELECT
    count() AS total_racks,
    countIf(rack_severity_code = 3) AS critical_racks,
    countIf(rack_severity_code = 2) AS warning_racks,
    countIf(stale_nodes > 0 OR has_signal_loss = 1) AS stale_racks,
    countIf(has_signal_loss = 1) AS signal_loss_racks,
    countIf(is_rack_level_failure = 1) AS rack_level_failure_racks
FROM telemetry_db.rack_current_summary;
```

---

**6. Historical Enrichment Query**

```sql
SELECT
    rack_id,
    bucket_granularity,
    bucket_start,
    rack_severity_code,
    has_signal_loss
FROM telemetry_db.v_rack_summary_history
WHERE bucket_granularity IN ('1m', '5m')
  AND bucket_start >= now() - INTERVAL 24 HOUR;
```

**Backend uses this dataset to compute**

- `severity_trend_delta_1m`
- `severity_trend_delta_5m`
- `last_change_age_sec`

---

**7. Backend Processing Algorithm**

1. Query `rack_current_summary` for all current racks.
2. Query summary counters from the same view.
3. Query `v_rack_summary_history` for recent `1m` and `5m` snapshots of those racks.
4. For each rack:
   - map current fields directly
   - find latest prior `1m` row, compute `severity_trend_delta_1m = current.rack_severity_code - previous_1m.rack_severity_code`
   - find latest prior `5m` row, compute `severity_trend_delta_5m = current.rack_severity_code - previous_5m.rack_severity_code`
   - determine last state-change point by scanning newest-to-oldest historical rows until severity or signal-loss state differs from current; then `last_change_age_sec = generated_at - changed_bucket_start`
5. Sort full list using operational order:
   - `rack_severity_code DESC`
   - `is_rack_level_failure DESC`
   - `has_signal_loss DESC`
   - `bad_node_ratio DESC`
   - `stale_nodes DESC`
   - `summary_ts DESC`
   - `rack_id ASC`
6. Set `top_risk_racks = first 3 items of sorted list`
7. Return payload.

---

**8. Field Semantics**

- `rack_severity_code`
  - `0`: normal
  - `2`: warning
  - `3`: critical
  - stale/signal loss is represented via `stale_nodes`, `has_signal_loss`, not as a separate dashboard severity
- `has_override_flag`
  - rack contains at least one override-worthy critical condition
- `bad_node_ratio`
  - `bad_nodes / total_nodes`
- `is_rack_level_failure`
  - `1` when impact is broad enough to consider rack-wide failure
- `has_signal_loss`
  - indicates silent death / missing telemetry pattern
- `worst_*`
  - culprit rack-level explanation for operator triage
- `severity_trend_delta_*`
  - positive means worsening, negative means recovering
- `last_change_age_sec`
  - time since current risk posture began

---

**9. Response Rules**

- `rack_grid.items` always contains all racks visible to the caller
- `top_risk_racks` is not separately queried from DB; it is a backend-derived subset
- if no historical row exists for a rack:
  - `severity_trend_delta_1m = 0`
  - `severity_trend_delta_5m = 0`
  - `last_change_age_sec = null`
- if `rack_name` enrichment unavailable:
  - fallback to `rack_id`

---

**10. Pros, Cons, Reasoning**

**Pros**

- one consistent source of truth
- fast serving path from pre-aggregated views
- frontend receives operator-ready payload
- easy to track implementation progress because every field has a declared source

**Cons**

- trend delta and change-age are backend-derived, not yet materialized
- rack name depends on external topology enrichment
- if rack count becomes very large, full-grid payload may need pagination

**Reasoning**

- ClickHouse should own heavy telemetry roll-up
- backend should own consumer-shaped composition
- this keeps SQL stable and the API tailored to operator workflows without leaking storage details into the UI

**11. Recommended Backend DTO Shape**

- `MonitoringRackOverviewResponse`
- `RackOverviewSummary`
- `RackOverviewItem`
- `RackOverviewFilters`

Nếu bạn muốn, mình có thể viết tiếp luôn phần `OpenAPI-style response schema` và `example 200/500 payloads` cho endpoint này.
