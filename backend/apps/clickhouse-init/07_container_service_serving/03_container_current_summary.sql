-- =========================================================
-- FILE NAME: 03_container_current_summary.sql
-- MUC DICH:
--   Gom current live metrics thanh mot dong moi container
--   de phuc vu container list, quick read, va roll-up len service.
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / current summary / operator-first dashboard
-- PHU THUOC:
--   - telemetry_db.container_current_live
--   - 07_container_service_serving/02_container_current_live.sql
-- DAU RA CHINH:
--   - telemetry_db.container_current_summary
-- GHI CHU:
--   - Tầng summary khong tu dien giai threshold.
--   - Toan bo severity/freshness/override phai lay tu container_current_live.
--   - View nay giu lai explainability thong qua worst_metric_*.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.container_current_summary;

-- View nay tong hop cac current signals quan trong nhat thanh mot dong moi container.
CREATE VIEW telemetry_db.container_current_summary AS
WITH base AS (
    SELECT *
    FROM telemetry_db.container_current_live
),
worst_metric AS (
    SELECT
        container_id,
        argMax(metric_key, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_key,
        argMax(tags_json, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_tags_json,
        argMax(latest_value_numeric, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_numeric_value,
        argMax(latest_value_text, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_text_value
    FROM base
    GROUP BY container_id
)
SELECT
    b.container_id,
    max(b.latest_ts) AS summary_ts,

    argMax(b.container_name, b.latest_ts) AS container_name,
    argMax(b.service_name, b.latest_ts) AS service_name,
    argMax(b.node_id, b.latest_ts) AS node_id,

    argMax(b.container_state, b.latest_ts) AS container_state,
    argMax(b.container_health_status, b.latest_ts) AS container_health_status,

    max(b.severity_code) AS max_severity_code,
    max(b.override_flag) AS has_override_flag,

    max(b.is_stale) AS is_any_stale,
    countIf(b.is_stale = 1) AS stale_metric_count,
    countIf(b.severity_code = 3) AS critical_metric_count,
    countIf(b.severity_code = 2) AS warning_metric_count,

    maxIf(b.latest_value_numeric, b.metric_key = 'container.cpu_usage_pct') AS cpu_usage_pct_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'container.memory_used_pct') AS memory_used_pct_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'container.memory_used_bytes') AS memory_used_bytes_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'container.memory_limit_bytes') AS memory_limit_bytes_current,

    maxIf(b.memory_used_ratio, b.metric_key = 'container.memory_used_bytes') AS memory_used_ratio_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'container.restart_count') AS restart_count_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'container.pid_count') AS pid_count_current,

    sumIf(b.latest_value_numeric, b.metric_key = 'container.network_rx_bytes_sec') AS network_rx_bytes_sec_sum_current,
    sumIf(b.latest_value_numeric, b.metric_key = 'container.network_tx_bytes_sec') AS network_tx_bytes_sec_sum_current,

    sumIf(b.latest_value_numeric, b.metric_key = 'container.block_read_bytes_sec') AS block_read_bytes_sec_sum_current,
    sumIf(b.latest_value_numeric, b.metric_key = 'container.block_write_bytes_sec') AS block_write_bytes_sec_sum_current,

    maxIf(b.latest_value_text, b.metric_key = 'container.status') AS container_status_current,

    w.worst_metric_key,
    w.worst_metric_tags_json,
    w.worst_metric_numeric_value,
    w.worst_metric_text_value

FROM base b
LEFT JOIN worst_metric w
    ON b.container_id = w.container_id
GROUP BY
    b.container_id,
    w.worst_metric_key,
    w.worst_metric_tags_json,
    w.worst_metric_numeric_value,
    w.worst_metric_text_value;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra summary cua container da giu dung
-- worst metric, identity, memory ratio, va severity snapshot.
-- =========================================================

-- Test 1:
-- Xem toan bo summary cua tat ca container
-- SELECT *
-- FROM telemetry_db.container_current_summary
-- ORDER BY max_severity_code DESC, service_name, container_name;

-- Test 2:
-- Tim cac container dang critical
-- SELECT
--     container_id,
--     container_name,
--     service_name,
--     node_id,
--     container_state,
--     container_health_status,
--     max_severity_code,
--     has_override_flag,
--     memory_used_ratio_current,
--     worst_metric_key
-- FROM telemetry_db.container_current_summary
-- WHERE max_severity_code = 3
-- ORDER BY service_name, container_name;

-- Test 3:
-- Xem nhanh cac container co nguy co OOM
-- SELECT
--     container_id,
--     container_name,
--     memory_used_bytes_current,
--     memory_limit_bytes_current,
--     memory_used_ratio_current,
--     worst_metric_key,
--     max_severity_code
-- FROM telemetry_db.container_current_summary
-- WHERE memory_used_ratio_current >= 0.9
-- ORDER BY memory_used_ratio_current DESC, container_name;
