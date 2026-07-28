-- =========================================================
-- FILE NAME: 12_mv_agg_1m_to_service_summary_history.sql
-- MUC DICH:
--   Materialize service_summary_trend_1m vao bang service_summary_history
--   de backend co the query lich su service 1 phut truc tiep.
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / historical service semantics / 1m
-- PHU THUOC:
--   - telemetry_db.agg_1m_by_scope_metric
--   - telemetry_db.service_summary_trend_1m
--   - telemetry_db.service_summary_history
-- DAU RA CHINH:
--   - telemetry_db.mv_agg_1m_to_service_summary_history
-- GHI CHU:
--   - MV nay dung agg_1m_by_scope_metric lam trigger source.
--   - changed_buckets giup chi materialize cac bucket 1m bi tac dong.
--   - Gia tri duoc luu theo snapshot moi nhat cua service trend view.
-- =========================================================

USE telemetry_db;

-- Xoa MV cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.mv_agg_1m_to_service_summary_history;

-- MV day du lieu 1m vao bang service_summary_history.
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_agg_1m_to_service_summary_history
TO telemetry_db.service_summary_history
AS
WITH changed_buckets AS
(
    -- Bucket nao trong aggregate 1m duoc cap nhat thi can re-materialize.
    SELECT DISTINCT bucket_start
    FROM telemetry_db.agg_1m_by_scope_metric
    WHERE scope_type IN ('container', 'service')
)
SELECT
    '1m' AS bucket_granularity,
    src.bucket_start,
    src.service_id,

    argMaxState(src.service_name, src.summary_ts) AS service_name_state,
    maxState(src.summary_ts) AS summary_ts_state,
    argMaxState(toUInt8(src.service_severity_code), src.summary_ts) AS service_severity_code_state,
    argMaxState(toUInt8(src.has_override_flag), src.summary_ts) AS has_override_flag_state,

    argMaxState(toFloat64(src.service_container_count_current), src.summary_ts) AS service_container_count_current_state,
    argMaxState(toFloat64(src.service_running_container_count_current), src.summary_ts) AS service_running_container_count_current_state,
    argMaxState(toFloat64(ifNull(src.running_container_ratio_current, 0)), src.summary_ts) AS running_container_ratio_current_state,
    argMaxState(toFloat64(src.cpu_usage_pct_sum_current), src.summary_ts) AS cpu_usage_pct_sum_current_state,
    argMaxState(toFloat64(src.memory_used_bytes_sum_current), src.summary_ts) AS memory_used_bytes_sum_current_state,

    argMaxState(toUInt32(src.total_containers), src.summary_ts) AS total_containers_state,
    argMaxState(toUInt32(src.running_containers), src.summary_ts) AS running_containers_state,
    argMaxState(toUInt32(src.bad_containers), src.summary_ts) AS bad_containers_state,
    argMaxState(toUInt32(src.critical_containers), src.summary_ts) AS critical_containers_state,
    argMaxState(toUInt32(src.non_running_containers), src.summary_ts) AS non_running_containers_state,
    argMaxState(toFloat64(src.bad_container_ratio), src.summary_ts) AS bad_container_ratio_state,
    argMaxState(toUInt8(src.is_service_level_failure), src.summary_ts) AS is_service_level_failure_state,

    argMaxState(
        src.worst_container_id,
        tuple(
            toUInt8(src.service_severity_code),
            toUInt8(src.has_override_flag),
            src.summary_ts
        )
    ) AS culprit_container_state,
    argMaxState(
        src.worst_metric_key,
        tuple(
            toUInt8(src.service_severity_code),
            toUInt8(src.has_override_flag),
            src.summary_ts
        )
    ) AS culprit_metric_key_state,
    argMaxState(
        src.worst_metric_tags_json,
        tuple(
            toUInt8(src.service_severity_code),
            toUInt8(src.has_override_flag),
            src.summary_ts
        )
    ) AS culprit_metric_tags_json_state,
    argMaxState(
        toFloat64(src.worst_metric_value_numeric),
        tuple(
            toUInt8(src.service_severity_code),
            toUInt8(src.has_override_flag),
            src.summary_ts
        )
    ) AS culprit_metric_value_numeric_state,
    argMaxState(
        src.worst_metric_value_text,
        tuple(
            toUInt8(src.service_severity_code),
            toUInt8(src.has_override_flag),
            src.summary_ts
        )
    ) AS culprit_metric_value_text_state
FROM
(
    -- Chot schema output thanh cot phang, ro ten, de tranh loi
    -- parser/analyzer khi MV doc tu VIEW phuc tap.
    SELECT
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
    FROM telemetry_db.service_summary_trend_1m
) AS src
INNER JOIN changed_buckets AS cb
    ON src.bucket_start = cb.bucket_start
GROUP BY
    src.bucket_start,
    src.service_id;
