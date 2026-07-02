-- =========================================================
-- FILE NAME: 02_mv_telemetry_to_latest_state_by_scope.sql
-- MUC DICH:
--   Materialize last-seen aggregate tu telemetry_metrics vao
--   latest_state_by_scope.
-- TANG DU LIEU PHUC VU:
--   02_latest_state / latest-known technical state
-- PHU THUOC:
--   - telemetry_db.telemetry_metrics
--   - telemetry_db.latest_state_by_scope
-- DAU RA CHINH:
--   - telemetry_db.mv_telemetry_to_latest_state_by_scope
-- GHI CHU:
--   MV nay khong ket luan fresh/stale. No chi ghi nho gia tri cuoi cung
--   da thay theo tung metric series.
-- =========================================================

USE telemetry_db;

-- Materialized view nay group raw telemetry theo scope + metric + series
-- de cap nhat bang latest_state_by_scope dang AggregatingMergeTree.
DROP VIEW IF EXISTS telemetry_db.mv_telemetry_to_latest_state_by_scope;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_telemetry_to_latest_state_by_scope
TO telemetry_db.latest_state_by_scope
AS
SELECT
    scope_type,
    scope_id,
    metric_key,
    toUInt64(series_key) AS series_key,
    tags_json,
    unit,
    source,
    source_metric,
    maxState(metric_timestamp) AS latest_ts_state,
    argMaxState(
        metric_value_numeric,
        tuple(metric_timestamp, batch_sequence, agent_id)
    ) AS latest_numeric_state,
    argMaxState(
        metric_value_text,
        tuple(metric_timestamp, batch_sequence, agent_id)
    ) AS latest_text_state,
    argMaxState(
        unit,
        tuple(metric_timestamp, batch_sequence, agent_id)
    ) AS latest_unit_state,
    argMaxState(
        source,
        tuple(metric_timestamp, batch_sequence, agent_id)
    ) AS latest_source_state,
    argMaxState(
        source_metric,
        tuple(metric_timestamp, batch_sequence, agent_id)
    ) AS latest_source_metric_state,
    countState() AS sample_count_state
FROM telemetry_db.telemetry_metrics
GROUP BY
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    unit,
    source,
    source_metric;
