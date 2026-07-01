-- =========================================================
-- FILE NAME: 02_rack_summary_trend_1m.sql
-- MUC DICH:
--   Tao view xu huong ngan han 1 phut cho Rack tu aggregate 1m cua Node.
--   View nay phuc vu chart 1h, 6h va phan tich degradation ngan han
--   o cap Rack theo huong operator-first.
-- TANG DU LIEU PHUC VU:
--   06_rack_serving / short-term trend / rack 1m trend
-- PHU THUOC:
--   - telemetry_db.v_agg_1m_by_scope_metric
--   - telemetry_db.dict_node_topology
--   - telemetry_db.dict_metric_profile
-- DAU RA CHINH:
--   - telemetry_db.rack_summary_trend_1m
-- GHI CHU:
--   - View nay dung aggregate 2 buoc:
--       (1) metric-series bucket -> node-level bucket
--       (2) node-level bucket -> rack-level bucket
--   - Trend 1m khong suy dien stale/unknown theo current-time nhu node_current_live.
--     No phan anh severity van hanh cua moi bucket dua tren value_last/text_last.
-- =========================================================

USE telemetry_db;

-- Xoa view cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.rack_summary_trend_1m;

-- View tong hop xu huong Rack theo bucket 1 phut.
CREATE VIEW telemetry_db.rack_summary_trend_1m AS
SELECT
    bucket_start,
    rack_id,
    -- Thoi diem sample moi nhat ben trong bucket cua rack
    max(node_summary_ts) AS summary_ts,
    -- Worst-case wins cho severity van hanh trong bucket
    max(node_max_operational_severity) AS rack_severity_code,
    -- Neu co bat ky node nao co override-grade signal thi bat co
    max(node_has_override_flag) AS has_override_flag,
    -- Blast radius cap node trong bucket
    count() AS total_nodes,
    sum(node_is_bad) AS bad_nodes,
    sum(node_is_critical) AS critical_nodes,
    sum(node_is_warning) AS warning_nodes,
    round(sum(node_is_bad) / count(), 4) AS bad_node_ratio,
    if(count() > 0 AND sum(node_is_bad) / count() > 0.5, 1, 0) AS is_rack_level_failure,
    -- Culprit node va culprit metric cua bucket rack
    argMax(
        node_id,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_node_id,
    argMax(
        node_worst_metric_key,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_key,

    argMax(
        node_worst_metric_tags_json,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_tags_json,

    argMax(
        node_worst_metric_value_numeric,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_value_numeric,

    argMax(
        node_worst_metric_value_text,
        tuple(
            node_max_operational_severity,
            node_has_override_flag,
            node_summary_ts
        )
    ) AS worst_metric_value_text

FROM
(
    -- =====================================================
    -- BƯỚC 1:
    -- Gom tu metric-series bucket level thanh 1 dong moi node
    -- trong moi bucket 1 phut cua rack.
    -- Muc tieu la tranh dem lap node khi mot node co nhieu metric.
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
        -- TANG metric bucket 1m:
        -- Doc aggregate 1m cua node, tra cuu policy dong tu
        -- dict_metric_profile, sau do tinh severity o query-time.
        -- =================================================
        SELECT
            bucket_start,
            scope_id AS node_id,
            ifNull(
                dictGet('telemetry_db.dict_node_topology', 'rack_id', scope_id),
                ''
            ) AS rack_id,

            metric_key,
            tags_json,
            last_ts,
            value_last,
            text_last,

            dictGetUInt8OrDefault(
                'dict_metric_profile',
                'is_operational_metric',
                tuple('node', metric_key),
                0
            ) AS is_operational_metric_cfg,

            dictGetStringOrDefault(
                'dict_metric_profile',
                'warning_operator',
                tuple('node', metric_key),
                ''
            ) AS warning_operator_cfg,

            ifNull(
                dictGetOrNull(
                    'dict_metric_profile',
                    'warning_threshold_numeric',
                    tuple('node', metric_key)
                ),
                nan
            ) AS warning_threshold_numeric_cfg,

            dictGetStringOrDefault(
                'dict_metric_profile',
                'critical_operator',
                tuple('node', metric_key),
                ''
            ) AS critical_operator_cfg,

            ifNull(
                dictGetOrNull(
                    'dict_metric_profile',
                    'critical_threshold_numeric',
                    tuple('node', metric_key)
                ),
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

        FROM telemetry_db.v_agg_1m_by_scope_metric
        WHERE scope_type = 'node'
          AND ifNull(
                dictGet('telemetry_db.dict_node_topology', 'rack_id', scope_id),
                ''
              ) != ''
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

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra view rack_summary_trend_1m cho chart ngan han,
-- culprit trend, va blast radius trend o cap Rack.
-- =========================================================

-- Test 1:
-- Xem trend 1m cua tat ca rack trong 1 gio gan nhat
-- SELECT
--     bucket_start,
--     rack_id,
--     rack_severity_code,
--     bad_nodes,
--     total_nodes,
--     bad_node_ratio,
--     worst_node_id,
--     worst_metric_key
-- FROM telemetry_db.rack_summary_trend_1m
-- WHERE bucket_start >= now() - INTERVAL 1 HOUR
-- ORDER BY bucket_start, rack_id;

-- Test 2:
-- Xem trend 1m cua mot rack cu the
-- SELECT
--     bucket_start,
--     rack_id,
--     rack_severity_code,
--     has_override_flag,
--     bad_nodes,
--     critical_nodes,
--     warning_nodes,
--     worst_node_id,
--     worst_metric_key,
--     worst_metric_value_numeric,
--     worst_metric_value_text
-- FROM telemetry_db.rack_summary_trend_1m
-- WHERE rack_id = 'rack-a1'
--   AND bucket_start >= now() - INTERVAL 6 HOUR
-- ORDER BY bucket_start;

-- Test 3:
-- Tim cac bucket co rack-level failure
-- SELECT
--     bucket_start,
--     rack_id,
--     rack_severity_code,
--     bad_nodes,
--     total_nodes,
--     bad_node_ratio,
--     is_rack_level_failure
-- FROM telemetry_db.rack_summary_trend_1m
-- WHERE is_rack_level_failure = 1
-- ORDER BY bucket_start DESC, bad_node_ratio DESC, rack_id;
