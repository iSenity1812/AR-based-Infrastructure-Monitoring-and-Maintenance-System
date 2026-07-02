-- =========================================================
-- FILE NAME: 08_node_current_summary.sql
-- MUC DICH:
--   Refactor view node_current_summary theo huong modular.
--   View nay gom current live metrics thanh mot dong moi node
--   de phuc vu node list, quick read, va roll-up len rack.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / current summary / operator-first dashboard
-- PHU THUOC:
--   - telemetry_db.node_current_live
--   - 04_node_serving/02_node_current_live.sql
-- DAU RA CHINH:
--   - telemetry_db.node_current_summary
-- GHI CHU:
--   - Giu logic va schema output gan voi source-of-truth trong clickhouse.sql
--     de de doi chieu va thay the dan.
--   - Tầng summary không tự diễn giải threshold; toàn bộ severity/freshness
--     phải được lấy từ node_current_live.
-- =========================================================

USE telemetry_db;

-- Xoa view cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.node_current_summary;

-- View nay tong hop cac current signals quan trong nhat thanh mot dong moi node.
-- No cung giu lai explainability thong qua worst_metric_* de biet metric nao
-- dang keo node len severity cao nhat.
CREATE VIEW telemetry_db.node_current_summary AS
WITH base AS (
    SELECT *
    FROM telemetry_db.node_current_live
),
worst_metric AS (
    SELECT
        node_id,
        argMax(metric_key, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_key,
        argMax(tags_json, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_tags_json,
        argMax(latest_value_numeric, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_numeric_value,
        argMax(latest_value_text, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_text_value
    FROM base
    GROUP BY node_id
)
SELECT
    b.node_id,
    max(b.latest_ts) AS summary_ts,

    max(b.severity_code) AS max_severity_code,
    max(b.override_flag) AS has_override_flag,

    max(b.is_stale) AS is_any_stale,
    countIf(b.is_stale = 1) AS stale_metric_count,
    countIf(b.severity_code = 3) AS critical_metric_count,
    countIf(b.severity_code = 2) AS warning_metric_count,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_usage_pct') AS cpu_usage_pct_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.memory_used_pct') AS memory_used_pct_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.uptime_seconds') AS uptime_seconds_current,

    maxIf(b.latest_value_text, b.metric_key = 'node.primary_nic_status') AS primary_nic_status_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_temperature_c') AS cpu_temperature_c_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_queue_length') AS cpu_queue_length_max_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.memory_page_faults_rate') AS memory_page_faults_rate_max_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.tcp_retransmit_pct') AS tcp_retransmit_pct_max_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.disk_used_pct') AS disk_used_pct_max_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.disk_queue_length') AS disk_queue_length_max_current,

    sumIf(b.latest_value_numeric, b.metric_key = 'node.network_rx_bytes_sec') AS network_rx_bytes_sec_sum_current,
    sumIf(b.latest_value_numeric, b.metric_key = 'node.network_tx_bytes_sec') AS network_tx_bytes_sec_sum_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.ssd_temperature_c') AS ssd_temperature_c_max_current,
    minIf(b.latest_value_numeric, b.metric_key = 'node.ssd_life_pct') AS ssd_life_pct_min_current,

    w.worst_metric_key,
    w.worst_metric_tags_json,
    w.worst_metric_numeric_value,
    w.worst_metric_text_value

FROM base b
LEFT JOIN worst_metric w
    ON b.node_id = w.node_id
GROUP BY
    b.node_id,
    w.worst_metric_key,
    w.worst_metric_tags_json,
    w.worst_metric_numeric_value,
    w.worst_metric_text_value;

-- TEST GOI Y
-- SELECT * FROM telemetry_db.node_current_summary;
