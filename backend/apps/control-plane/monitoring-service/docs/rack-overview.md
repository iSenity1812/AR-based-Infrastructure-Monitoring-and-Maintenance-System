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
- Các trường dẫn xuất như `riskCards`, `trend.delta*`, `trend.lastChangeAgeSec` do backend assemble từ serving views

---

**2. The Chosen Datacenter JSON Contract**

```json
{
  "generatedAt": "2026-07-01T10:15:00+07:00",
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
          "key": "cpu_usage_pct",
          "tags": { "host": "node-17" },
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
}
```

---

**3. Source Mapping**

| Response field                   | Source                                                     | Notes                                                         |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `generatedAt`                    | Backend app clock                                          | ISO-8601                                                      |
| `scope`, `view`                  | Backend constant                                           | contract constant                                             |
| `overview.counts.*`              | `telemetry_db.rack_current_summary`                        | aggregate over all racks                                      |
| `riskCards[*].rack.name`         | topology/dimension service or rack dictionary if available | optional enrichment                                           |
| `riskCards[*].trend.delta1m`     | `telemetry_db.v_rack_summary_history`                      | current severity - latest `1m` historical severity before now |
| `riskCards[*].trend.delta5m`     | `telemetry_db.v_rack_summary_history`                      | current severity - latest `5m` historical severity before now |
| `riskCards[*].trend.lastChangeAgeSec` | `telemetry_db.v_rack_summary_history` + current row   | age since last severity/state change                          |
| `riskCards`                      | backend slice of the sorted rack list                      | top `N=3` recommended                                         |
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

- `trend.delta1m`
- `trend.delta5m`
- `trend.lastChangeAgeSec`

---

**7. Backend Processing Algorithm**

1. Query `rack_current_summary` for all current racks.
2. Query summary counters from the same view.
3. Query `v_rack_summary_history` for recent `1m` and `5m` snapshots of those racks.
4. For each rack:
   - map current fields directly
   - find latest prior `1m` row, compute `trend.delta1m = current internal severity code - previous_1m internal severity code`
   - find latest prior `5m` row, compute `trend.delta5m = current internal severity code - previous_5m internal severity code`
   - determine last state-change point by scanning newest-to-oldest historical rows until severity or signal-loss state differs from current; then `trend.lastChangeAgeSec = generatedAt - changed_bucket_start`
5. Sort full list using operational order:
   - `severity DESC`
   - `rackLevelFailure DESC`
   - `signalLoss DESC`
   - `badNodeRatio DESC`
   - `staleNodes DESC`
   - `updatedAt DESC`
   - `rackId ASC`
6. Set `riskCards = first 3 items of sorted list`
7. Return payload.

---

**8. Field Semantics**

- `status.severity`
  - `normal`
  - `warning`
  - `critical`
  - stale/signal loss is represented via `stale_nodes`, `has_signal_loss`, not as a separate dashboard severity
- `status.override`
  - rack contains at least one override-worthy critical condition
- `metrics.badNodeRatio`
  - `bad_nodes / total_nodes`
- `status.rackLevelFailure`
  - `1` when impact is broad enough to consider rack-wide failure
- `status.signalLoss`
  - indicates silent death / missing telemetry pattern
- `culprit.*`
  - culprit rack-level explanation for operator triage
- `trend.delta*`
  - positive means worsening, negative means recovering
- `trend.lastChangeAgeSec`
  - time since current risk posture began

---

**9. Response Rules**

- `riskCards` is not separately queried from DB; it is a backend-derived subset
- if no historical row exists for a rack:
  - `trend.delta1m = 0`
  - `trend.delta5m = 0`
  - `trend.lastChangeAgeSec = null`
- if `rack.name` enrichment unavailable:
  - fallback to `rack.id`

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
- `RackOverviewOverview`
- `RackOverviewRiskCard`
- `RackOverviewRackList`
- `RackOverviewFilters`

Nếu bạn muốn, mình có thể viết tiếp luôn phần `OpenAPI-style response schema` và `example 200/500 payloads` cho endpoint này.
