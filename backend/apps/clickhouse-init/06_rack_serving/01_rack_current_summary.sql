-- =============================================
-- FILE NAME: 01_rack_current_summary.sql
-- MỤC ĐÍCH:
--   Tạo view tổng hợp trạng thái hiện tại của Rack từ node_current_live.
--   View này phục vụ operator dashboard theo hướng ưu tiên vận hành thực chiến:
--   worst-case wins, culprit identification, blast radius, silent death.
-- TẦNG DỮ LIỆU PHỤC VỤ:
--   06_rack_serving / current operational read model for rack
-- QUY TẮC:
--    Mã Code,Tên Trạng Thái,Ý Nghĩa Vận Hành,Ràng Buộc Kỹ Thuật (DB Logic),Màu Sắc UI Gợi Ý
--    4,CRITICAL_FAILURE,Sập Toàn Cụm: Mất kết nối toàn bộ tủ Rack. Mọi số liệu ma bị ép về null.,sum(node_is_unknown) == total_nodes,Đỏ chớp nháy nhanh (Blink Crimson)
--    3,HIGH_FAILURE,Sập Bán Phần: Trên 50% số máy chủ trong tủ đang dính lỗi Critical vận hành.,bad_node_ratio > 0.5,Đỏ đậm tĩnh (Solid Red)
--    2,WARNING,"Suy Giảm Hiệu Năng: Có ít nhất 1 node chết lặng (unknown), hoặc có node dính lỗi nặng.",silent_dead_nodes > 0 OR critical_nodes > 0,Cam đậm (Amber Orange)
--    1,STALE,Cảnh Báo Nhẹ: Có node mất tín hiệu nhẹ (stale), hoặc có node dính lỗi Warning.,warning_nodes > 0, Vàng nhạt (Yellow)
--    0,RACK_HEALTHY,"Khỏe Mạnh: Toàn bộ cụm máy hoạt động trơn tru, data đổ về đều đặn.",Tất cả các điều kiện trên đều bằng 0.,Xanh lục bảo (Emerald Green)
-- =============================================

USE telemetry_db;

-- Xóa view cũ nếu đã tồn tại để đảm bảo init chạy idempotent ở mức DDL
DROP VIEW IF EXISTS telemetry_db.rack_current_summary;

-- Tạo view tổng hợp Rack current-state từ node_current_live
CREATE OR REPLACE VIEW telemetry_db.rack_current_summary AS
-- Bước 2: Roll-up từ node-level thành rack-level kèm chuẩn hóa Status & Tránh số liệu ma
SELECT
    rack_id,
    max(node_summary_ts) AS summary_ts,
    -- ◄ CHUẨN HÓA SỰ CỐ CẤP RACK (OVERALL HEALTH CODE)
    multiIf(
        count() > 0 AND sum(node_is_unknown) = count(), 4, -- 4: CRITICAL (Cả cụm mất kết nối hoàn toàn)
        if(count() > 0 AND sum(node_is_bad) / count() > 0.5, 1, 0) = 1, 3, -- 3: HIGH (Sập bán phần > 50% tài nguyên)
        sum(node_is_unknown) > 0 OR sum(node_is_critical) > 0, 2, -- 2: WARNING (Có máy sập lẻ tẻ hoặc dính lỗi Critical con)
        sum(node_is_warning) > 0, 1, -- 1: STALE (Có máy mất tín hiệu nhẹ)
        0 -- 0: HEALTHY
    ) AS rack_severity_code,
    
    max(node_has_override_flag) AS has_override_flag,
    -- Blast radius counters
    count() AS total_nodes,
    sum(node_is_bad) AS bad_nodes,
    sum(node_is_critical) AS critical_nodes,
    sum(node_is_warning) AS warning_nodes,
    sum(node_is_stale) AS stale_nodes,
    sum(node_is_unknown) AS silent_dead_nodes,
    round(sum(node_is_bad) / count(), 4) AS bad_node_ratio,
    if(count() > 0 AND sum(node_is_bad) / count() > 0.5, 1, 0) AS is_rack_level_failure,
    if(sum(node_is_unknown) > 0, 1, 0) AS has_signal_loss,
    -- ◄ CHUẨN HÓA METRICS: NẾU CẢ RACK SẬP THÌ ÉP VỀ NULL, NGƯỢC LẠI THÌ AGGREGATE DỰA TRÊN CÁC NODE ALIVE
    if(sum(node_is_unknown) = count(), null, round(avgIf(node_cpu_avg, node_is_unknown = 0), 2)) AS avg_cpu_usage_pct,
    if(sum(node_is_unknown) = count(), null, round(avgIf(node_mem_avg, node_is_unknown = 0), 2)) AS avg_memory_used_pct,
    if(sum(node_is_unknown) = count(), null, round(maxIf(node_disk_max, node_is_unknown = 0), 2)) AS max_disk_used_pct,
    if(sum(node_is_unknown) = count(), null, round(maxIf(node_temp_max, node_is_unknown = 0), 2)) AS max_cpu_temperature_c,
    if(sum(node_is_unknown) = count(), null, round(sumIf(node_net_rx_sum, node_is_unknown = 0), 2)) AS sum_network_rx_bytes_sec,
    if(sum(node_is_unknown) = count(), null, round(sumIf(node_net_tx_sum, node_is_unknown = 0), 2)) AS sum_network_tx_bytes_sec,
    -- ◄ CHUẨN HÓA CULPRIT: NẾU CẢ RACK SẬP THÌ ẺP KEY LỖI VỀ HEARTBEAT LOSS TOÀN CỤM
    if(sum(node_is_unknown) = count(), 'rack.signal.loss', argMax(node_id, tuple(node_max_operational_severity, node_has_override_flag, node_summary_ts))) AS worst_node_id,
    if(sum(node_is_unknown) = count(), 'rack.heartbeat.loss', argMax(node_worst_metric_key, tuple(node_max_operational_severity, node_has_override_flag, node_summary_ts))) AS worst_metric_key,
    if(sum(node_is_unknown) = count(), '{}', argMax(node_worst_metric_tags_json, tuple(node_max_operational_severity, node_has_override_flag, node_summary_ts))) AS worst_metric_tags_json,
    if(sum(node_is_unknown) = count(), 0.0, argMax(node_worst_metric_value_numeric, tuple(node_max_operational_severity, node_has_override_flag, node_summary_ts))) AS worst_metric_value_numeric,
    if(sum(node_is_unknown) = count(), 'RACK_DISCONNECTED', argMax(node_worst_metric_value_text, tuple(node_max_operational_severity, node_has_override_flag, node_summary_ts))) AS worst_metric_value_text
FROM
(
    -- Bước 1: Giữ nguyên logic gom nhóm tầng Node của bạn
    SELECT
        ifNull(dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id), '') AS rack_id,
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

        maxIf(latest_value_numeric, metric_key = 'node.cpu_usage_pct') AS node_cpu_avg,
        maxIf(latest_value_numeric, metric_key = 'node.memory_used_pct') AS node_mem_avg,
        maxIf(latest_value_numeric, metric_key IN ('node.disk_used_pct', 'node.disk_used_pct_max')) AS node_disk_max,
        maxIf(latest_value_numeric, metric_key = 'node.cpu_temperature_c') AS node_temp_max,
        maxIf(latest_value_numeric, metric_key IN ('node.network_receive_bytes_per_sec', 'node.network_rx_bytes_sec')) AS node_net_rx_sum,
        maxIf(latest_value_numeric, metric_key IN ('node.network_transmit_bytes_per_sec', 'node.network_tx_bytes_sec')) AS node_net_tx_sum,

        argMax(metric_key, tuple(multiIf(live_state IN ('stale', 'unknown') AND (metric_key LIKE 'ops.%' OR positionCaseInsensitive(metric_key, 'last_seen') > 0 OR positionCaseInsensitive(metric_key, 'freshness') > 0), 3, metric_key IN ('node.cpu_usage_pct', 'node.memory_used_pct', 'node.disk_used_pct', 'node.disk_used_pct_max', 'node.cpu_temperature_c', 'node.network_utilization_pct', 'node.network_receive_bytes_per_sec', 'node.network_transmit_bytes_per_sec', 'ops.collector_last_seen_at'), 2, metric_key IN ('node.logical_cpu_count', 'node.total_memory_bytes', 'node.memory_total_bytes', 'node.total_disk_bytes', 'node.disk_total_bytes', 'node.hostname', 'node.kernel_version', 'node.os_version', 'node.platform'), 0, 1), if(severity_code = 4, -1, severity_code), override_flag, latest_ts)) AS node_worst_metric_key,
        argMax(tags_json, tuple(multiIf(live_state IN ('stale', 'unknown') AND (metric_key LIKE 'ops.%' OR positionCaseInsensitive(metric_key, 'last_seen') > 0 OR positionCaseInsensitive(metric_key, 'freshness') > 0), 3, metric_key IN ('node.cpu_usage_pct', 'node.memory_used_pct', 'node.disk_used_pct', 'node.disk_used_pct_max', 'node.cpu_temperature_c', 'node.network_utilization_pct', 'node.network_receive_bytes_per_sec', 'node.network_transmit_bytes_per_sec', 'ops.collector_last_seen_at'), 2, metric_key IN ('node.logical_cpu_count', 'node.total_memory_bytes', 'node.memory_total_bytes', 'node.total_disk_bytes', 'node.disk_total_bytes', 'node.hostname', 'node.kernel_version', 'node.os_version', 'node.platform'), 0, 1), if(severity_code = 4, -1, severity_code), override_flag, latest_ts)) AS node_worst_metric_tags_json,
        argMax(latest_value_numeric, tuple(multiIf(live_state IN ('stale', 'unknown') AND (metric_key LIKE 'ops.%' OR positionCaseInsensitive(metric_key, 'last_seen') > 0 OR positionCaseInsensitive(metric_key, 'freshness') > 0), 3, metric_key IN ('node.cpu_usage_pct', 'node.memory_used_pct', 'node.disk_used_pct', 'node.disk_used_pct_max', 'node.cpu_temperature_c', 'node.network_utilization_pct', 'node.network_receive_bytes_per_sec', 'node.network_transmit_bytes_per_sec', 'ops.collector_last_seen_at'), 2, metric_key IN ('node.logical_cpu_count', 'node.total_memory_bytes', 'node.memory_total_bytes', 'node.total_disk_bytes', 'node.disk_total_bytes', 'node.hostname', 'node.kernel_version', 'node.os_version', 'node.platform'), 0, 1), if(severity_code = 4, -1, severity_code), override_flag, latest_ts)) AS node_worst_metric_value_numeric,
        argMax(latest_value_text, tuple(multiIf(live_state IN ('stale', 'unknown') AND (metric_key LIKE 'ops.%' OR positionCaseInsensitive(metric_key, 'last_seen') > 0 OR positionCaseInsensitive(metric_key, 'freshness') > 0), 3, metric_key IN ('node.cpu_usage_pct', 'node.memory_used_pct', 'node.disk_used_pct', 'node.disk_used_pct_max', 'node.cpu_temperature_c', 'node.network_utilization_pct', 'node.network_receive_bytes_per_sec', 'node.network_transmit_bytes_per_sec', 'ops.collector_last_seen_at'), 2, metric_key IN ('node.logical_cpu_count', 'node.total_memory_bytes', 'node.memory_total_bytes', 'node.total_disk_bytes', 'node.disk_total_bytes', 'node.hostname', 'node.kernel_version', 'node.os_version', 'node.platform'), 0, 1), if(severity_code = 4, -1, severity_code), override_flag, latest_ts)) AS node_worst_metric_value_text
    FROM telemetry_db.node_current_live
    WHERE ifNull(dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id), '') != ''
    GROUP BY rack_id, node_id
) AS node_rollup
GROUP BY rack_id;


-- ==========================================================
-- TEST NHANH:
-- Các query dưới đây dùng để kiểm tra view rack_current_summary
-- sau khi init xong. Không phải thành phần của view production.
-- ==========================================================

-- Test 1:
-- Xem toàn bộ rack summary hiện tại, sắp theo mức nghiêm trọng và phạm vi ảnh hưởng
SELECT
    rack_id,
    rack_severity_code,
    worst_node_id,
    worst_metric_key,
    total_nodes,
    bad_nodes,
    stale_nodes,
    silent_dead_nodes,
    bad_node_ratio,
    is_rack_level_failure,
    has_signal_loss,
    summary_ts
FROM telemetry_db.rack_current_summary
ORDER BY
    rack_severity_code DESC,
    bad_nodes DESC,
    silent_dead_nodes DESC,
    rack_id;

-- get all rack summary
SELECT * FROM telemetry_db.rack_current_summary;

-- Test 2:
-- Kiểm tra trực tiếp culprit node và culprit metric của một rack cụ thể
SELECT
    rack_id,
    rack_severity_code,
    worst_node_id,
    worst_metric_key,
    worst_metric_tags_json,
    worst_metric_value_numeric,
    worst_metric_value_text,
    has_override_flag
FROM telemetry_db.rack_current_summary
WHERE rack_id = 'rack-a1';

-- Test 3:
-- Kiểm tra rack nào đang có mất tín hiệu (silent death / signal loss)
SELECT
    rack_id,
    total_nodes,
    stale_nodes,
    silent_dead_nodes,
    has_signal_loss,
    summary_ts
FROM telemetry_db.rack_current_summary
WHERE has_signal_loss = 1
ORDER BY
    silent_dead_nodes DESC,
    stale_nodes DESC,
    rack_id;

-- Test 4:
-- Đối chiếu node-level roll-up logic cho một rack cụ thể để debug blast radius
SELECT
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    node_id,
    maxIf(severity_code, severity_code < 4) AS node_max_operational_severity,
    max(override_flag) AS node_has_override_flag,
    max(if(severity_code >= 2 AND severity_code < 4, 1, 0)) AS node_is_bad,
    max(if(live_state IN ('stale', 'unknown'), 1, 0)) AS node_is_stale,
    max(if(live_state = 'unknown', 1, 0)) AS node_is_unknown,
    argMax(
        metric_key,
        tuple(
            multiIf(
                live_state IN ('stale', 'unknown')
                AND (
                    metric_key LIKE 'ops.%'
                    OR positionCaseInsensitive(metric_key, 'last_seen') > 0
                    OR positionCaseInsensitive(metric_key, 'freshness') > 0
                ), 3,
                metric_key IN (
                    'node.cpu_usage_pct',
                    'node.memory_used_pct',
                    'node.disk_used_pct',
                    'node.disk_used_pct_max',
                    'node.cpu_temperature_c',
                    'node.network_utilization_pct',
                    'node.network_receive_bytes_per_sec',
                    'node.network_transmit_bytes_per_sec',
                    'ops.collector_last_seen_at'
                ), 2,
                metric_key IN (
                    'node.logical_cpu_count',
                    'node.total_memory_bytes',
                    'node.memory_total_bytes',
                    'node.total_disk_bytes',
                    'node.disk_total_bytes',
                    'node.hostname',
                    'node.kernel_version',
                    'node.os_version',
                    'node.platform'
                ), 0,
                1
            ),
            if(severity_code = 4, -1, severity_code),
            override_flag,
            latest_ts
        )
    ) AS node_worst_metric_key
FROM telemetry_db.node_current_live
WHERE ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) = 'rack-a1'
GROUP BY
    rack_id,
    node_id
ORDER BY
    node_max_operational_severity DESC,
    node_has_override_flag DESC,
    node_id;
