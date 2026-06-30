-- =========================================================
-- FILE NAME: 02_node_current_live.sql
-- MUC DICH:
--   Refactor view node_current_live theo huong policy-driven.
--   View nay dien giai latest-known state thanh current operational state
--   cho node, dung dict_metric_profile de tra cuu freshness, threshold,
--   ranking flag, va override flag thay vi hardcode multiIf lap lai.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / current live / operator-first dashboard
-- PHU THUOC:
--   - telemetry_db.node_latest_state
--   - telemetry_db.dict_metric_profile
--   - 03_reference_policy/01_metric_profile.sql
-- DAU RA CHINH:
--   - telemetry_db.node_current_live
-- GHI CHU:
--   - Giu schema output gan voi view goc trong clickhouse.sql
--     de de doi chieu va thay the dan.
--   - Khong sua clickhouse.sql; file do van la source-of-truth doi chieu.
-- =========================================================

USE telemetry_db;

-- Xoa view cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.node_current_live;

-- View nay dien giai latest-known state thanh live state:
-- fresh/stale/unknown, severity, override, ranking suitability.
CREATE VIEW telemetry_db.node_current_live AS
WITH
    dictGetUInt32OrDefault(
        'dict_metric_profile',
        'fresh_after_sec',
        tuple('node', metric_key),
        30
    ) AS fresh_after_sec_cfg,

    dictGetUInt32OrDefault(
        'dict_metric_profile',
        'stale_after_sec',
        tuple('node', metric_key),
        120
    ) AS stale_after_sec_cfg,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'warning_operator',
        tuple('node', metric_key),
        ''
    ) AS warning_operator_cfg,

    dictGetFloat64OrDefault(
        'dict_metric_profile',
        'warning_threshold_numeric',
        tuple('node', metric_key),
        nan
    ) AS warning_threshold_numeric_cfg,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'critical_operator',
        tuple('node', metric_key),
        ''
    ) AS critical_operator_cfg,

    dictGetFloat64OrDefault(
        'dict_metric_profile',
        'critical_threshold_numeric',
        tuple('node', metric_key),
        nan
    ) AS critical_threshold_numeric_cfg,

    dictGetOrDefault(
        'dict_metric_profile',
        'warning_text_values',
        tuple('node', metric_key),
        emptyArrayString()
    ) AS warning_text_values_cfg,

    dictGetOrDefault(
        'dict_metric_profile',
        'critical_text_values',
        tuple('node', metric_key),
        emptyArrayString()
    ) AS critical_text_values_cfg,

    dictGetUInt8OrDefault(
        'dict_metric_profile',
        'override_on_critical',
        tuple('node', metric_key),
        0
    ) AS override_on_critical_cfg,

    dictGetUInt8OrDefault(
        'dict_metric_profile',
        'is_ranking_metric',
        tuple('node', metric_key),
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

    -- Danh gia warning cho metric numeric dua theo operator + threshold tu policy.
    multiIf(
        warning_operator_cfg = '>'  AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric >  warning_threshold_numeric_cfg,
        warning_operator_cfg = '>=' AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric >= warning_threshold_numeric_cfg,
        warning_operator_cfg = '<'  AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric <  warning_threshold_numeric_cfg,
        warning_operator_cfg = '<=' AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric <= warning_threshold_numeric_cfg,
        warning_operator_cfg = '='  AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric =  warning_threshold_numeric_cfg,
        warning_operator_cfg = '==' AND isFinite(warning_threshold_numeric_cfg), latest_value_numeric =  warning_threshold_numeric_cfg,
        0
    ) AS warning_numeric_match,

    -- Danh gia critical cho metric numeric dua theo operator + threshold tu policy.
    multiIf(
        critical_operator_cfg = '>'  AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric >  critical_threshold_numeric_cfg,
        critical_operator_cfg = '>=' AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric >= critical_threshold_numeric_cfg,
        critical_operator_cfg = '<'  AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric <  critical_threshold_numeric_cfg,
        critical_operator_cfg = '<=' AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric <= critical_threshold_numeric_cfg,
        critical_operator_cfg = '='  AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric =  critical_threshold_numeric_cfg,
        critical_operator_cfg = '==' AND isFinite(critical_threshold_numeric_cfg), latest_value_numeric =  critical_threshold_numeric_cfg,
        0
    ) AS critical_numeric_match,

    -- Danh gia warning/critical cho metric text/state theo policy text arrays.
    has(warning_text_values_cfg, latest_value_text_normalized) AS warning_text_match,
    has(critical_text_values_cfg, latest_value_text_normalized) AS critical_text_match,

    (warning_numeric_match OR warning_text_match) AS warning_match,
    (critical_numeric_match OR critical_text_match) AS critical_match

SELECT
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

    stale_age_sec_calc AS stale_age_sec,
    freshness_code_calc AS freshness_code,
    live_state_calc AS live_state,
    is_stale_calc AS is_stale,

    multiIf(
        freshness_code_calc = 2, 4,
        critical_match, 3,
        warning_match, 2,
        0
    ) AS severity_code,

    multiIf(
        freshness_code_calc = 2, 1,
        critical_match AND override_on_critical_cfg = 1, 1,
        0
    ) AS override_flag,

    is_ranking_metric_cfg AS is_ranking_metric

FROM telemetry_db.node_latest_state;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra current-live da doc dung policy tu dictionary
-- cho freshness, severity, override, ranking.
-- =========================================================

-- Select node voi severity >= warning.
-- SELECT
--     node_id,
--     metric_key,
--     tags_json,
--     latest_value_numeric,
--     latest_value_text,
--     live_state,
--     severity_code,
--     override_flag,
--     latest_ts
-- FROM telemetry_db.node_current_live
-- WHERE node_id = 'node-msi-838958db'
--   AND severity_code >= 2
-- ORDER BY severity_code DESC, metric_key;

-- Select cac metric stale.
-- SELECT
--     node_id,
--     metric_key,
--     tags_json,
--     latest_ts,
--     stale_age_sec,
--     live_state
-- FROM telemetry_db.node_current_live
-- WHERE is_stale = 1
-- ORDER BY stale_age_sec DESC;

-- Select cac metric critical.
-- SELECT
--     node_id,
--     metric_key,
--     tags_json,
--     latest_value_numeric,
--     latest_value_text,
--     severity_code,
--     override_flag
-- FROM telemetry_db.node_current_live
-- WHERE severity_code = 3
-- ORDER BY node_id, metric_key;
