-- =========================================================
-- FILE NAME: 04_mv_raw_to_node_fingerprint_raw.sql
-- MUC DICH:
--   Tach node fingerprint tu normalized payload vao bang
--   node_fingerprint_raw.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / fingerprint raw projection
-- PHU THUOC:
--   - telemetry_db.normalized_telemetry_queue
--   - telemetry_db.node_fingerprint_raw
-- DAU RA CHINH:
--   - telemetry_db.mv_raw_to_node_fingerprint_raw
-- GHI CHU:
--   MV nay khong doc tu metrics[] ma doc truc tiep tu
--   top-level hardware_fingerprint cua payload.
-- =========================================================

USE telemetry_db;

-- Materialized view nay dua metadata fingerprint vao bang raw rieng
-- de tach khoi telemetry metrics van hanh.
DROP VIEW IF EXISTS telemetry_db.mv_raw_to_node_fingerprint_raw;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_raw_to_node_fingerprint_raw
TO telemetry_db.node_fingerprint_raw
AS
SELECT
    JSONExtractString(payload, 'agent_id') AS agent_id,
    toInt32(JSONExtractInt(payload, 'batch_sequence')) AS batch_sequence,
    parseDateTimeBestEffort(JSONExtractString(payload, 'timestamp')) AS observed_at,

    'node' AS scope_type,
    JSONExtractString(payload, 'agent_id') AS scope_id,

    JSONExtractString(payload, 'hardware_fingerprint', 'batteryModel') AS battery_model,
    JSONExtractString(payload, 'hardware_fingerprint', 'cpuArchitecture') AS cpu_architecture,
    JSONExtractString(payload, 'hardware_fingerprint', 'cpuModel') AS cpu_model,
    JSONExtractString(payload, 'hardware_fingerprint', 'gpuModelPrimary') AS gpu_model_primary,
    JSONExtractString(payload, 'hardware_fingerprint', 'hardwareSerial') AS hardware_serial,
    toInt32OrZero(JSONExtractString(payload, 'hardware_fingerprint', 'logicalCpuCount')) AS logical_cpu_count,
    JSONExtractString(payload, 'hardware_fingerprint', 'macAddress') AS mac_address,
    JSONExtractString(payload, 'hardware_fingerprint', 'motherboardModel') AS motherboard_model,
    JSONExtractString(payload, 'hardware_fingerprint', 'osProduct') AS os_product,
    JSONExtractString(payload, 'hardware_fingerprint', 'primaryIpv4') AS primary_ipv4,
    JSONExtractString(payload, 'hardware_fingerprint', 'ssdModelPrimary') AS ssd_model_primary
FROM telemetry_db.normalized_telemetry_queue;
