-- =============================================
-- FILE NAME: 01_rack_current_summary.sql
-- MỤC ĐÍCH:
--   Tạo view tổng hợp trạng thái hiện tại của Rack từ node_current_live.
--   View này phục vụ operator dashboard theo hướng ưu tiên vận hành thực chiến:
--   worst-case wins, culprit identification, blast radius, silent death.
-- TẦNG DỮ LIỆU PHỤC VỤ:
--   06_rack_serving / current operational read model for rack
-- =============================================

USE telemetry_db;

-- Xóa view cũ nếu đã tồn tại để đảm bảo init chạy idempotent ở mức DDL
DROP VIEW IF EXISTS telemetry_db.rack_current_summary;

-- Tạo view tổng hợp Rack current-state từ node_current_live
CREATE VIEW telemetry_db.rack_current_summary AS
-- Bước 2:
-- Roll-up từ node-level thành rack-level để phục vụ dashboard operator-first
SELECT
    rack_id,
    max(node_summary_ts) AS summary_ts,
    -- Worst-case wins ở cấp rack:
    -- severity chính của rack là severity vận hành cao nhất của các node con
    max(node_max_operational_severity) AS rack_severity_code,
    -- Cờ override toàn rack nếu có ít nhất một node có override
    max(node_has_override_flag) AS has_override_flag,
    -- Blast radius
    count() AS total_nodes,
    sum(node_is_bad) AS bad_nodes,
    sum(node_is_critical) AS critical_nodes,
    sum(node_is_warning) AS warning_nodes,
    sum(node_is_stale) AS stale_nodes,
    -- Silent death / signal loss
    sum(node_is_unknown) AS silent_dead_nodes,
    -- Tỷ lệ node bị ảnh hưởng
    round(sum(node_is_bad) / count(), 4) AS bad_node_ratio,
    -- Nếu hơn 50% node trong rack đang bad thì coi là rack-level failure
    if(count() > 0 AND sum(node_is_bad) / count() > 0.5, 1, 0) AS is_rack_level_failure,
    -- Cờ phát hiện mất tín hiệu trong rack
    if(sum(node_is_unknown) > 0, 1, 0) AS has_signal_loss,
    -- Chọn node culprit của rack:
    -- ưu tiên node có severity cao nhất, sau đó override, sau đó timestamp mới hơn
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
    -- Bước 1:
    -- Gom từ metric-series level của node_current_live thành 1 dòng mỗi node trong rack.
    -- Mục tiêu là tránh đếm lặp node khi một node có nhiều metric dòng.
    SELECT
        ifNull(
            dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
            ''
        ) AS rack_id,
        node_id,

        max(latest_ts) AS node_summary_ts,
        -- Severity vận hành chính của node: chỉ ưu tiên 0..3
        maxIf(severity_code, severity_code < 4) AS node_max_operational_severity,
        -- Severity đầy đủ của node: giữ lại để đọc stale/unknown nếu cần
        max(severity_code) AS node_max_any_severity,
        -- Node có metric nào đủ mạnh để override không
        max(override_flag) AS node_has_override_flag,
        -- Cờ node-level để tính blast radius
        max(if(severity_code >= 2 AND severity_code < 4, 1, 0)) AS node_is_bad,
        max(if(severity_code = 3, 1, 0)) AS node_is_critical,
        max(if(severity_code = 2, 1, 0)) AS node_is_warning,
        max(if(live_state IN ('stale', 'unknown'), 1, 0)) AS node_is_stale,
        max(if(live_state = 'unknown', 1, 0)) AS node_is_unknown,
        -- Chọn metric culprit của node:
        -- ưu tiên severity vận hành cao hơn, sau đó override, sau đó timestamp mới hơn
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
