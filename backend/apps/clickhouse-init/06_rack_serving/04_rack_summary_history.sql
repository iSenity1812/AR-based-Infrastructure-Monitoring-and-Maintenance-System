-- =========================================================
-- FILE NAME: 04_rack_summary_history.sql
-- MUC DICH:
--   Khai bao bang lich su trang thai Rack da duoc materialize.
--   Bang nay luu aggregate states de co the nhan du lieu tu nhieu
--   lan insert trong cung bucket ma van merge dung theo rack.
-- TANG DU LIEU PHUC VU:
--   06_rack_serving / historical rack semantics / rack history storage
-- PHU THUOC:
--   - 05_window_aggregates/*
-- DAU RA CHINH:
--   - telemetry_db.rack_summary_history
-- GHI CHU:
--   - Bang nay hop nhat ca granularity 1m va 5m trong cung mot schema.
--   - Khong luu stale/unknown semantics lich su, vi do la current-time logic.
--   - De tranh dem lap node khi mot bucket duoc cap nhat nhieu dot,
--     cac chi so blast radius duoc luu duoi dang uniqExactState(node_id).
-- =========================================================

USE telemetry_db;

-- Xoa bang cu neu ton tai de tao lai theo schema materialized moi.
DROP TABLE IF EXISTS telemetry_db.rack_summary_history;

-- Bang aggregate states cho lich su trang thai Rack.
CREATE TABLE IF NOT EXISTS telemetry_db.rack_summary_history
(
    bucket_granularity LowCardinality(String),
    bucket_start DateTime('Asia/Ho_Chi_Minh'),
    rack_id String,

    summary_ts_state AggregateFunction(max, DateTime('Asia/Ho_Chi_Minh')),
    rack_severity_code_state AggregateFunction(max, UInt8),
    has_override_flag_state AggregateFunction(max, UInt8),

    total_nodes_state AggregateFunction(uniqExact, String),
    bad_nodes_state AggregateFunction(uniqExact, String),
    critical_nodes_state AggregateFunction(uniqExact, String),
    warning_nodes_state AggregateFunction(uniqExact, String),

    culprit_node_state AggregateFunction(
        argMax,
        String,
        Tuple(UInt8, UInt8, DateTime('Asia/Ho_Chi_Minh'))
    ),
    culprit_metric_key_state AggregateFunction(
        argMax,
        String,
        Tuple(UInt8, UInt8, DateTime('Asia/Ho_Chi_Minh'))
    ),
    culprit_metric_tags_json_state AggregateFunction(
        argMax,
        String,
        Tuple(UInt8, UInt8, DateTime('Asia/Ho_Chi_Minh'))
    ),
    culprit_metric_value_numeric_state AggregateFunction(
        argMax,
        Float64,
        Tuple(UInt8, UInt8, DateTime('Asia/Ho_Chi_Minh'))
    ),
    culprit_metric_value_text_state AggregateFunction(
        argMax,
        String,
        Tuple(UInt8, UInt8, DateTime('Asia/Ho_Chi_Minh'))
    )
)
ENGINE = AggregatingMergeTree()
PARTITION BY (bucket_granularity, toYYYYMM(bucket_start))
ORDER BY (
    bucket_granularity,
    rack_id,
    bucket_start
);
