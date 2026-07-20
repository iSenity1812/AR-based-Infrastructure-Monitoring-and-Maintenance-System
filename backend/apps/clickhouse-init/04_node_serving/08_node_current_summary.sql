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
    WHERE node_id IS NOT NULL AND node_id != '' AND node_id != 'null'
),
-- Tạo một bảng phụ tính toán trước cờ hiệu để tối ưu hiệu năng
check_state AS (
    SELECT 
        node_id,
        if(now() - max(latest_ts) > 300, 1, 0) AS is_unknown_flag
    FROM base
    GROUP BY node_id
)
SELECT
    b.node_id,
    max(b.latest_ts) AS summary_ts,
    max(b.override_flag) AS has_override_flag,
    -- 1. TẦNG CODES HỆ THỐNG
    multiIf(
        maxIf(b.severity_code, b.is_ranking_metric = 1 AND b.severity_code < 4) = 3, 3,
        maxIf(b.severity_code, b.is_ranking_metric = 1 AND b.severity_code < 4) = 2, 2,
        0
    ) AS operational_severity_code,
    
    multiIf(
        c.is_unknown_flag = 1, 2,
        max(b.is_stale) = 1, 1,
        0
    ) AS signal_severity_code,

    multiIf(
        c.is_unknown_flag = 1, 4,                          -- 4: Mất kết nối (Unknown)
        maxIf(b.severity_code, b.is_ranking_metric = 1 AND b.severity_code < 4) = 3, 3, 
        maxIf(b.severity_code, b.is_ranking_metric = 1 AND b.severity_code < 4) = 2, 2, 
        max(b.is_stale) = 1, 1,                               
        0                                                  
    ) AS overall_health_code,
    -- 2. TẦNG BỘ ĐẾM COUNTERS (Ép về 0 khi Node chết kết nối mạng)
    max(b.is_stale) AS is_any_stale,
    c.is_unknown_flag AS is_any_unknown,
    countIf(b.is_stale = 1) AS stale_metric_count,
    c.is_unknown_flag AS unknown_metric_count, 
    if(c.is_unknown_flag = 1, 0, countIf(b.severity_code = 2)) AS warning_metric_count,
    if(c.is_unknown_flag = 1, 0, countIf(b.severity_code = 3)) AS critical_metric_count,
    if(c.is_unknown_flag = 1, 0, countIf(b.severity_code IN (2, 3))) AS bad_metric_count,
    
    count() AS reporting_metric_count,
    countIf(b.is_ranking_metric = 1) AS ranking_metric_count,
    -- 3. TẦNG TELEMETRY RÚT GỌN (ĐÃ CẬP NHẬT: Ép sạch chỉ số động về 0/mặc định khi sập kết nối)
    if(c.is_unknown_flag = 1, 0.0, maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_usage_pct')) AS cpu_usage_pct_current,
    if(c.is_unknown_flag = 1, 0.0, maxIf(b.latest_value_numeric, b.metric_key = 'node.memory_used_pct')) AS memory_used_pct_current,
    if(c.is_unknown_flag = 1, 0.0, maxIf(b.latest_value_numeric, b.metric_key = 'node.disk_used_pct')) AS disk_used_pct_max_current,
    if(c.is_unknown_flag = 1, 0.0, maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_temperature_c')) AS cpu_temperature_c_max_current,
    if(c.is_unknown_flag = 1, 0.0, maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_package_power_w')) AS cpu_package_power_w_current,
    -- Các trạng thái tĩnh / phần cứng hoặc thời gian chạy thì có thể giữ nguyên làm Last Known
    maxIf(b.latest_value_text, b.metric_key = 'node.primary_nic_status') AS primary_nic_status_current,

    if(c.is_unknown_flag = 1, 0.0, sumIf(b.latest_value_numeric, b.metric_key = 'node.network_rx_bytes_sec')) AS network_rx_bytes_sec_sum_current,
    if(c.is_unknown_flag = 1, 0.0, sumIf(b.latest_value_numeric, b.metric_key = 'node.network_tx_bytes_sec')) AS network_tx_bytes_sec_sum_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.ssd_temperature_c') AS ssd_temperature_c_max_current,
    minIf(b.latest_value_numeric, b.metric_key = 'node.ssd_life_pct') AS ssd_life_pct_min_current,
    toUInt32(
        if(
            c.is_unknown_flag = 1,
            0,
            greatest(
                maxIf(b.latest_value_numeric, b.metric_key = 'node.uptime_seconds'),
                0
            )
        )
    ) AS uptime_seconds_current,
    -- 3.1. UNIT MAPPING: Giữ unit thật từ metric source để frontend không phải hardcode
    anyIf(b.unit, b.metric_key = 'node.cpu_usage_pct') AS cpu_usage_pct_unit,
    anyIf(b.unit, b.metric_key = 'node.memory_used_pct') AS memory_used_pct_unit,
    anyIf(b.unit, b.metric_key = 'node.disk_used_pct') AS disk_used_pct_unit,
    anyIf(b.unit, b.metric_key = 'node.cpu_temperature_c') AS cpu_temperature_c_unit,
    anyIf(b.unit, b.metric_key = 'node.cpu_package_power_w') AS cpu_package_power_w_unit,
    anyIf(b.unit, b.metric_key = 'node.primary_nic_status') AS primary_nic_status_unit,
    anyIf(b.unit, b.metric_key = 'node.network_rx_bytes_sec') AS network_rx_bytes_sec_unit,
    anyIf(b.unit, b.metric_key = 'node.network_tx_bytes_sec') AS network_tx_bytes_sec_unit,
    anyIf(b.unit, b.metric_key = 'node.ssd_temperature_c') AS ssd_temperature_c_unit,
    anyIf(b.unit, b.metric_key = 'node.ssd_life_pct') AS ssd_life_pct_unit,
    anyIf(b.unit, b.metric_key = 'node.uptime_seconds') AS uptime_seconds_unit,
    -- 4. TẦNG GIẢI THÍCH LỖI
    if(c.is_unknown_flag = 1, 'node.heartbeat.loss', argMax(b.metric_key, tuple(b.severity_code, b.override_flag, b.latest_ts))) AS worst_metric_key,
    if(c.is_unknown_flag = 1, '{}', argMax(b.tags_json, tuple(b.severity_code, b.override_flag, b.latest_ts))) AS worst_metric_tags_json,
    if(c.is_unknown_flag = 1, 0.0, argMax(b.latest_value_numeric, tuple(b.severity_code, b.override_flag, b.latest_ts))) AS worst_metric_numeric_value,
    if(c.is_unknown_flag = 1, 'PING_TIMEOUT', argMax(b.latest_value_text, tuple(b.severity_code, b.override_flag, b.latest_ts))) AS worst_metric_text_value

FROM base b
LEFT JOIN check_state c ON b.node_id = c.node_id
GROUP BY b.node_id, c.is_unknown_flag;



-- TEST GOI Y
-- SELECT * FROM telemetry_db.node_current_summary;
