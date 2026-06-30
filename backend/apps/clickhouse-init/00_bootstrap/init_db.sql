CREATE DATABASE IF NOT EXISTS telemetry_db;

USE telemetry_db;

CREATE TABLE IF NOT EXISTS normalized_telemetry_queue (
    payload String
) ENGINE = MergeTree
ORDER BY tuple();
