-- =========================================================
-- FILE NAME: 09_service_summary_trend_1m.sql
-- MUC DICH:
--   Tao view xu huong ngan han 1 phut cho Service theo mo hinh
--   hybrid:
--   - cluster-state native tu aggregate 1m cua service.*
--   - blast radius va culprit tu container_summary_trend_1m
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / short-term trend / service 1m trend
-- PHU THUOC:
--   - telemetry_db.v_agg_1m_by_scope_metric
--   - telemetry_db.container_summary_trend_1m
--   - telemetry_db.dict_metric_profile
-- DAU RA CHINH:
--   - telemetry_db.service_summary_trend_1m
-- GHI CHU:
--   - Trend 1m khong suy dien stale/unknown theo current-time.
--   - Service severity bucket la max giua service-native severity
--     va worst child container severity trong cung bucket.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.service_summary_trend_1m;

CREATE VIEW telemetry_db.service_summary_trend_1m AS
WITH
all_service_bucket_ids AS (
    SELECT
        bucket_start,
        service_id
    FROM
    (
        SELECT
            bucket_start,
            scope_id AS service_id
        FROM telemetry_db.v_agg_1m_by_scope_metric
        WHERE scope_type = 'service'
        GROUP BY
            bucket_start,
            service_id

        UNION DISTINCT
        SELECT
            bucket_start,
            service_name AS service_id
        FROM telemetry_db.container_summary_trend_1m
        WHERE service_name != ''
        GROUP BY
            bucket_start,
            service_id
    )
),
service_metric_rollup AS (
    SELECT
        service_id,
        bucket_start,

        argMax(service_name, last_ts) AS service_name,
        max(last_ts) AS service_summary_ts,

        max(severity_code) AS service_max_severity_code,
        max(override_flag) AS service_has_override_flag,

        countIf(severity_code = 3) AS service_critical_metric_count,
        countIf(severity_code = 2) AS service_warning_metric_count,

        maxIf(value_last, metric_key = 'service.container_count') AS service_container_count_current,
        maxIf(value_last, metric_key = 'service.running_container_count') AS service_running_container_count_current,
        maxIf(running_container_ratio, metric_key = 'service.running_container_count') AS running_container_ratio_current,

        sumIf(value_last, metric_key = 'service.cpu_usage_pct_sum') AS cpu_usage_pct_sum_current,
        sumIf(value_last, metric_key = 'service.memory_used_bytes_sum') AS memory_used_bytes_sum_current,

        argMax(metric_key, tuple(severity_code, override_flag, last_ts)) AS service_worst_metric_key,
        argMax(tags_json, tuple(severity_code, override_flag, last_ts)) AS service_worst_metric_tags_json,
        argMax(value_last, tuple(severity_code, override_flag, last_ts)) AS service_worst_metric_numeric_value,
        argMax(text_last, tuple(severity_code, override_flag, last_ts)) AS service_worst_metric_text_value
    FROM
    (
        SELECT
            base.*,

            if(
                service_container_count > 0,
                service_running_container_count / service_container_count,
                nan
            ) AS running_container_ratio,

            multiIf(
                metric_key = 'service.running_container_count'
                    AND service_running_container_count = 0, 3,

                metric_key = 'service.running_container_count'
                    AND service_container_count > 0
                    AND service_running_container_count < service_container_count, 2,

                critical_match, 3,
                warning_match, 2,
                0
            ) AS severity_code,

            multiIf(
                metric_key = 'service.running_container_count'
                    AND service_running_container_count = 0, 1,

                critical_match AND override_on_critical_cfg = 1, 1,
                0
            ) AS override_flag

        FROM
        (
            SELECT
                metric_bucket.*,

                dictGetUInt8OrDefault(
                    'dict_metric_profile',
                    'is_operational_metric',
                    tuple('service', metric_key),
                    0
                ) AS is_operational_metric_cfg,

                dictGetStringOrDefault(
                    'dict_metric_profile',
                    'warning_operator',
                    tuple('service', metric_key),
                    ''
                ) AS warning_operator_cfg,

                ifNull(
                    dictGetOrNull(
                        'dict_metric_profile',
                        'warning_threshold_numeric',
                        tuple('service', metric_key)
                    ),
                    nan
                ) AS warning_threshold_numeric_cfg,

                dictGetStringOrDefault(
                    'dict_metric_profile',
                    'critical_operator',
                    tuple('service', metric_key),
                    ''
                ) AS critical_operator_cfg,

                ifNull(
                    dictGetOrNull(
                        'dict_metric_profile',
                        'critical_threshold_numeric',
                        tuple('service', metric_key)
                    ),
                    nan
                ) AS critical_threshold_numeric_cfg,

                dictGetOrDefault(
                    'dict_metric_profile',
                    'warning_text_values',
                    tuple('service', metric_key),
                    emptyArrayString()
                ) AS warning_text_values_cfg,

                dictGetOrDefault(
                    'dict_metric_profile',
                    'critical_text_values',
                    tuple('service', metric_key),
                    emptyArrayString()
                ) AS critical_text_values_cfg,

                dictGetUInt8OrDefault(
                    'dict_metric_profile',
                    'override_on_critical',
                    tuple('service', metric_key),
                    0
                ) AS override_on_critical_cfg,

                lower(text_last) AS text_last_normalized,

                multiIf(
                    warning_operator_cfg = '>'  AND isFinite(warning_threshold_numeric_cfg), value_last >  warning_threshold_numeric_cfg,
                    warning_operator_cfg = '>=' AND isFinite(warning_threshold_numeric_cfg), value_last >= warning_threshold_numeric_cfg,
                    warning_operator_cfg = '<'  AND isFinite(warning_threshold_numeric_cfg), value_last <  warning_threshold_numeric_cfg,
                    warning_operator_cfg = '<=' AND isFinite(warning_threshold_numeric_cfg), value_last <= warning_threshold_numeric_cfg,
                    warning_operator_cfg = '='  AND isFinite(warning_threshold_numeric_cfg), value_last =  warning_threshold_numeric_cfg,
                    warning_operator_cfg = '==' AND isFinite(warning_threshold_numeric_cfg), value_last =  warning_threshold_numeric_cfg,
                    0
                ) AS warning_numeric_match,

                multiIf(
                    critical_operator_cfg = '>'  AND isFinite(critical_threshold_numeric_cfg), value_last >  critical_threshold_numeric_cfg,
                    critical_operator_cfg = '>=' AND isFinite(critical_threshold_numeric_cfg), value_last >= critical_threshold_numeric_cfg,
                    critical_operator_cfg = '<'  AND isFinite(critical_threshold_numeric_cfg), value_last <  critical_threshold_numeric_cfg,
                    critical_operator_cfg = '<=' AND isFinite(critical_threshold_numeric_cfg), value_last <= critical_threshold_numeric_cfg,
                    critical_operator_cfg = '='  AND isFinite(critical_threshold_numeric_cfg), value_last =  critical_threshold_numeric_cfg,
                    critical_operator_cfg = '==' AND isFinite(critical_threshold_numeric_cfg), value_last =  critical_threshold_numeric_cfg,
                    0
                ) AS critical_numeric_match,

                has(warning_text_values_cfg, text_last_normalized) AS warning_text_match,
                has(critical_text_values_cfg, text_last_normalized) AS critical_text_match,

                (warning_numeric_match OR warning_text_match) AS warning_match,
                (critical_numeric_match OR critical_text_match) AS critical_match

            FROM
            (
                SELECT
                    src.bucket_start,
                    src.scope_id AS service_id,
                    snap.service_name,
                    snap.service_container_count,
                    snap.service_running_container_count,

                    src.metric_key,
                    src.tags_json,
                    src.last_ts,
                    src.value_last,
                    src.text_last
                FROM telemetry_db.v_agg_1m_by_scope_metric AS src
                LEFT JOIN
                (
                    SELECT
                        bucket_start,
                        scope_id AS service_id,

                        coalesce(
                            nullIf(argMax(JSONExtractString(tags_json, 'service_name'), last_ts), ''),
                            service_id
                        ) AS service_name,

                        argMaxIf(value_last, last_ts, metric_key = 'service.container_count') AS service_container_count,
                        argMaxIf(value_last, last_ts, metric_key = 'service.running_container_count') AS service_running_container_count
                    FROM telemetry_db.v_agg_1m_by_scope_metric
                    WHERE scope_type = 'service'
                    GROUP BY
                        bucket_start,
                        service_id
                ) AS snap
                ON src.bucket_start = snap.bucket_start
               AND src.scope_id = snap.service_id
                WHERE src.scope_type = 'service'
            ) AS metric_bucket
        ) AS base
        WHERE is_operational_metric_cfg = 1
    ) AS service_metric_bucket
    GROUP BY
        service_id,
        bucket_start
),
container_rollup AS (
    SELECT
        bucket_start,
        service_name AS service_id,

        max(summary_ts) AS container_summary_ts,
        count() AS total_containers,
        sum(if(lower(container_state) = 'running', 1, 0)) AS running_containers,
        sum(if(container_severity_code >= 2, 1, 0)) AS bad_containers,
        sum(if(container_severity_code = 3, 1, 0)) AS critical_containers,
        sum(if(lower(container_state) != 'running', 1, 0)) AS non_running_containers,

        max(container_severity_code) AS container_max_severity_code,
        max(has_override_flag) AS container_has_override_flag,

        argMax(
            container_id,
            tuple(container_severity_code, has_override_flag, summary_ts)
        ) AS worst_container_id,
        argMax(
            worst_metric_key,
            tuple(container_severity_code, has_override_flag, summary_ts)
        ) AS container_worst_metric_key,
        argMax(
            worst_metric_tags_json,
            tuple(container_severity_code, has_override_flag, summary_ts)
        ) AS container_worst_metric_tags_json,
        argMax(
            worst_metric_value_numeric,
            tuple(container_severity_code, has_override_flag, summary_ts)
        ) AS container_worst_metric_numeric_value,
        argMax(
            worst_metric_value_text,
            tuple(container_severity_code, has_override_flag, summary_ts)
        ) AS container_worst_metric_text_value
    FROM telemetry_db.container_summary_trend_1m
    WHERE service_name != ''
    GROUP BY
        bucket_start,
        service_name
)
SELECT
    s.bucket_start AS bucket_start,
    s.service_id AS service_id,
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

FROM all_service_bucket_ids s
LEFT JOIN service_metric_rollup sr
    ON s.bucket_start = sr.bucket_start
   AND s.service_id = sr.service_id
LEFT JOIN container_rollup cr
    ON s.bucket_start = cr.bucket_start
   AND s.service_id = cr.service_id;

-- =========================================================
-- TEST GOI Y
-- =========================================================

-- SELECT *
-- FROM telemetry_db.service_summary_trend_1m
-- WHERE bucket_start >= now() - INTERVAL 1 HOUR
-- ORDER BY bucket_start, service_name;
