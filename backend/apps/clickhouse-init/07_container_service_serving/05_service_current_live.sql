-- =========================================================
-- FILE NAME: 05_service_current_live.sql
-- MUC DICH:
--   Dien giai latest-known state cua service thanh current-live
--   state theo logic operator-first:
--   - freshness
--   - severity policy tu dictionary
--   - business rule cho running_container_count / container_count
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / current live / operator-first dashboard
-- PHU THUOC:
--   - telemetry_db.service_latest_state
--   - telemetry_db.dict_metric_profile
--   - 03_reference_policy/01_metric_profile.sql
-- DAU RA CHINH:
--   - telemetry_db.service_current_live
-- GHI CHU:
--   - Numeric metrics phai doc threshold tu dict_metric_profile.
--   - Business severity duoc ap cho service.running_container_count:
--       + running = 0 => critical
--       + running < total => warning
--   - Hybrid roll-up voi container_current_summary se duoc ap o lop
--     service_current_summary, khong nhung vai tro vao current-live.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.service_current_live;

CREATE VIEW telemetry_db.service_current_live AS
SELECT
    service_id,
    service_name,

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

    service_container_count,
    service_running_container_count,
    running_container_ratio_calc AS running_container_ratio,

    stale_age_sec_calc AS stale_age_sec,
    freshness_code_calc AS freshness_code,
    live_state_calc AS live_state,
    is_stale_calc AS is_stale,

    multiIf(
        freshness_code_calc = 2, 4,

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
        freshness_code_calc = 2, 1,

        metric_key = 'service.running_container_count'
            AND service_running_container_count = 0, 1,

        critical_match AND override_on_critical_cfg = 1, 1,
        0
    ) AS override_flag,

    multiIf(
        metric_key = 'service.running_container_count', 1,
        is_ranking_metric_cfg
    ) AS is_ranking_metric

FROM
(
    SELECT
        base.*,

        dictGetUInt32OrDefault(
            'dict_metric_profile',
            'fresh_after_sec',
            tuple('service', metric_key),
            30
        ) AS fresh_after_sec_cfg,

        dictGetUInt32OrDefault(
            'dict_metric_profile',
            'stale_after_sec',
            tuple('service', metric_key),
            120
        ) AS stale_after_sec_cfg,

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

        dictGetUInt8OrDefault(
            'dict_metric_profile',
            'is_ranking_metric',
            tuple('service', metric_key),
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
            service_container_count > 0,
            service_running_container_count / service_container_count,
            nan
        ) AS running_container_ratio_calc,

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
            sls.service_id,
            snapshot.service_name,
            snapshot.service_container_count,
            snapshot.service_running_container_count,

            sls.metric_key,
            sls.series_key,
            sls.tags_json,

            sls.unit,
            sls.source,
            sls.source_metric,

            sls.latest_ts,
            sls.latest_value_numeric,
            sls.latest_value_text,
            sls.sample_count,

            sls.semantic_class,
            sls.is_operational_metric

        FROM telemetry_db.service_latest_state AS sls
        LEFT JOIN
        (
            SELECT
                service_id,

                coalesce(
                    nullIf(
                        argMax(
                            JSONExtractString(tags_json, 'service_name'),
                            latest_ts
                        ),
                        ''
                    ),
                    service_id
                ) AS service_name,

                argMaxIf(
                    latest_value_numeric,
                    latest_ts,
                    metric_key = 'service.container_count'
                ) AS service_container_count,

                argMaxIf(
                    latest_value_numeric,
                    latest_ts,
                    metric_key = 'service.running_container_count'
                ) AS service_running_container_count

            FROM telemetry_db.service_latest_state
            GROUP BY service_id
        ) AS snapshot
        USING (service_id)
    ) AS base
) AS enriched;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra current-live cua service da ap dung dung
-- freshness, policy dictionary, va business rule running vs total.
-- =========================================================

-- SELECT
--     service_id,
--     service_name,
--     metric_key,
--     latest_value_numeric,
--     service_container_count,
--     service_running_container_count,
--     running_container_ratio,
--     live_state,
--     severity_code,
--     override_flag
-- FROM telemetry_db.service_current_live
-- ORDER BY service_id, severity_code DESC, metric_key;
