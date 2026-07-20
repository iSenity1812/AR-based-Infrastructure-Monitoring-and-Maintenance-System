-- =========================================================
-- FILE NAME: 04_agg_5m_by_scope_metric.sql
-- MUC DICH:
--   Khai bao bang aggregate state bucket 5 phut cho tung
--   scope + metric + series.
-- TANG DU LIEU PHUC VU:
--   05_window_aggregates / mid-term trend / 5m bucket
-- PHU THUOC:
--   - telemetry_db.telemetry_metrics
-- DAU RA CHINH:
--   - telemetry_db.agg_5m_by_scope_metric
-- GHI CHU:
--   Day la tang chart-serving cho 24h, 7d va sustained degradation analysis.
-- =========================================================

USE telemetry_db;

-- Moi dong trong bang nay dai dien cho:
-- 1 bucket 5 phut cua 1 metric cua 1 series cu the.
DROP TABLE IF EXISTS telemetry_db.agg_5m_by_scope_metric;

CREATE TABLE IF NOT EXISTS telemetry_db.agg_5m_by_scope_metric
(
    bucket_start DateTime('Asia/Ho_Chi_Minh'),

    scope_type LowCardinality(String),
    scope_id String,
    metric_key LowCardinality(String),

    series_key UInt64,
    tags_json String,

    semantic_class LowCardinality(String),
    is_numeric_metric UInt8,

    sample_count_state AggregateFunction(count, UInt8),
    first_ts_state AggregateFunction(min, DateTime('Asia/Ho_Chi_Minh')),
    last_ts_state AggregateFunction(max, DateTime('Asia/Ho_Chi_Minh')),

    value_min_state AggregateFunction(min, Float64),
    value_max_state AggregateFunction(max, Float64),
    value_avg_state AggregateFunction(avg, Float64),
    value_sum_state AggregateFunction(sum, Float64),
    value_p95_state AggregateFunction(quantileTDigest(0.95), Float64),
    value_last_state AggregateFunction(argMax, Float64, DateTime('Asia/Ho_Chi_Minh')),

    text_last_state AggregateFunction(argMax, String, DateTime('Asia/Ho_Chi_Minh')),

    warning_sample_count_state AggregateFunction(sum, UInt64),
    critical_sample_count_state AggregateFunction(sum, UInt64),
    bad_sample_count_state AggregateFunction(sum, UInt64),
    max_severity_code_state AggregateFunction(max, UInt8)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(bucket_start)
ORDER BY (
    scope_type,
    scope_id,
    metric_key,
    series_key,
    bucket_start
);
