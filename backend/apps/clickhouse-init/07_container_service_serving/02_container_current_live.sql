-- =========================================================
-- FILE NAME: 02_container_current_live.sql
-- MUC DICH:
--   Dien giai latest-known state cua container thanh current-live
--   state theo logic operator-first:
--   - freshness
--   - severity policy tu dictionary
--   - override hardcode cho health/state/OOM risk
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / current live / operator-first dashboard
-- PHU THUOC:
--   - telemetry_db.container_latest_state
--   - telemetry_db.dict_metric_profile
--   - 03_reference_policy/01_metric_profile.sql
-- DAU RA CHINH:
--   - telemetry_db.container_current_live
-- GHI CHU:
--   - Numeric metrics phai doc threshold tu dict_metric_profile.
--   - Cac luat nghiep vu hard override duoc ap cho:
--       + container.health_status = unhealthy
--       + container.state != running
--       + memory_used_bytes / memory_limit_bytes >= 0.9
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.container_current_live;

CREATE VIEW telemetry_db.container_current_live AS
SELECT
    container_id,
    container_name,
    service_name,
    node_id,

    metric_key,
    series_key,
    tags_json,

    unit,
    source,
    source_metric,

    latest_ts,
    latest_value_numeric,
    latest_value_text,
    sample_count,

    semantic_class,
    is_operational_metric,

    container_state,
    container_health_status,
    memory_used_bytes,
    memory_limit_bytes,
    memory_used_ratio_calc AS memory_used_ratio,

    stale_age_sec_calc AS stale_age_sec,
    freshness_code_calc AS freshness_code,
    live_state_calc AS live_state,
    is_stale_calc AS is_stale,

    multiIf(
        freshness_code_calc = 2, 4,

        metric_key = 'container.health_status'
            AND lower(container_health_status) = 'unhealthy', 3,

        metric_key = 'container.state'
            AND lower(container_state) != ''
            AND lower(container_state) != 'running', 3,

        metric_key = 'container.memory_used_bytes'
            AND isFinite(memory_used_ratio_calc)
            AND memory_used_ratio_calc >= 0.9, 3,

        critical_match, 3,
        warning_match, 2,
        0
    ) AS severity_code,

    multiIf(
        freshness_code_calc = 2, 1,

        metric_key = 'container.health_status'
            AND lower(container_health_status) = 'unhealthy', 1,

        metric_key = 'container.memory_used_bytes'
            AND isFinite(memory_used_ratio_calc)
            AND memory_used_ratio_calc >= 0.9, 1,

        critical_match AND override_on_critical_cfg = 1, 1,
        0
    ) AS override_flag,

    multiIf(
        metric_key IN (
            'container.health_status',
            'container.state',
            'container.memory_used_bytes'
        ), 1,
        is_ranking_metric_cfg
    ) AS is_ranking_metric

FROM
(
    SELECT
        base.*,

        dictGetUInt32OrDefault(
            'dict_metric_profile',
            'fresh_after_sec',
            tuple('container', metric_key),
            30
        ) AS fresh_after_sec_cfg,

        dictGetUInt32OrDefault(
            'dict_metric_profile',
            'stale_after_sec',
            tuple('container', metric_key),
            120
        ) AS stale_after_sec_cfg,

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

        dictGetUInt8OrDefault(
            'dict_metric_profile',
            'is_ranking_metric',
            tuple('container', metric_key),
            0
        ) AS is_ranking_metric_cfg,

        lower(latest_value_text) AS latest_value_text_normalized,
        dateDiff('second', latest_ts, now()) AS stale_age_sec_calc,

        multiIf(
            stale_age_sec_calc <= fresh_after_sec_cfg, 0,
            stale_age_sec_calc <= stale_after_sec_cfg, 1,
            2
        ) AS freshness_code_calc,

        multiIf(
            stale_age_sec_calc <= fresh_after_sec_cfg, 'fresh',
            stale_age_sec_calc <= stale_after_sec_cfg, 'stale',
            'unknown'
        ) AS live_state_calc,

        if(stale_age_sec_calc > fresh_after_sec_cfg, 1, 0) AS is_stale_calc,

        if(
            memory_limit_bytes > 0,
            memory_used_bytes / memory_limit_bytes,
            nan
        ) AS memory_used_ratio_calc,

        multiIf(
            warning_operator_cfg = '>'  AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric >  warning_threshold_numeric_cfg,
            warning_operator_cfg = '>=' AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric >= warning_threshold_numeric_cfg,
            warning_operator_cfg = '<'  AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric <  warning_threshold_numeric_cfg,
            warning_operator_cfg = '<=' AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric <= warning_threshold_numeric_cfg,
            warning_operator_cfg = '='  AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric =  warning_threshold_numeric_cfg,
            warning_operator_cfg = '==' AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric =  warning_threshold_numeric_cfg,
            0
        ) AS warning_numeric_match,

        multiIf(
            critical_operator_cfg = '>'  AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric >  critical_threshold_numeric_cfg,
            critical_operator_cfg = '>=' AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric >= critical_threshold_numeric_cfg,
            critical_operator_cfg = '<'  AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric <  critical_threshold_numeric_cfg,
            critical_operator_cfg = '<=' AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric <= critical_threshold_numeric_cfg,
            critical_operator_cfg = '='  AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric =  critical_threshold_numeric_cfg,
            critical_operator_cfg = '==' AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric =  critical_threshold_numeric_cfg,
            0
        ) AS critical_numeric_match,

        has(warning_text_values_cfg, latest_value_text_normalized) AS warning_text_match,
        has(critical_text_values_cfg, latest_value_text_normalized) AS critical_text_match,

        (warning_numeric_match OR warning_text_match) AS warning_match,
        (critical_numeric_match OR critical_text_match) AS critical_match

    FROM
    (
        SELECT
            cls.container_id,
            snapshot.container_name,
            snapshot.service_name,
            snapshot.node_id,
            snapshot.container_state,
            snapshot.container_health_status,
            snapshot.memory_used_bytes,
            snapshot.memory_limit_bytes,

            cls.metric_key,
            cls.series_key,
            cls.tags_json,

            cls.unit,
            cls.source,
            cls.source_metric,

            cls.latest_ts,
            cls.latest_value_numeric,
            cls.latest_value_text,
            cls.sample_count,

            cls.semantic_class,
            cls.is_operational_metric

        FROM telemetry_db.container_latest_state AS cls
        LEFT JOIN
        (
            SELECT
                container_id,

                coalesce(
                    nullIf(
                        argMaxIf(
                            latest_value_text,
                            latest_ts,
                            metric_key = 'container.name'
                        ),
                        ''
                    ),
                    nullIf(
                        argMax(
                            JSONExtractString(tags_json, 'container_name'),
                            latest_ts
                        ),
                        ''
                    ),
                    container_id
                ) AS container_name,

                coalesce(
                    nullIf(
                        argMaxIf(
                            latest_value_text,
                            latest_ts,
                            metric_key = 'container.service_name'
                        ),
                        ''
                    ),
                    nullIf(
                        argMax(
                            JSONExtractString(tags_json, 'service_name'),
                            latest_ts
                        ),
                        ''
                    ),
                    ''
                ) AS service_name,

                coalesce(
                    nullIf(
                        argMaxIf(
                            latest_value_text,
                            latest_ts,
                            metric_key = 'container.node_id'
                        ),
                        ''
                    ),
                    ''
                ) AS node_id,

                coalesce(
                    nullIf(
                        argMaxIf(
                            latest_value_text,
                            latest_ts,
                            metric_key = 'container.state'
                        ),
                        ''
                    ),
                    ''
                ) AS container_state,

                coalesce(
                    nullIf(
                        argMaxIf(
                            latest_value_text,
                            latest_ts,
                            metric_key = 'container.health_status'
                        ),
                        ''
                    ),
                    ''
                ) AS container_health_status,

                argMaxIf(
                    latest_value_numeric,
                    latest_ts,
                    metric_key = 'container.memory_used_bytes'
                ) AS memory_used_bytes,

                argMaxIf(
                    latest_value_numeric,
                    latest_ts,
                    metric_key = 'container.memory_limit_bytes'
                ) AS memory_limit_bytes

            FROM telemetry_db.container_latest_state
            GROUP BY container_id
        ) AS snapshot
        USING (container_id)
    ) AS base
) AS enriched;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra current-live cua container da ap dung dung
-- freshness, policy dictionary, va business override.
-- =========================================================

-- SELECT
--     container_id,
--     container_name,
--     service_name,
--     metric_key,
--     latest_value_numeric,
--     latest_value_text,
--     container_state,
--     container_health_status,
--     memory_used_ratio,
--     live_state,
--     severity_code,
--     override_flag
-- FROM telemetry_db.container_current_live
-- WHERE severity_code >= 2
-- ORDER BY container_id, severity_code DESC, metric_key;
