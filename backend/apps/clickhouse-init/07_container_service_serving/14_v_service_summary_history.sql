-- =========================================================
-- FILE NAME: 14_v_service_summary_history.sql
-- MUC DICH:
--   Tao view query-facing cho lich su trang thai Service tu bang
--   service_summary_history dang luu aggregate states.
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / historical service semantics / query
-- PHU THUOC:
--   - telemetry_db.service_summary_history
-- DAU RA CHINH:
--   - telemetry_db.v_service_summary_history
-- GHI CHU:
--   - View nay finalize aggregate states thanh cot query truc tiep.
--   - Contract duoc giu gan voi service_summary_trend_1m / 5m.
--   - API co the dung mot endpoint lich su chung cho service 1m va 5m.
-- =========================================================

USE telemetry_db;

-- Xoa view cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.v_service_summary_history;

-- View finalize bang lich su Service.
CREATE VIEW telemetry_db.v_service_summary_history AS
SELECT
    bucket_granularity,
    bucket_start,
    service_id,
    service_name,
    summary_ts,
    service_severity_code,
    has_override_flag,
    service_container_count_current,
    service_running_container_count_current,
    running_container_ratio_current,
    cpu_usage_pct_sum_current,
    memory_used_bytes_sum_current,
    total_containers,
    running_containers,
    bad_containers,
    critical_containers,
    non_running_containers,
    bad_container_ratio,
    is_service_level_failure,
    worst_container_id,
    worst_metric_key,
    worst_metric_tags_json,
    worst_metric_value_numeric,
    worst_metric_value_text
FROM
(
    -- =====================================================
    -- Finalize tat ca aggregate states thanh 1 dong hoan chinh
    -- cho moi service moi bucket moi granularity.
    -- =====================================================
    SELECT
        bucket_granularity,
        bucket_start,
        service_id,
        argMaxMerge(service_name_state) AS service_name,
        maxMerge(summary_ts_state) AS summary_ts,
        argMaxMerge(service_severity_code_state) AS service_severity_code,
        argMaxMerge(has_override_flag_state) AS has_override_flag,
        argMaxMerge(service_container_count_current_state) AS service_container_count_current,
        argMaxMerge(service_running_container_count_current_state) AS service_running_container_count_current,
        argMaxMerge(running_container_ratio_current_state) AS running_container_ratio_current,
        argMaxMerge(cpu_usage_pct_sum_current_state) AS cpu_usage_pct_sum_current,
        argMaxMerge(memory_used_bytes_sum_current_state) AS memory_used_bytes_sum_current,
        argMaxMerge(total_containers_state) AS total_containers,
        argMaxMerge(running_containers_state) AS running_containers,
        argMaxMerge(bad_containers_state) AS bad_containers,
        argMaxMerge(critical_containers_state) AS critical_containers,
        argMaxMerge(non_running_containers_state) AS non_running_containers,
        argMaxMerge(bad_container_ratio_state) AS bad_container_ratio,
        argMaxMerge(is_service_level_failure_state) AS is_service_level_failure,
        argMaxMerge(culprit_container_state) AS worst_container_id,
        argMaxMerge(culprit_metric_key_state) AS worst_metric_key,
        argMaxMerge(culprit_metric_tags_json_state) AS worst_metric_tags_json,
        argMaxMerge(culprit_metric_value_numeric_state) AS worst_metric_value_numeric,
        argMaxMerge(culprit_metric_value_text_state) AS worst_metric_value_text
    FROM telemetry_db.service_summary_history
    GROUP BY
        bucket_granularity,
        bucket_start,
        service_id
) AS service_history_finalized;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra lich su service da duoc materialize dung grain,
-- severity, cluster-state va culprit ma khong can query-time roll-up.
-- =========================================================

-- Test 1:
-- Xem lich su 1m cua tat ca service trong 1 gio gan nhat
-- SELECT
--     bucket_granularity,
--     bucket_start,
--     service_name,
--     service_severity_code,
--     bad_containers,
--     total_containers,
--     worst_container_id,
--     worst_metric_key
-- FROM telemetry_db.v_service_summary_history
-- WHERE bucket_granularity = '1m'
--   AND bucket_start >= now() - INTERVAL 1 HOUR
-- ORDER BY bucket_start DESC, service_name;

-- Test 2:
-- Xem lich su 5m cua mot service cu the trong 7 ngay
-- SELECT
--     bucket_granularity,
--     bucket_start,
--     service_name,
--     service_severity_code,
--     service_running_container_count_current,
--     total_containers,
--     bad_container_ratio,
--     worst_container_id,
--     worst_metric_key
-- FROM telemetry_db.v_service_summary_history
-- WHERE bucket_granularity = '5m'
--   AND service_id = 'svc-auth'
--   AND bucket_start >= now() - INTERVAL 7 DAY
-- ORDER BY bucket_start;

-- Test 3:
-- Tim cac bucket lich su co service-level failure
-- SELECT
--     bucket_granularity,
--     bucket_start,
--     service_name,
--     service_severity_code,
--     service_running_container_count_current,
--     total_containers,
--     bad_container_ratio,
--     is_service_level_failure
-- FROM telemetry_db.v_service_summary_history
-- WHERE is_service_level_failure = 1
-- ORDER BY bucket_start DESC, bad_container_ratio DESC, service_name;
