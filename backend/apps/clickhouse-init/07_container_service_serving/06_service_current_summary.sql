-- =========================================================
-- FILE NAME: 06_service_current_summary.sql
-- MUC DICH:
--   Tao view tong hop trang thai hien tai cua Service theo mo hinh
--   hybrid:
--   - cluster-state native tu service_current_live
--   - blast radius va culprit tu container_current_summary
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / current summary / service hybrid read model
-- PHU THUOC:
--   - telemetry_db.service_current_live
--   - telemetry_db.container_current_summary
--   - 07_container_service_serving/05_service_current_live.sql
--   - 07_container_service_serving/03_container_current_summary.sql
-- DAU RA CHINH:
--   - telemetry_db.service_current_summary
-- GHI CHU:
--   - Service severity cuoi cung la max giua:
--       + cluster-state severity tu service.*
--       + worst child container severity
--   - Worst-case wins va blast radius duoc uu tien cho operator.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.service_current_summary;

CREATE VIEW telemetry_db.service_current_summary AS
WITH
all_service_ids AS (
    -- Tap key hop nhat de khong bo sot service chi co service-native
    -- metrics hoac service chi xuat hien tu child container summary.
    SELECT service_id
    FROM telemetry_db.service_current_live
    GROUP BY service_id

    UNION DISTINCT
    SELECT service_name AS service_id
    FROM telemetry_db.container_current_summary
    WHERE service_name != ''
    GROUP BY service_name
),
service_metric_rollup AS (
    -- Gom service_current_live thanh 1 dong service-native moi service.
    SELECT
        service_id,
        argMax(service_name, latest_ts) AS service_name,
        max(latest_ts) AS service_summary_ts,

        max(severity_code) AS service_max_severity_code,
        max(override_flag) AS service_has_override_flag,

        max(is_stale) AS service_is_any_stale,
        countIf(is_stale = 1) AS service_stale_metric_count,
        countIf(severity_code = 3) AS service_critical_metric_count,
        countIf(severity_code = 2) AS service_warning_metric_count,

        maxIf(latest_value_numeric, metric_key = 'service.container_count') AS service_container_count_current,
        maxIf(latest_value_numeric, metric_key = 'service.running_container_count') AS service_running_container_count_current,
        maxIf(running_container_ratio, metric_key = 'service.running_container_count') AS running_container_ratio_current,

        sumIf(latest_value_numeric, metric_key = 'service.cpu_usage_pct_sum') AS cpu_usage_pct_sum_current,
        sumIf(latest_value_numeric, metric_key = 'service.memory_used_bytes_sum') AS memory_used_bytes_sum_current,

        argMax(metric_key, tuple(severity_code, override_flag, latest_ts)) AS service_worst_metric_key,
        argMax(tags_json, tuple(severity_code, override_flag, latest_ts)) AS service_worst_metric_tags_json,
        argMax(latest_value_numeric, tuple(severity_code, override_flag, latest_ts)) AS service_worst_metric_numeric_value,
        argMax(latest_value_text, tuple(severity_code, override_flag, latest_ts)) AS service_worst_metric_text_value
    FROM telemetry_db.service_current_live
    GROUP BY service_id
),
container_rollup AS (
    -- Roll-up child container summary thanh service-level blast radius.
    SELECT
        service_name AS service_id,
        max(summary_ts) AS container_summary_ts,

        count() AS total_containers,
        sum(if(lower(container_state) = 'running', 1, 0)) AS running_containers,
        sum(if(max_severity_code >= 2, 1, 0)) AS bad_containers,
        sum(if(max_severity_code = 3, 1, 0)) AS critical_containers,
        sum(if(lower(container_state) != 'running', 1, 0)) AS non_running_containers,
        sum(if(is_any_stale = 1, 1, 0)) AS stale_containers,

        max(max_severity_code) AS container_max_severity_code,
        max(has_override_flag) AS container_has_override_flag,

        argMax(
            container_id,
            tuple(
                max_severity_code,
                has_override_flag,
                summary_ts
            )
        ) AS worst_container_id,

        argMax(
            worst_metric_key,
            tuple(
                max_severity_code,
                has_override_flag,
                summary_ts
            )
        ) AS container_worst_metric_key,

        argMax(
            worst_metric_tags_json,
            tuple(
                max_severity_code,
                has_override_flag,
                summary_ts
            )
        ) AS container_worst_metric_tags_json,

        argMax(
            worst_metric_numeric_value,
            tuple(
                max_severity_code,
                has_override_flag,
                summary_ts
            )
        ) AS container_worst_metric_numeric_value,

        argMax(
            worst_metric_text_value,
            tuple(
                max_severity_code,
                has_override_flag,
                summary_ts
            )
        ) AS container_worst_metric_text_value
    FROM telemetry_db.container_current_summary
    WHERE service_name != ''
    GROUP BY service_name
)
SELECT
    s.service_id,
    coalesce(nullIf(sr.service_name, ''), s.service_id) AS service_name,

    greatest(
        ifNull(sr.service_summary_ts, toDateTime(0)),
        ifNull(cr.container_summary_ts, toDateTime(0))
    ) AS summary_ts,

    greatest(
        ifNull(sr.service_max_severity_code, 0),
        ifNull(cr.container_max_severity_code, 0)
    ) AS service_severity_code,

    greatest(
        ifNull(sr.service_has_override_flag, 0),
        ifNull(cr.container_has_override_flag, 0)
    ) AS has_override_flag,

    ifNull(sr.service_is_any_stale, 0) AS is_any_stale,
    ifNull(sr.service_stale_metric_count, 0) AS stale_metric_count,
    ifNull(sr.service_critical_metric_count, 0) AS service_critical_metric_count,
    ifNull(sr.service_warning_metric_count, 0) AS service_warning_metric_count,

    ifNull(sr.service_container_count_current, 0) AS service_container_count_current,
    ifNull(sr.service_running_container_count_current, 0) AS service_running_container_count_current,
    sr.running_container_ratio_current,

    ifNull(sr.cpu_usage_pct_sum_current, 0) AS cpu_usage_pct_sum_current,
    ifNull(sr.memory_used_bytes_sum_current, 0) AS memory_used_bytes_sum_current,

    ifNull(cr.total_containers, 0) AS total_containers,
    ifNull(cr.running_containers, 0) AS running_containers,
    ifNull(cr.bad_containers, 0) AS bad_containers,
    ifNull(cr.critical_containers, 0) AS critical_containers,
    ifNull(cr.non_running_containers, 0) AS non_running_containers,
    ifNull(cr.stale_containers, 0) AS stale_containers,

    round(
        if(
            ifNull(cr.total_containers, 0) = 0,
            0,
            ifNull(cr.bad_containers, 0) / cr.total_containers
        ),
        4
    ) AS bad_container_ratio,

    if(
        ifNull(sr.service_running_container_count_current, 0) = 0
        OR (
            ifNull(cr.total_containers, 0) > 0
            AND ifNull(cr.bad_containers, 0) / cr.total_containers > 0.5
        ),
        1,
        0
    ) AS is_service_level_failure,

    if(
        tuple(
            ifNull(cr.container_max_severity_code, 0),
            ifNull(cr.container_has_override_flag, 0),
            ifNull(cr.container_summary_ts, toDateTime(0))
        ) >= tuple(
            ifNull(sr.service_max_severity_code, 0),
            ifNull(sr.service_has_override_flag, 0),
            ifNull(sr.service_summary_ts, toDateTime(0))
        ),
        ifNull(cr.worst_container_id, ''),
        ''
    ) AS worst_container_id,

    if(
        tuple(
            ifNull(cr.container_max_severity_code, 0),
            ifNull(cr.container_has_override_flag, 0),
            ifNull(cr.container_summary_ts, toDateTime(0))
        ) >= tuple(
            ifNull(sr.service_max_severity_code, 0),
            ifNull(sr.service_has_override_flag, 0),
            ifNull(sr.service_summary_ts, toDateTime(0))
        ),
        ifNull(cr.container_worst_metric_key, ''),
        ifNull(sr.service_worst_metric_key, '')
    ) AS worst_metric_key,

    if(
        tuple(
            ifNull(cr.container_max_severity_code, 0),
            ifNull(cr.container_has_override_flag, 0),
            ifNull(cr.container_summary_ts, toDateTime(0))
        ) >= tuple(
            ifNull(sr.service_max_severity_code, 0),
            ifNull(sr.service_has_override_flag, 0),
            ifNull(sr.service_summary_ts, toDateTime(0))
        ),
        ifNull(cr.container_worst_metric_tags_json, ''),
        ifNull(sr.service_worst_metric_tags_json, '')
    ) AS worst_metric_tags_json,

    if(
        tuple(
            ifNull(cr.container_max_severity_code, 0),
            ifNull(cr.container_has_override_flag, 0),
            ifNull(cr.container_summary_ts, toDateTime(0))
        ) >= tuple(
            ifNull(sr.service_max_severity_code, 0),
            ifNull(sr.service_has_override_flag, 0),
            ifNull(sr.service_summary_ts, toDateTime(0))
        ),
        ifNull(cr.container_worst_metric_numeric_value, 0),
        ifNull(sr.service_worst_metric_numeric_value, 0)
    ) AS worst_metric_value_numeric,

    if(
        tuple(
            ifNull(cr.container_max_severity_code, 0),
            ifNull(cr.container_has_override_flag, 0),
            ifNull(cr.container_summary_ts, toDateTime(0))
        ) >= tuple(
            ifNull(sr.service_max_severity_code, 0),
            ifNull(sr.service_has_override_flag, 0),
            ifNull(sr.service_summary_ts, toDateTime(0))
        ),
        ifNull(cr.container_worst_metric_text_value, ''),
        ifNull(sr.service_worst_metric_text_value, '')
    ) AS worst_metric_value_text

FROM all_service_ids s
LEFT JOIN service_metric_rollup sr
    ON s.service_id = sr.service_id
LEFT JOIN container_rollup cr
    ON s.service_id = cr.service_id;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra service hybrid summary da hop nhat dung
-- cluster-state native va blast radius / culprit tu container.
-- =========================================================

-- Test 1:
-- Xem toan bo service summary hien tai
-- SELECT *
-- FROM telemetry_db.service_current_summary
-- ORDER BY service_severity_code DESC, bad_containers DESC, service_name;

-- Test 2:
-- Tim cac service dang down/degraded
-- SELECT
--     service_id,
--     service_name,
--     service_severity_code,
--     service_container_count_current,
--     service_running_container_count_current,
--     total_containers,
--     running_containers,
--     bad_containers,
--     critical_containers,
--     non_running_containers,
--     worst_container_id,
--     worst_metric_key
-- FROM telemetry_db.service_current_summary
-- WHERE service_severity_code >= 2
-- ORDER BY service_severity_code DESC, bad_containers DESC, service_name;

-- Test 3:
-- Kiem tra service-level failure theo blast radius
-- SELECT
--     service_id,
--     service_name,
--     total_containers,
--     bad_containers,
--     bad_container_ratio,
--     is_service_level_failure,
--     summary_ts
-- FROM telemetry_db.service_current_summary
-- WHERE is_service_level_failure = 1
-- ORDER BY bad_container_ratio DESC, service_name;
