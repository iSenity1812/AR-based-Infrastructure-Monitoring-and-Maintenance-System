-- =========================================================
-- FILE NAME: 03_v_latest_state_by_scope.sql
-- MUC DICH:
--   Finalize aggregate states trong latest_state_by_scope thanh
--   latest-known view de cac tang phia tren co the doc de dang.
-- TANG DU LIEU PHUC VU:
--   02_latest_state / finalized latest-known view
-- PHU THUOC:
--   - telemetry_db.latest_state_by_scope
-- DAU RA CHINH:
--   - telemetry_db.v_latest_state_by_scope
-- GHI CHU:
--   View nay van la latest-known technical read model, chua phai
--   current-live operational state.
-- =========================================================

USE telemetry_db;

-- View nay merge cac aggregate states thanh mot projection latest-known
-- doc duoc boi cac tang node/service/container/rack serving phia tren.
DROP VIEW IF EXISTS telemetry_db.v_latest_state_by_scope;

CREATE VIEW telemetry_db.v_latest_state_by_scope AS
SELECT
    scope_type,
    scope_id,
    metric_key,

    series_key,
    tags_json,

    argMaxMerge(latest_unit_state) AS unit,
    argMaxMerge(latest_source_state) AS source,
    argMaxMerge(latest_source_metric_state) AS source_metric,

    maxMerge(latest_ts_state) AS latest_ts,
    argMaxMerge(latest_numeric_state) AS latest_value_numeric,
    argMaxMerge(latest_text_state) AS latest_value_text,

    countMerge(sample_count_state) AS sample_count
FROM telemetry_db.latest_state_by_scope
GROUP BY
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json;
