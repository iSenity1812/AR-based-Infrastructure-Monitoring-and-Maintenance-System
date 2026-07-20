-- =========================================================
-- FILE NAME: 09_node_summary_trend_1m.sql
-- MUC DICH:
--   Tao view xu huong ngan han 1 phut cho Node tu aggregate 1m.
--   View nay phuc vu chart 1h, 6h va phan tich degradation ngan han
--   o cap Node theo huong operator-first.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / short-term trend / node 1m trend
-- PHU THUOC:
--   - telemetry_db.v_agg_1m_by_scope_metric
--   - telemetry_db.dict_metric_profile
-- DAU RA CHINH:
--   - telemetry_db.node_summary_trend_1m
-- GHI CHU:
--   - Trend 1m khong suy dien stale/unknown theo current-time nhu
--     node_current_live.
--   - Severity bucket duoc tinh tu value_last/text_last theo policy
--     tra cuu bang dict_metric_profile ngay trong bucket do.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.node_summary_trend_1m;

CREATE VIEW telemetry_db.node_summary_trend_1m AS
SELECT
    bucket_start,
    node_id,
    max(last_ts) AS summary_ts,
    -- 1. TẦNG CODES & COUNTERS: Chỉ tính dựa trên các metric được gán cờ Operational Profile
    maxIf(severity_code, is_operational_metric_cfg = 1) AS node_severity_code,
    maxIf(override_flag, is_operational_metric_cfg = 1) AS has_override_flag,

    countIf(severity_code = 3 AND is_operational_metric_cfg = 1) AS critical_metric_count,
    countIf(severity_code = 2 AND is_operational_metric_cfg = 1) AS warning_metric_count,
    -- 2. TẦNG TELEMETRY KHÔNG BỊ CHẶN BỘ LỌC: Đảm bảo ra số đầy đủ
    maxIf(value_last, metric_key = 'node.cpu_usage_pct') AS cpu_usage_pct_current,
    maxIf(value_last, metric_key = 'node.memory_used_pct') AS memory_used_pct_current,
    maxIf(value_last, metric_key = 'node.uptime_seconds') AS uptime_seconds_current,

    maxIf(text_last, metric_key = 'node.primary_nic_status') AS primary_nic_status_current,
    maxIf(value_last, metric_key = 'node.cpu_temperature_c') AS cpu_temperature_c_current,
    maxIf(value_last, metric_key = 'node.cpu_package_power_w') AS cpu_package_power_w_current,

    maxIf(value_last, metric_key = 'node.cpu_queue_length') AS cpu_queue_length_max_current,
    maxIf(value_last, metric_key = 'node.memory_page_faults_rate') AS memory_page_faults_rate_max_current,
    maxIf(value_last, metric_key = 'node.tcp_retransmit_pct') AS tcp_retransmit_pct_max_current,

    maxIf(value_last, metric_key = 'node.disk_used_pct') AS disk_used_pct_max_current,
    maxIf(value_last, metric_key = 'node.disk_queue_length') AS disk_queue_length_max_current,

    sumIf(value_last, metric_key = 'node.network_rx_bytes_sec') AS network_rx_bytes_sec_sum_current,
    sumIf(value_last, metric_key = 'node.network_tx_bytes_sec') AS network_tx_bytes_sec_sum_current,

    maxIf(value_last, metric_key = 'node.ssd_temperature_c') AS ssd_temperature_c_max_current,
    minIf(value_last, metric_key = 'node.ssd_life_pct') AS ssd_life_pct_min_current,
    -- 2.1. UNIT MAPPING: v_agg_1m_by_scope_metric khong expose unit, nen
    -- trend 1m dung unit constants da duoc xac thuc tu node_current_live.
    '%' AS cpu_usage_pct_unit,
    '%' AS memory_used_pct_unit,
    'seconds' AS uptime_seconds_unit,
    'state' AS primary_nic_status_unit,
    'C' AS cpu_temperature_c_unit,
    'W' AS cpu_package_power_w_unit,
    'count' AS cpu_queue_length_unit,
    'count/sec' AS memory_page_faults_rate_unit,
    '%' AS tcp_retransmit_pct_unit,
    '%' AS disk_used_pct_unit,
    'count' AS disk_queue_length_unit,
    'bytes/sec' AS network_rx_bytes_sec_unit,
    'bytes/sec' AS network_tx_bytes_sec_unit,
    'C' AS ssd_temperature_c_unit,
    '%' AS ssd_life_pct_unit,
    -- 3. TẦNG GIẢI THÍCH LỖI: Chỉ chắt lọc từ Operational Metrics để tránh nhiễu hệ thống
    argMaxIf(
        metric_key,
        tuple(severity_code, override_flag, last_ts),
        is_operational_metric_cfg = 1
    ) AS worst_metric_key,
    argMaxIf(
        tags_json,
        tuple(severity_code, override_flag, last_ts),
        is_operational_metric_cfg = 1
    ) AS worst_metric_tags_json,
    argMaxIf(
        value_last,
        tuple(severity_code, override_flag, last_ts),
        is_operational_metric_cfg = 1
    ) AS worst_metric_value_numeric,
    argMaxIf(
        text_last,
        tuple(severity_code, override_flag, last_ts),
        is_operational_metric_cfg = 1
    ) AS worst_metric_value_text

FROM
(
    SELECT
        bucket_start,
        scope_id AS node_id,
        metric_key,
        tags_json,
        last_ts,
        value_last,
        text_last,
        is_operational_metric_cfg,

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
        SELECT
            src.*,

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
            (critical_numeric_match OR critical_text_match) AS critical_match

        FROM telemetry_db.v_agg_1m_by_scope_metric AS src
        WHERE scope_type = 'node'
    ) AS metric_bucket
) AS node_metric_bucket
GROUP BY
    bucket_start,
    node_id;

-- =========================================================
-- TEST GOI Y
-- =========================================================

-- SELECT
--     bucket_start,
--     node_id,
--     node_severity_code,
--     critical_metric_count,
--     warning_metric_count,
--     worst_metric_key
-- FROM telemetry_db.node_summary_trend_1m
-- WHERE bucket_start >= now() - INTERVAL 1 HOUR
-- ORDER BY bucket_start, node_id;
