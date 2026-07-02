-- =========================================================
-- FILE NAME: 07_v_rack_summary_history.sql
-- MUC DICH:
--   Tao view query-facing cho lich su trang thai Rack tu bang
--   rack_summary_history dang luu aggregate states.
-- TANG DU LIEU PHUC VU:
--   06_rack_serving / historical rack semantics / query-facing history
-- PHU THUOC:
--   - telemetry_db.rack_summary_history
-- DAU RA CHINH:
--   - telemetry_db.v_rack_summary_history
-- GHI CHU:
--   - View nay finalize aggregate states thanh cot co the query truc tiep.
--   - bad_node_ratio va is_rack_level_failure duoc tinh o lop serving.
--   - Lich su chi mang operational severity, khong co stale/unknown semantics.
-- =========================================================

USE telemetry_db;

-- Xoa view cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.v_rack_summary_history;

-- View finalize bang lich su Rack.
CREATE VIEW telemetry_db.v_rack_summary_history AS
SELECT
    bucket_granularity,
    bucket_start,
    rack_id,
    summary_ts,
    rack_severity_code,
    has_override_flag,
    total_nodes,
    bad_nodes,
    critical_nodes,
    warning_nodes,
    round(
        if(total_nodes = 0, 0, bad_nodes / total_nodes),
        4
    ) AS bad_node_ratio,
    if(
        total_nodes > 0 AND bad_nodes / total_nodes > 0.5,
        1,
        0
    ) AS is_rack_level_failure,
    worst_node_id,
    worst_metric_key,
    worst_metric_tags_json,
    worst_metric_value_numeric,
    worst_metric_value_text
FROM
(
    -- =====================================================
    -- Finalize toan bo aggregate states thanh mot dong hoan chinh
    -- moi rack moi bucket moi granularity.
    -- =====================================================
    SELECT
        bucket_granularity,
        bucket_start,
        rack_id,
        maxMerge(summary_ts_state) AS summary_ts,
        maxMerge(rack_severity_code_state) AS rack_severity_code,
        maxMerge(has_override_flag_state) AS has_override_flag,
        uniqExactMerge(total_nodes_state) AS total_nodes,
        uniqExactMerge(bad_nodes_state) AS bad_nodes,
        uniqExactMerge(critical_nodes_state) AS critical_nodes,
        uniqExactMerge(warning_nodes_state) AS warning_nodes,
        argMaxMerge(culprit_node_state) AS worst_node_id,
        argMaxMerge(culprit_metric_key_state) AS worst_metric_key,
        argMaxMerge(culprit_metric_tags_json_state) AS worst_metric_tags_json,
        argMaxMerge(culprit_metric_value_numeric_state) AS worst_metric_value_numeric,
        argMaxMerge(culprit_metric_value_text_state) AS worst_metric_value_text
    FROM telemetry_db.rack_summary_history
    GROUP BY
        bucket_granularity,
        bucket_start,
        rack_id
) AS rack_history_finalized;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra lich su Rack da duoc materialize dung grain,
-- severity, culprit va blast radius ma khong can tinh lai luc query.
-- =========================================================

-- Test 1:
-- Xem lich su 1m cua tat ca rack trong 1 gio gan nhat
-- SELECT
--     bucket_granularity,
--     bucket_start,
--     rack_id,
--     rack_severity_code,
--     bad_nodes,
--     total_nodes,
--     worst_node_id,
--     worst_metric_key
-- FROM telemetry_db.v_rack_summary_history
-- WHERE bucket_granularity = '1m'
--   AND bucket_start >= now() - INTERVAL 1 HOUR
-- ORDER BY bucket_start DESC, rack_id;

-- Test 2:
-- Xem lich su 5m cua mot rack cu the trong 7 ngay
-- SELECT
--     bucket_granularity,
--     bucket_start,
--     rack_id,
--     rack_severity_code,
--     has_override_flag,
--     bad_nodes,
--     critical_nodes,
--     warning_nodes,
--     worst_node_id,
--     worst_metric_key
-- FROM telemetry_db.v_rack_summary_history
-- WHERE bucket_granularity = '5m'
--   AND rack_id = 'rack-a1'
--   AND bucket_start >= now() - INTERVAL 7 DAY
-- ORDER BY bucket_start;

-- Test 3:
-- Tim cac bucket lich su co rack-level failure
-- SELECT
--     bucket_granularity,
--     bucket_start,
--     rack_id,
--     rack_severity_code,
--     bad_nodes,
--     total_nodes,
--     bad_node_ratio,
--     is_rack_level_failure
-- FROM telemetry_db.v_rack_summary_history
-- WHERE is_rack_level_failure = 1
-- ORDER BY bucket_start DESC, bad_node_ratio DESC, rack_id;
