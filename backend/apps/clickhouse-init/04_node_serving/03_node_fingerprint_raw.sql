-- =========================================================
-- FILE NAME: 03_node_fingerprint_raw.sql
-- MUC DICH:
--   Khai bao bang raw fingerprint metadata cua node.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / fingerprint raw / node identity metadata
-- PHU THUOC:
--   - telemetry_db.normalized_telemetry_queue
-- DAU RA CHINH:
--   - telemetry_db.node_fingerprint_raw
-- GHI CHU:
--   Fingerprint la metadata dinh danh va phan cung cua node,
--   khong phai time-series operational metric.
-- =========================================================

USE telemetry_db;

-- Bang nay luu du lieu fingerprint da tach tu top-level hardware_fingerprint
-- trong payload normalized.
DROP TABLE IF EXISTS telemetry_db.node_fingerprint_raw;

CREATE TABLE IF NOT EXISTS telemetry_db.node_fingerprint_raw (
    agent_id String,
    batch_sequence Int32,
    observed_at DateTime,

    scope_type LowCardinality(String),
    scope_id String,

    battery_model String,
    cpu_architecture String,
    cpu_model String,
    gpu_model_primary String,
    hardware_serial String,
    logical_cpu_count Int32,
    mac_address String,
    motherboard_model String,
    os_product String,
    primary_ipv4 String,
    ssd_model_primary String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(observed_at)
ORDER BY (scope_type, scope_id, observed_at);
