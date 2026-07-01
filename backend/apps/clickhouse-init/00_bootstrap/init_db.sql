CREATE DATABASE IF NOT EXISTS telemetry_db;

DROP DICTIONARY IF EXISTS telemetry_db.dict_node_topology;

DROP VIEW IF EXISTS telemetry_db.node_topology_current;

USE telemetry_db;

CREATE TABLE IF NOT EXISTS normalized_telemetry_queue (payload String) ENGINE = MergeTree
ORDER BY tuple ();

-- TTL cho bảng telemetry_metrics để tự động xóa dữ liệu cũ hơn 7 ngày
ALTER TABLE telemetry_db.telemetry_metrics
MODIFY TTL metric_timestamp + INTERVAL 7 DAY;

CREATE TABLE IF NOT EXISTS node_topology_base (
    node_id String,
    rack_id Nullable (String),
    updated_at DateTime64 (3, 'Asia/Ho_Chi_Minh') DEFAULT now64 (3, 'Asia/Ho_Chi_Minh')
) ENGINE = MergeTree
ORDER BY (node_id, updated_at);

CREATE VIEW node_topology_current AS
SELECT
    node_id,
    if(
        tupleElement (latest, 2) = 1,
        NULL,
        tupleElement (latest, 1)
    ) AS rack_id,
    tupleElement (latest, 3) AS updated_at
FROM (
        SELECT node_id, argMax (
                tuple (
                    ifNull(rack_id, ''), isNull(rack_id), updated_at
                ), updated_at
            ) AS latest
        FROM node_topology_base
        GROUP BY
            node_id
    );

CREATE DICTIONARY dict_node_topology (
    node_id String,
    rack_id Nullable (String)
) PRIMARY KEY node_id SOURCE (
    CLICKHOUSE (
        HOST 'localhost' PORT 9000 USER 'root' PASSWORD 'password' DB 'telemetry_db'
        TABLE 'node_topology_current'
    )
) LIFETIME (MIN 10 MAX 30) LAYOUT (HASHED ());