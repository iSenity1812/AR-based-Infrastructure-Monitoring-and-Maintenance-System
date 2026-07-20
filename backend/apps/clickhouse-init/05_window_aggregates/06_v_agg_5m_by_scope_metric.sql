-- =========================================================
-- FILE NAME: 06_v_agg_5m_by_scope_metric.sql
-- MUC DICH:
--   Finalize aggregate states cua agg_5m_by_scope_metric thanh
--   query-facing view cho chart 24h, 7d va degradation analysis.
-- TANG DU LIEU PHUC VU:
--   05_window_aggregates / mid-term trend / finalized 5m view
-- PHU THUOC:
--   - telemetry_db.agg_5m_by_scope_metric
-- DAU RA CHINH:
--   - telemetry_db.v_agg_5m_by_scope_metric
-- GHI CHU:
--   Giu schema output giong source-of-truth trong clickhouse.sql
--   de frontend/dashboard query khong bi vo.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.v_agg_5m_by_scope_metric;

CREATE VIEW telemetry_db.v_agg_5m_by_scope_metric AS
SELECT
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric,

    countMerge(sample_count_state) AS sample_count,
    minMerge(first_ts_state) AS first_ts,
    maxMerge(last_ts_state) AS last_ts,

    minMerge(value_min_state) AS value_min,
    maxMerge(value_max_state) AS value_max,
    avgMerge(value_avg_state) AS value_avg,
    sumMerge(value_sum_state) AS value_sum,
    quantileTDigestMerge(0.95)(value_p95_state) AS value_p95,
    argMaxMerge(value_last_state) AS value_last,

    argMaxMerge(text_last_state) AS text_last,

    sumMerge(warning_sample_count_state) AS warning_sample_count,
    sumMerge(critical_sample_count_state) AS critical_sample_count,
    sumMerge(bad_sample_count_state) AS bad_sample_count,
    maxMerge(max_severity_code_state) AS max_severity_code

FROM telemetry_db.agg_5m_by_scope_metric
GROUP BY
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric;

-- TEST GOI Y
-- SELECT * FROM telemetry_db.v_agg_5m_by_scope_metric;

-- SELECT
--     bucket_start,
--     value_avg,
--     value_max,
--     value_p95,
--     value_last,
--     max_severity_code
-- FROM telemetry_db.v_agg_5m_by_scope_metric
-- WHERE scope_type = 'node'
--   AND scope_id = 'node-msi-838958db'
--   AND metric_key = 'node.cpu_usage_pct'
--   AND bucket_start >= now() - INTERVAL 24 HOUR
-- ORDER BY bucket_start;
