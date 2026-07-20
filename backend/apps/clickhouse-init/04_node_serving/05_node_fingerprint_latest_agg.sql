-- =========================================================
-- FILE NAME: 05_node_fingerprint_latest_agg.sql
-- MUC DICH:
--   Khai bao bang aggregate state luu latest fingerprint cua node.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / fingerprint latest-known aggregate
-- PHU THUOC:
--   - telemetry_db.node_fingerprint_raw
-- DAU RA CHINH:
--   - telemetry_db.node_fingerprint_latest_agg
-- GHI CHU:
--   Day la aggregate state cho fingerprint, tuong tu latest-known
--   nhung danh rieng cho metadata identity cua node.
-- =========================================================

USE telemetry_db;

-- Bang nay luu aggregate state de lay fingerprint moi nhat cua moi node.
DROP TABLE IF EXISTS telemetry_db.node_fingerprint_latest_agg;

CREATE TABLE IF NOT EXISTS telemetry_db.node_fingerprint_latest_agg (
    scope_type LowCardinality(String),
    scope_id String,

    latest_ts_state AggregateFunction(max, DateTime),

    battery_model_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    cpu_architecture_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    cpu_model_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    gpu_model_primary_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    hardware_serial_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    logical_cpu_count_state AggregateFunction(argMax, Int32, Tuple(DateTime, Int32, String)),
    mac_address_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    motherboard_model_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    os_product_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    primary_ipv4_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    ssd_model_primary_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String))
)
ENGINE = AggregatingMergeTree()
ORDER BY (scope_type, scope_id);
