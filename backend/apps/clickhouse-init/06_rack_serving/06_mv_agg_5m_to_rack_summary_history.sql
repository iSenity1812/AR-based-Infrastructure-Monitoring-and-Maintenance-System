-- =========================================================
-- FILE NAME: 06_mv_agg_5m_to_rack_summary_history.sql
-- MUC DICH:
--   Materialize xu huong Rack 5 phut vao bang rack_summary_history
--   de co read model lich su dai hon ma khong phai roll-up lai luc query.
-- TANG DU LIEU PHUC VU:
--   06_rack_serving / historical rack semantics / 5m materialization
-- PHU THUOC:
--   - telemetry_db.agg_5m_by_scope_metric
--   - telemetry_db.rack_summary_history
--   - telemetry_db.dict_node_topology
--   - telemetry_db.dict_metric_profile
-- DAU RA CHINH:
--   - telemetry_db.mv_agg_5m_to_rack_summary_history
-- GHI CHU:
--   - Pattern giong 1m nhung granularity la 5m.
--   - Phu hop cho query 24h-7d ma khong can tinh lai tu node trend view.
-- =========================================================

USE telemetry_db;

-- Xoa MV cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.mv_agg_5m_to_rack_summary_history;

-- MV day du lieu 5m vao bang rack_summary_history.
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_agg_5m_to_rack_summary_history
TO telemetry_db.rack_summary_history
AS
SELECT
    '5m' AS bucket_granularity,
    bucket_start,
    rack_id,

    maxState(node_summary_ts) AS summary_ts_state,
    maxState(toUInt8(node_max_operational_severity)) AS rack_severity_code_state,
    maxState(toUInt8(node_has_override_flag)) AS has_override_flag_state,

    uniqExactState(node_id) AS total_nodes_state,
    uniqExactIfState(node_id, node_is_bad = 1) AS bad_nodes_state,
    uniqExactIfState(node_id, node_is_critical = 1) AS critical_nodes_state,
    uniqExactIfState(node_id, node_is_warning = 1) AS warning_nodes_state,

    argMaxState(
        node_id,
        tuple(
            toUInt8(node_max_operational_severity),
            toUInt8(node_has_override_flag),
            node_summary_ts
        )
    ) AS culprit_node_state,

    argMaxState(
        node_worst_metric_key,
        tuple(
            toUInt8(node_max_operational_severity),
            toUInt8(node_has_override_flag),
            node_summary_ts
        )
    ) AS culprit_metric_key_state,

    argMaxState(
        node_worst_metric_tags_json,
        tuple(
            toUInt8(node_max_operational_severity),
            toUInt8(node_has_override_flag),
            node_summary_ts
        )
    ) AS culprit_metric_tags_json_state,

    argMaxState(
        node_worst_metric_value_numeric,
        tuple(
            toUInt8(node_max_operational_severity),
            toUInt8(node_has_override_flag),
            node_summary_ts
        )
    ) AS culprit_metric_value_numeric_state,

    argMaxState(
        node_worst_metric_value_text,
        tuple(
            toUInt8(node_max_operational_severity),
            toUInt8(node_has_override_flag),
            node_summary_ts
        )
    ) AS culprit_metric_value_text_state

FROM
(
    -- =====================================================
    -- BƯỚC 1:
    -- Chuan hoa source aggregate 5m thanh 1 dong moi node trong rack
    -- cho moi bucket 5 phut.
    -- =====================================================
    SELECT
        bucket_start,
        rack_id,
        node_id,

        max(last_ts) AS node_summary_ts,
        max(severity_code) AS node_max_operational_severity,
        max(override_flag) AS node_has_override_flag,

        max(if(severity_code >= 2, 1, 0)) AS node_is_bad,
        max(if(severity_code = 3, 1, 0)) AS node_is_critical,
        max(if(severity_code = 2, 1, 0)) AS node_is_warning,

        argMax(
            metric_key,
            tuple(
                severity_code,
                override_flag,
                last_ts
            )
        ) AS node_worst_metric_key,

        argMax(
            tags_json,
            tuple(
                severity_code,
                override_flag,
                last_ts
            )
        ) AS node_worst_metric_tags_json,

        argMax(
            value_last,
            tuple(
                severity_code,
                override_flag,
                last_ts
            )
        ) AS node_worst_metric_value_numeric,

        argMax(
            text_last,
            tuple(
                severity_code,
                override_flag,
                last_ts
            )
        ) AS node_worst_metric_value_text

    FROM
    (
        -- =================================================
        -- Tang metric bucket 5m da duoc finalize tu aggregate state.
        -- Sau do policy dictionary duoc ap de tinh lai severity
        -- tai insert-time cua rack history.
        -- =================================================
        SELECT
            metric_bucket.bucket_start,
            metric_bucket.node_id,
            metric_bucket.rack_id,
            metric_bucket.metric_key,
            metric_bucket.tags_json,
            metric_bucket.last_ts,
            metric_bucket.value_last,
            metric_bucket.text_last,

            dictGetUInt8OrDefault(
                'dict_metric_profile',
                'is_operational_metric',
                tuple('node', metric_bucket.metric_key),
                0
            ) AS is_operational_metric_cfg,

            dictGetStringOrDefault(
                'dict_metric_profile',
                'warning_operator',
                tuple('node', metric_bucket.metric_key),
                ''
            ) AS warning_operator_cfg,

            ifNull(
                dictGetOrNull(
                    'dict_metric_profile',
                    'warning_threshold_numeric',
                    tuple('node', metric_bucket.metric_key)
                ),
                nan
            ) AS warning_threshold_numeric_cfg,

            dictGetStringOrDefault(
                'dict_metric_profile',
                'critical_operator',
                tuple('node', metric_bucket.metric_key),
                ''
            ) AS critical_operator_cfg,

            ifNull(
                dictGetOrNull(
                    'dict_metric_profile',
                    'critical_threshold_numeric',
                    tuple('node', metric_bucket.metric_key)
                ),
                nan
            ) AS critical_threshold_numeric_cfg,

            dictGetOrDefault(
                'dict_metric_profile',
                'warning_text_values',
                tuple('node', metric_bucket.metric_key),
                emptyArrayString()
            ) AS warning_text_values_cfg,

            dictGetOrDefault(
                'dict_metric_profile',
                'critical_text_values',
                tuple('node', metric_bucket.metric_key),
                emptyArrayString()
            ) AS critical_text_values_cfg,

            dictGetUInt8OrDefault(
                'dict_metric_profile',
                'override_on_critical',
                tuple('node', metric_bucket.metric_key),
                0
            ) AS override_on_critical_cfg,

            lower(metric_bucket.text_last) AS text_last_normalized,

            multiIf(
                warning_operator_cfg = '>'  AND isFinite(warning_threshold_numeric_cfg), metric_bucket.value_last >  warning_threshold_numeric_cfg,
                warning_operator_cfg = '>=' AND isFinite(warning_threshold_numeric_cfg), metric_bucket.value_last >= warning_threshold_numeric_cfg,
                warning_operator_cfg = '<'  AND isFinite(warning_threshold_numeric_cfg), metric_bucket.value_last <  warning_threshold_numeric_cfg,
                warning_operator_cfg = '<=' AND isFinite(warning_threshold_numeric_cfg), metric_bucket.value_last <= warning_threshold_numeric_cfg,
                warning_operator_cfg = '='  AND isFinite(warning_threshold_numeric_cfg), metric_bucket.value_last =  warning_threshold_numeric_cfg,
                warning_operator_cfg = '==' AND isFinite(warning_threshold_numeric_cfg), metric_bucket.value_last =  warning_threshold_numeric_cfg,
                0
            ) AS warning_numeric_match,

            multiIf(
                critical_operator_cfg = '>'  AND isFinite(critical_threshold_numeric_cfg), metric_bucket.value_last >  critical_threshold_numeric_cfg,
                critical_operator_cfg = '>=' AND isFinite(critical_threshold_numeric_cfg), metric_bucket.value_last >= critical_threshold_numeric_cfg,
                critical_operator_cfg = '<'  AND isFinite(critical_threshold_numeric_cfg), metric_bucket.value_last <  critical_threshold_numeric_cfg,
                critical_operator_cfg = '<=' AND isFinite(critical_threshold_numeric_cfg), metric_bucket.value_last <= critical_threshold_numeric_cfg,
                critical_operator_cfg = '='  AND isFinite(critical_threshold_numeric_cfg), metric_bucket.value_last =  critical_threshold_numeric_cfg,
                critical_operator_cfg = '==' AND isFinite(critical_threshold_numeric_cfg), metric_bucket.value_last =  critical_threshold_numeric_cfg,
                0
            ) AS critical_numeric_match,

            has(warning_text_values_cfg, text_last_normalized) AS warning_text_match,
            has(critical_text_values_cfg, text_last_normalized) AS critical_text_match,

            (warning_numeric_match OR warning_text_match) AS warning_match,
            (critical_numeric_match OR critical_text_match) AS critical_match,

            multiIf(
                critical_match, 3,
                warning_match, 2,
                0
            ) AS severity_code,

            multiIf(
                critical_match AND override_on_critical_cfg = 1, 1,
                0
            ) AS override_flag

        FROM
        (
            -- =============================================
            -- Finalize cac state columns cua agg_5m de lay
            -- last_ts, value_last va text_last tren tung
            -- metric-series bucket cua node.
            -- =============================================
            SELECT
                bucket_start,
                scope_id AS node_id,
                ifNull(
                    dictGet('telemetry_db.dict_node_topology', 'rack_id', scope_id),
                    ''
                ) AS rack_id,
                metric_key,
                tags_json,
                maxMerge(last_ts_state) AS last_ts,
                argMaxMerge(value_last_state) AS value_last,
                argMaxMerge(text_last_state) AS text_last
            FROM telemetry_db.agg_5m_by_scope_metric
            WHERE scope_type = 'node'
              AND ifNull(
                    dictGet('telemetry_db.dict_node_topology', 'rack_id', scope_id),
                    ''
                  ) != ''
            GROUP BY
                bucket_start,
                node_id,
                rack_id,
                metric_key,
                series_key,
                tags_json
        ) AS metric_bucket
    ) AS node_metric_bucket
    WHERE is_operational_metric_cfg = 1
    GROUP BY
        bucket_start,
        rack_id,
        node_id
) AS node_rollup
GROUP BY
    bucket_start,
    rack_id;
