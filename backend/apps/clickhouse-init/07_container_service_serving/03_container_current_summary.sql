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
)
SELECT
    container_id,
    max(latest_ts) AS summary_ts,

    argMax(container_name, latest_ts) AS container_name,
    argMax(service_name, latest_ts) AS service_name,
    argMax(node_id, latest_ts) AS node_id,
    -- 1. TẦNG TRẠNG THÁI ĐỘNG
    multiIf(
        now() - max(latest_ts) > 300, 'unknown',
        argMax(container_state, latest_ts)
    ) AS container_state,

    multiIf(
        now() - max(latest_ts) > 300, 'unknown',
        argMax(container_health_status, latest_ts)
    ) AS container_health_status,

    multiIf(
        now() - max(latest_ts) > 300, 4,
        max(severity_code)
    ) AS max_severity_code,

    max(override_flag) AS has_override_flag,
    
    if(now() - max(latest_ts) > 300, 1, max(is_stale)) AS is_any_stale,
    countIf(is_stale = 1) AS stale_metric_count,
    
    if(now() - max(latest_ts) > 300, 0, countIf(severity_code = 3)) AS critical_metric_count,
    if(now() - max(latest_ts) > 300, 0, countIf(severity_code = 2)) AS warning_metric_count,
    -- 2. TẦNG TELEMETRY RÚT GỌN (Lưu ý: Đã đổi trường bốc trực tiếp từ cột có sẵn trong bảng live của bạn)
    -- Nếu hệ thống của bạn có metric cpu riêng, hãy thay thế string 'container.cpu_usage_pct' cho đúng
    if(now() - max(latest_ts) > 300, 0.0, maxIf(latest_value_numeric, metric_key = 'container.cpu_usage_pct')) AS cpu_usage_pct_current,
    -- Phần trăm RAM: Bạn có thể tính trực tiếp bằng cách lấy cột memory_used_bytes chia cho limit ngay tại đây để tránh bị 0
    if(now() - max(latest_ts) > 300, 0.0, round(max(memory_used_ratio) * 100, 2)) AS memory_used_pct_current,
    
    if(now() - max(latest_ts) > 300, 0, max(memory_used_bytes)) AS memory_used_bytes_current,
    max(memory_limit_bytes) AS memory_limit_bytes_current,
    if(now() - max(latest_ts) > 300, 0.0, max(memory_used_ratio)) AS memory_used_ratio_current,
    -- Số lần restart và pid count
    maxIf(latest_value_numeric, metric_key = 'container.restart_count') AS restart_count_current,
    if(now() - max(latest_ts) > 300, 0, maxIf(latest_value_numeric, metric_key = 'container.pid_count')) AS pid_count_current,
    -- Network & Block IO (Kiểm tra lại xem metric_key của Telegraf/Cadvisor gửi về tên là gì)
    if(now() - max(latest_ts) > 300, 0.0, sumIf(latest_value_numeric, metric_key = 'container.network_rx_bytes_sec')) AS network_rx_bytes_sec_sum_current,
    if(now() - max(latest_ts) > 300, 0.0, sumIf(latest_value_numeric, metric_key = 'container.network_tx_bytes_sec')) AS network_tx_bytes_sec_sum_current,
    if(now() - max(latest_ts) > 300, 0.0, sumIf(latest_value_numeric, metric_key = 'container.block_read_bytes_sec')) AS block_read_bytes_sec_sum_current,
    if(now() - max(latest_ts) > 300, 0.0, sumIf(latest_value_numeric, metric_key = 'container.block_write_bytes_sec')) AS block_write_bytes_sec_sum_current,

    if(now() - max(latest_ts) > 300, 'UNKNOWN', maxIf(latest_value_text, metric_key = 'container.status')) AS container_status_current,
    -- 3. TẦNG GIẢI THÍCH LỖI
    if(now() - max(latest_ts) > 300, 'container.heartbeat.loss', argMax(metric_key, tuple(severity_code, override_flag, latest_ts))) AS worst_metric_key,
    if(now() - max(latest_ts) > 300, '{}', argMax(tags_json, tuple(severity_code, override_flag, latest_ts))) AS worst_metric_tags_json,
    if(now() - max(latest_ts) > 300, 0.0, argMax(latest_value_numeric, tuple(severity_code, override_flag, latest_ts))) AS worst_metric_numeric_value,
    if(now() - max(latest_ts) > 300, 'NODE_TIMEOUT', argMax(latest_value_text, tuple(severity_code, override_flag, latest_ts))) AS worst_metric_text_value

FROM base
GROUP BY container_id;

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
