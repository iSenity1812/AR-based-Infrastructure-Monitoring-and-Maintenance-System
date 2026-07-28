-- =========================================================
-- FILE NAME: 07_container_summary_trend_1m.sql
-- MUC DICH:
--   Tao view xu huong ngan han 1 phut cho Container tu aggregate 1m.
--   View nay phuc vu chart 1h, 6h va phan tich degradation ngan han
--   o cap container theo huong operator-first.
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / short-term trend / container 1m trend
-- PHU THUOC:
--   - telemetry_db.v_agg_1m_by_scope_metric
--   - telemetry_db.dict_metric_profile
-- DAU RA CHINH:
--   - telemetry_db.container_summary_trend_1m
-- GHI CHU:
--   - Trend 1m khong suy dien stale/unknown theo current-time.
--   - Severity bucket duoc tinh tu value_last/text_last va business rule
--     state/health/OOM-risk o ngay trong bucket do.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.container_summary_trend_1m;

CREATE VIEW telemetry_db.container_summary_trend_1m AS
SELECT
    bucket_start,
    container_id,
    max(last_ts) AS summary_ts,

    argMax(container_name, last_ts) AS container_name,
    argMax(service_name, last_ts) AS service_name,
    argMax(node_id, last_ts) AS node_id,

    argMax(container_state, last_ts) AS container_state,
    argMax(container_health_status, last_ts) AS container_health_status,

    max(severity_code) AS container_severity_code,
    max(override_flag) AS has_override_flag,

    countIf(severity_code = 3) AS critical_metric_count,
    countIf(severity_code = 2) AS warning_metric_count,

    maxIf(value_last, metric_key = 'container.cpu_usage_pct') AS cpu_usage_pct_current,
    maxIf(value_last, metric_key = 'container.memory_used_pct') AS memory_used_pct_current,
    maxIf(value_last, metric_key = 'container.memory_used_bytes') AS memory_used_bytes_current,
    maxIf(value_last, metric_key = 'container.memory_limit_bytes') AS memory_limit_bytes_current,
    maxIf(memory_used_ratio, metric_key = 'container.memory_used_bytes') AS memory_used_ratio_current,

    maxIf(value_last, metric_key = 'container.restart_count') AS restart_count_current,
    maxIf(value_last, metric_key = 'container.pid_count') AS pid_count_current,

    sumIf(value_last, metric_key = 'container.network_rx_bytes_sec') AS network_rx_bytes_sec_sum_current,
    sumIf(value_last, metric_key = 'container.network_tx_bytes_sec') AS network_tx_bytes_sec_sum_current,
    sumIf(value_last, metric_key = 'container.block_read_bytes_sec') AS block_read_bytes_sec_sum_current,
    sumIf(value_last, metric_key = 'container.block_write_bytes_sec') AS block_write_bytes_sec_sum_current,

    maxIf(text_last, metric_key = 'container.status') AS container_status_current,

    argMax(
        metric_key,
        tuple(severity_code, override_flag, last_ts)
    ) AS worst_metric_key,
    argMax(
        tags_json,
        tuple(severity_code, override_flag, last_ts)
    ) AS worst_metric_tags_json,
    argMax(
        value_last,
        tuple(severity_code, override_flag, last_ts)
    ) AS worst_metric_value_numeric,
    argMax(
        text_last,
        tuple(severity_code, override_flag, last_ts)
    ) AS worst_metric_value_text

FROM
(
    SELECT
        base.*,

        if(
            memory_limit_bytes > 0,
            memory_used_bytes / memory_limit_bytes,
            nan
        ) AS memory_used_ratio,

        multiIf(
            metric_key = 'container.health_status'
                AND lower(container_health_status) = 'unhealthy', 3,

            metric_key = 'container.state'
                AND lower(container_state) != ''
                AND lower(container_state) != 'running', 3,

            metric_key = 'container.memory_used_bytes'
                AND isFinite(if(memory_limit_bytes > 0, memory_used_bytes / memory_limit_bytes, nan))
                AND if(memory_limit_bytes > 0, memory_used_bytes / memory_limit_bytes, nan) >= 0.9, 3,

            critical_match, 3,
            warning_match, 2,
            0
        ) AS severity_code,

        multiIf(
            metric_key = 'container.health_status'
                AND lower(container_health_status) = 'unhealthy', 1,

            metric_key = 'container.memory_used_bytes'
                AND isFinite(if(memory_limit_bytes > 0, memory_used_bytes / memory_limit_bytes, nan))
                AND if(memory_limit_bytes > 0, memory_used_bytes / memory_limit_bytes, nan) >= 0.9, 1,

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
                tuple('container', metric_key),
                0
            ) AS is_operational_metric_cfg,

            dictGetStringOrDefault(
                'dict_metric_profile',
                'warning_operator',
                tuple('container', metric_key),
                ''
            ) AS warning_operator_cfg,

            ifNull(
                dictGetOrNull(
                    'dict_metric_profile',
                    'warning_threshold_numeric',
                    tuple('container', metric_key)
                ),
                nan
            ) AS warning_threshold_numeric_cfg,

            dictGetStringOrDefault(
                'dict_metric_profile',
                'critical_operator',
                tuple('container', metric_key),
                ''
            ) AS critical_operator_cfg,

            ifNull(
                dictGetOrNull(
                    'dict_metric_profile',
                    'critical_threshold_numeric',
                    tuple('container', metric_key)
                ),
                nan
            ) AS critical_threshold_numeric_cfg,

            dictGetOrDefault(
                'dict_metric_profile',
                'warning_text_values',
                tuple('container', metric_key),
                emptyArrayString()
            ) AS warning_text_values_cfg,

            dictGetOrDefault(
                'dict_metric_profile',
                'critical_text_values',
                tuple('container', metric_key),
                emptyArrayString()
            ) AS critical_text_values_cfg,

            dictGetUInt8OrDefault(
                'dict_metric_profile',
                'override_on_critical',
                tuple('container', metric_key),
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
                src.scope_id AS container_id,
                snap.container_name,
                snap.service_name,
                snap.node_id,
                snap.container_state,
                snap.container_health_status,
                snap.memory_used_bytes,
                snap.memory_limit_bytes,

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
                    scope_id AS container_id,

                    coalesce(
                        nullIf(argMaxIf(text_last, last_ts, metric_key = 'container.name'), ''),
                        nullIf(argMax(JSONExtractString(tags_json, 'container_name'), last_ts), ''),
                        scope_id
                    ) AS container_name,

                    coalesce(
                        nullIf(argMaxIf(text_last, last_ts, metric_key = 'container.service_name'), ''),
                        nullIf(argMax(JSONExtractString(tags_json, 'service_name'), last_ts), ''),
                        ''
                    ) AS service_name,

                    coalesce(
                        nullIf(argMaxIf(text_last, last_ts, metric_key = 'container.node_id'), ''),
                        ''
                    ) AS node_id,

                    coalesce(
                        nullIf(argMaxIf(text_last, last_ts, metric_key = 'container.state'), ''),
                        ''
                    ) AS container_state,

                    coalesce(
                        nullIf(argMaxIf(text_last, last_ts, metric_key = 'container.health_status'), ''),
                        ''
                    ) AS container_health_status,

                    argMaxIf(value_last, last_ts, metric_key = 'container.memory_used_bytes') AS memory_used_bytes,
                    argMaxIf(value_last, last_ts, metric_key = 'container.memory_limit_bytes') AS memory_limit_bytes
                FROM telemetry_db.v_agg_1m_by_scope_metric
                WHERE scope_type = 'container'
                GROUP BY
                    bucket_start,
                    container_id
            ) AS snap
            ON src.bucket_start = snap.bucket_start
           AND src.scope_id = snap.container_id
            WHERE src.scope_type = 'container'
        ) AS metric_bucket
    ) AS base
    WHERE is_operational_metric_cfg = 1
) AS container_metric_bucket
GROUP BY
    bucket_start,
    container_id;

-- =========================================================
-- TEST GOI Y
-- =========================================================

-- SELECT *
-- FROM telemetry_db.container_summary_trend_1m
-- WHERE bucket_start >= now() - INTERVAL 1 HOUR
-- ORDER BY bucket_start, service_name, container_name;
