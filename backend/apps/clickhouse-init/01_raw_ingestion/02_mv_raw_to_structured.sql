-- =========================================================
-- FILE NAME: 02_mv_raw_to_structured.sql
-- MUC DICH:
--   Chuyen payload JSON tu normalized_telemetry_queue thanh
--   cac dong metric co cau truc trong telemetry_metrics.
-- TANG DU LIEU PHUC VU:
--   01_raw_ingestion / raw metric projection
-- PHU THUOC:
--   - telemetry_db.normalized_telemetry_queue
--   - telemetry_db.telemetry_metrics
-- DAU RA CHINH:
--   - telemetry_db.mv_raw_to_structured
-- GHI CHU:
--   MV nay ARRAY JOIN tung metric trong payload, canonicalize tags,
--   va sinh series_key de nhan dien tung chuoi metric.
-- =========================================================

USE telemetry_db;

-- Materialized view nay la cau noi tu payload JSON sang bang fact raw.
-- Moi metric trong mang metrics[] se tro thanh mot dong trong telemetry_metrics.
DROP VIEW IF EXISTS telemetry_db.mv_raw_to_structured;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_raw_to_structured
TO telemetry_db.telemetry_metrics
AS
SELECT
    JSONExtractString(payload, 'agent_id') AS agent_id,
    toInt32(JSONExtractInt(payload, 'batch_sequence')) AS batch_sequence,

    JSONExtractString(metric, 'metricKey') AS metric_key,
    JSONExtractString(metric, 'scopeType') AS scope_type,
    JSONExtractString(metric, 'scopeId') AS scope_id,

    toTimeZone(
        parseDateTimeBestEffort(JSONExtractString(metric, 'timestamp')),
        'Asia/Ho_Chi_Minh'
    ) AS metric_timestamp,

    JSONExtractFloat(metric, 'value') AS metric_value_numeric,
    JSONExtractString(metric, 'value') AS metric_value_text,

    JSONExtractString(metric, 'unit') AS unit,
    JSONExtractString(metric, 'source') AS source,
    JSONExtractString(metric, 'sourceMetric') AS source_metric,

    JSONExtract(metric, 'tags', 'Map(String, String)') AS tags,
    toJSONString(mapSort(JSONExtract(metric, 'tags', 'Map(String, String)'))) AS tags_json,

    cityHash64(
        JSONExtractString(metric, 'scopeType'),
        JSONExtractString(metric, 'scopeId'),
        JSONExtractString(metric, 'metricKey'),
        toJSONString(mapSort(JSONExtract(metric, 'tags', 'Map(String, String)')))
    ) AS series_key
FROM telemetry_db.normalized_telemetry_queue
ARRAY JOIN JSONExtractArrayRaw(payload, 'metrics') AS metric;
