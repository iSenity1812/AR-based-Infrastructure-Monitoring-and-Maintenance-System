-- =========================================================
-- FILE NAME: 07_node_fingerprint_latest.sql
-- MUC DICH:
--   Finalize latest fingerprint cua node thanh mot view doc duoc
--   cho dashboard detail va asset identity enrichment.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / fingerprint latest final view
-- PHU THUOC:
--   - telemetry_db.node_fingerprint_latest_agg
-- DAU RA CHINH:
--   - telemetry_db.node_fingerprint_latest
-- GHI CHU:
--   View nay khong tham gia ranking hay severity. No chi phuc vu
--   identity, detail panel, va enrich node context.
-- =========================================================

USE telemetry_db;

-- View nay finalize aggregate fingerprint state thanh mot dong moi node.
DROP VIEW IF EXISTS telemetry_db.node_fingerprint_latest;

CREATE VIEW telemetry_db.node_fingerprint_latest AS
SELECT
    scope_id AS node_id,
    maxMerge(latest_ts_state) AS latest_ts,

    argMaxMerge(battery_model_state) AS battery_model,
    argMaxMerge(cpu_architecture_state) AS cpu_architecture,
    argMaxMerge(cpu_model_state) AS cpu_model,
    argMaxMerge(gpu_model_primary_state) AS gpu_model_primary,
    argMaxMerge(hardware_serial_state) AS hardware_serial,
    argMaxMerge(logical_cpu_count_state) AS logical_cpu_count,
    argMaxMerge(mac_address_state) AS mac_address,
    argMaxMerge(motherboard_model_state) AS motherboard_model,
    argMaxMerge(os_product_state) AS os_product,
    argMaxMerge(primary_ipv4_state) AS primary_ipv4,
    argMaxMerge(ssd_model_primary_state) AS ssd_model_primary
FROM telemetry_db.node_fingerprint_latest_agg
GROUP BY scope_id;

-- TEST GOI Y
-- SELECT * FROM telemetry_db.node_fingerprint_latest;
