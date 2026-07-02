-- =========================================================
-- FILE NAME: 06_mv_node_fingerprint_raw_to_latest_agg.sql
-- MUC DICH:
--   Materialize latest fingerprint state tu node_fingerprint_raw
--   vao node_fingerprint_latest_agg.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / fingerprint latest-known aggregate
-- PHU THUOC:
--   - telemetry_db.node_fingerprint_raw
--   - telemetry_db.node_fingerprint_latest_agg
-- DAU RA CHINH:
--   - telemetry_db.mv_node_fingerprint_raw_to_latest_agg
-- =========================================================

USE telemetry_db;

-- MV nay ghi nho fingerprint moi nhat cua moi node theo aggregate state.
DROP VIEW IF EXISTS telemetry_db.mv_node_fingerprint_raw_to_latest_agg;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_node_fingerprint_raw_to_latest_agg
TO telemetry_db.node_fingerprint_latest_agg
AS
SELECT
    scope_type,
    scope_id,

    maxState(observed_at) AS latest_ts_state,

    argMaxState(battery_model, tuple(observed_at, batch_sequence, agent_id)) AS battery_model_state,
    argMaxState(cpu_architecture, tuple(observed_at, batch_sequence, agent_id)) AS cpu_architecture_state,
    argMaxState(cpu_model, tuple(observed_at, batch_sequence, agent_id)) AS cpu_model_state,
    argMaxState(gpu_model_primary, tuple(observed_at, batch_sequence, agent_id)) AS gpu_model_primary_state,
    argMaxState(hardware_serial, tuple(observed_at, batch_sequence, agent_id)) AS hardware_serial_state,
    argMaxState(logical_cpu_count, tuple(observed_at, batch_sequence, agent_id)) AS logical_cpu_count_state,
    argMaxState(mac_address, tuple(observed_at, batch_sequence, agent_id)) AS mac_address_state,
    argMaxState(motherboard_model, tuple(observed_at, batch_sequence, agent_id)) AS motherboard_model_state,
    argMaxState(os_product, tuple(observed_at, batch_sequence, agent_id)) AS os_product_state,
    argMaxState(primary_ipv4, tuple(observed_at, batch_sequence, agent_id)) AS primary_ipv4_state,
    argMaxState(ssd_model_primary, tuple(observed_at, batch_sequence, agent_id)) AS ssd_model_primary_state
FROM telemetry_db.node_fingerprint_raw
GROUP BY scope_type, scope_id;
