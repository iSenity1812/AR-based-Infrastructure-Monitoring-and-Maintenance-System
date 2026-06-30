-- =========================================================
-- FILE NAME: 01_latest_state_by_scope_table.sql
-- MUC DICH:
--   Khai bao bang aggregating state luu last-seen theo
--   scope + metric + series.
-- TANG DU LIEU PHUC VU:
--   02_latest_state / latest-known technical state
-- PHU THUOC:
--   - telemetry_db.telemetry_metrics
-- DAU RA CHINH:
--   - telemetry_db.latest_state_by_scope
-- GHI CHU:
--   Day la last-seen store tong quat cho moi scope, chua phai live state.
--   Current/live semantics se duoc dien giai o cac tang phia tren.
-- =========================================================

USE telemetry_db;

-- Bang nay luu aggregate state de truy hoi nhanh "lan cuoi cung thay gi".
-- Moi dong dai dien cho mot scope + metric + series cu the.
DROP TABLE IF EXISTS telemetry_db.latest_state_by_scope;

CREATE TABLE IF NOT EXISTS telemetry_db.latest_state_by_scope (
    scope_type LowCardinality(String),
    scope_id String,
    metric_key LowCardinality(String),

    series_key UInt64,
    tags_json String,

    unit LowCardinality(String),
    source LowCardinality(String),
    source_metric String,

    latest_ts_state AggregateFunction(max, DateTime),
    latest_numeric_state AggregateFunction(argMax, Float64, Tuple(DateTime, Int32, String)),
    latest_text_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    latest_unit_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    latest_source_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    latest_source_metric_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    sample_count_state AggregateFunction(count, UInt8)
)
ENGINE = AggregatingMergeTree()
ORDER BY (
    scope_type,
    scope_id,
    metric_key,
    series_key
);
