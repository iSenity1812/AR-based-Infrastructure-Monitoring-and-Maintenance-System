-- =========================================================
-- FILE NAME: 11_service_summary_history.sql
-- MUC DICH:
--   Khai bao bang lich su trang thai Service da duoc materialize.
--   Bang nay luu aggregate states theo bucket 1m/5m de query truc tiep
--   lich su service ma khong can tinh lai tu aggregate thap hon.
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / historical service semantics / storage
-- PHU THUOC:
--   - 05_window_aggregates/*
--   - 07_container_service_serving/09_service_summary_trend_1m.sql
--   - 07_container_service_serving/10_service_summary_trend_5m.sql
-- DAU RA CHINH:
--   - telemetry_db.service_summary_history
-- GHI CHU:
--   - Bang nay hop nhat granularity 1m va 5m trong cung mot schema.
--   - Muc tieu la luu snapshot da duoc roll-up o tang service.
--   - Khi cung bucket duoc materialize nhieu lan, gia tri se duoc chot
--     theo snapshot co summary_ts moi nhat thay vi cong don nguyen xi.
-- =========================================================

USE telemetry_db;

-- Xoa bang cu neu ton tai de tao lai theo schema modular moi.
DROP TABLE IF EXISTS telemetry_db.service_summary_history;

-- Bang aggregate states cho lich su trang thai Service.
CREATE TABLE IF NOT EXISTS telemetry_db.service_summary_history
(
    bucket_granularity LowCardinality(String),
    bucket_start DateTime('Asia/Ho_Chi_Minh'),
    service_id String,

    service_name_state AggregateFunction(
        argMax,
        String,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    summary_ts_state AggregateFunction(max, DateTime('Asia/Ho_Chi_Minh')),
    service_severity_code_state AggregateFunction(
        argMax,
        UInt8,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    has_override_flag_state AggregateFunction(
        argMax,
        UInt8,
        DateTime('Asia/Ho_Chi_Minh')
    ),

    service_container_count_current_state AggregateFunction(
        argMax,
        Float64,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    service_running_container_count_current_state AggregateFunction(
        argMax,
        Float64,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    running_container_ratio_current_state AggregateFunction(
        argMax,
        Float64,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    cpu_usage_pct_sum_current_state AggregateFunction(
        argMax,
        Float64,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    memory_used_bytes_sum_current_state AggregateFunction(
        argMax,
        Float64,
        DateTime('Asia/Ho_Chi_Minh')
    ),

    total_containers_state AggregateFunction(
        argMax,
        UInt32,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    running_containers_state AggregateFunction(
        argMax,
        UInt32,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    bad_containers_state AggregateFunction(
        argMax,
        UInt32,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    critical_containers_state AggregateFunction(
        argMax,
        UInt32,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    non_running_containers_state AggregateFunction(
        argMax,
        UInt32,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    bad_container_ratio_state AggregateFunction(
        argMax,
        Float64,
        DateTime('Asia/Ho_Chi_Minh')
    ),
    is_service_level_failure_state AggregateFunction(
        argMax,
        UInt8,
        DateTime('Asia/Ho_Chi_Minh')
    ),

    culprit_container_state AggregateFunction(
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
    service_id,
    bucket_start
);
