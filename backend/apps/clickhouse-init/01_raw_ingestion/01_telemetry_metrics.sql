-- =========================================================
-- FILE NAME: 01_telemetry_metrics.sql
-- MUC DICH:
--   Khai bao bang raw telemetry da duoc normalize theo tung metric.
-- TANG DU LIEU PHUC VU:
--   01_raw_ingestion / raw metric fact store
-- PHU THUOC:
--   - telemetry_db da duoc tao truoc
-- DAU RA CHINH:
--   - telemetry_db.telemetry_metrics
-- GHI CHU:
--   Day la bang fact goc cho moi metric sau khi tach tu payload JSON.
--   Cac tang latest-state, node serving, aggregate 1m/5m deu doc tu day.
-- =========================================================

USE telemetry_db;

-- Bang nay luu moi metric thanh mot dong rieng voi:
-- scope, metric key, timestamp, value, tags, series identity.
DROP TABLE IF EXISTS telemetry_db.telemetry_metrics;

CREATE TABLE IF NOT EXISTS telemetry_db.telemetry_metrics (
    agent_id String,
    batch_sequence Int32,
    metric_key LowCardinality (String),
    scope_type LowCardinality (String),
    scope_id String,
    metric_timestamp DateTime('Asia/Ho_Chi_Minh'),
    metric_value_numeric Float64,
    metric_value_text String,
    unit LowCardinality (String),
    source LowCardinality (String),
    source_metric String,
    tags Map (String, String),
    tags_json String,
    series_key String
) ENGINE = MergeTree ()
PARTITION BY
    toYYYYMM (metric_timestamp)
ORDER BY (
        scope_type, scope_id, metric_key, series_key, metric_timestamp
    );

-- TTL cho bảng telemetry_metrics để tự động xóa dữ liệu cũ hơn 7 ngày
ALTER TABLE telemetry_db.telemetry_metrics
MODIFY TTL metric_timestamp + INTERVAL 7 DAY;