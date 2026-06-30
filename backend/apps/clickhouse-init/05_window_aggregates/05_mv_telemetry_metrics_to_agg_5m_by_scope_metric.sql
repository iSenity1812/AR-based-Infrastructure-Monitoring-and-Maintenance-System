-- =========================================================
-- FILE NAME: 05_mv_telemetry_metrics_to_agg_5m_by_scope_metric.sql
-- MUC DICH:
--   Materialize telemetry_metrics thanh bucket 5 phut voi
--   semantic va severity summary theo policy dictionary.
-- TANG DU LIEU PHUC VU:
--   05_window_aggregates / mid-term trend / 5m bucket
-- PHU THUOC:
--   - telemetry_db.telemetry_metrics
--   - telemetry_db.agg_5m_by_scope_metric
--   - telemetry_db.dict_metric_profile
--   - 03_reference_policy/01_metric_profile.sql
-- DAU RA CHINH:
--   - telemetry_db.mv_telemetry_metrics_to_agg_5m_by_scope_metric
-- GHI CHU:
--   Pattern giong 1m nhung bucket la 5 phut, phuc vu chart dai hon
--   va xu huong on dinh hon.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.mv_telemetry_metrics_to_agg_5m_by_scope_metric;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_telemetry_metrics_to_agg_5m_by_scope_metric
TO telemetry_db.agg_5m_by_scope_metric
AS
WITH
    toStartOfInterval(metric_timestamp, INTERVAL 5 MINUTE) AS bucket_start,

    toJSONString(tags) AS tags_json,

    cityHash64(
        scope_type,
        scope_id,
        metric_key,
        toJSONString(tags)
    ) AS series_key,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'semantic_class',
        tuple(scope_type, metric_key),
        'inventory'
    ) AS semantic_class,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'preferred_numeric_field',
        tuple(scope_type, metric_key),
        ''
    ) AS preferred_numeric_field_cfg,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'warning_operator',
        tuple(scope_type, metric_key),
        ''
    ) AS warning_operator_cfg,

    dictGetFloat64OrDefault(
        'dict_metric_profile',
        'warning_threshold_numeric',
        tuple(scope_type, metric_key),
        nan
    ) AS warning_threshold_numeric_cfg,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'critical_operator',
        tuple(scope_type, metric_key),
        ''
    ) AS critical_operator_cfg,

    dictGetFloat64OrDefault(
        'dict_metric_profile',
        'critical_threshold_numeric',
        tuple(scope_type, metric_key),
        nan
    ) AS critical_threshold_numeric_cfg,

    dictGetOrDefault(
        'dict_metric_profile',
        'warning_text_values',
        tuple(scope_type, metric_key),
        emptyArrayString()
    ) AS warning_text_values_cfg,

    dictGetOrDefault(
        'dict_metric_profile',
        'critical_text_values',
        tuple(scope_type, metric_key),
        emptyArrayString()
    ) AS critical_text_values_cfg,

    lower(metric_value_text) AS metric_value_text_normalized,

    if(preferred_numeric_field_cfg != '', 1, 0) AS is_numeric_metric,

    multiIf(
        warning_operator_cfg = '>'  AND isFinite(warning_threshold_numeric_cfg), metric_value_numeric >  warning_threshold_numeric_cfg,
        warning_operator_cfg = '>=' AND isFinite(warning_threshold_numeric_cfg), metric_value_numeric >= warning_threshold_numeric_cfg,
        warning_operator_cfg = '<'  AND isFinite(warning_threshold_numeric_cfg), metric_value_numeric <  warning_threshold_numeric_cfg,
        warning_operator_cfg = '<=' AND isFinite(warning_threshold_numeric_cfg), metric_value_numeric <= warning_threshold_numeric_cfg,
        warning_operator_cfg = '='  AND isFinite(warning_threshold_numeric_cfg), metric_value_numeric =  warning_threshold_numeric_cfg,
        warning_operator_cfg = '==' AND isFinite(warning_threshold_numeric_cfg), metric_value_numeric =  warning_threshold_numeric_cfg,
        0
    ) AS warning_numeric_match,

    multiIf(
        critical_operator_cfg = '>'  AND isFinite(critical_threshold_numeric_cfg), metric_value_numeric >  critical_threshold_numeric_cfg,
        critical_operator_cfg = '>=' AND isFinite(critical_threshold_numeric_cfg), metric_value_numeric >= critical_threshold_numeric_cfg,
        critical_operator_cfg = '<'  AND isFinite(critical_threshold_numeric_cfg), metric_value_numeric <  critical_threshold_numeric_cfg,
        critical_operator_cfg = '<=' AND isFinite(critical_threshold_numeric_cfg), metric_value_numeric <= critical_threshold_numeric_cfg,
        critical_operator_cfg = '='  AND isFinite(critical_threshold_numeric_cfg), metric_value_numeric =  critical_threshold_numeric_cfg,
        critical_operator_cfg = '==' AND isFinite(critical_threshold_numeric_cfg), metric_value_numeric =  critical_threshold_numeric_cfg,
        0
    ) AS critical_numeric_match,

    has(warning_text_values_cfg, metric_value_text_normalized) AS warning_text_match,
    has(critical_text_values_cfg, metric_value_text_normalized) AS critical_text_match,

    (warning_numeric_match OR warning_text_match) AS warning_match,
    (critical_numeric_match OR critical_text_match) AS critical_match,

    multiIf(
        critical_match, 3,
        warning_match, 2,
        0
    ) AS severity_code

SELECT
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    toUInt64(series_key) AS series_key,
    tags_json,
    semantic_class,
    toUInt8(is_numeric_metric) AS is_numeric_metric,

    countState() AS sample_count_state,
    minState(metric_timestamp) AS first_ts_state,
    maxState(metric_timestamp) AS last_ts_state,

    minState(metric_value_numeric) AS value_min_state,
    maxState(metric_value_numeric) AS value_max_state,
    avgState(metric_value_numeric) AS value_avg_state,
    sumState(metric_value_numeric) AS value_sum_state,
    quantileTDigestState(0.95)(metric_value_numeric) AS value_p95_state,
    argMaxState(metric_value_numeric, metric_timestamp) AS value_last_state,

    argMaxState(metric_value_text, metric_timestamp) AS text_last_state,

    sumState(toUInt64(severity_code = 2)) AS warning_sample_count_state,
    sumState(toUInt64(severity_code = 3)) AS critical_sample_count_state,
    sumState(toUInt64(severity_code >= 2)) AS bad_sample_count_state,
    maxState(toUInt8(severity_code)) AS max_severity_code_state

FROM telemetry_db.telemetry_metrics
GROUP BY
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric;
