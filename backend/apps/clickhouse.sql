select * from telemetry_db.test_insert;
show tables in telemetry_db;

select * from telemetry_db.normalized_telemetry_queue LIMIT 1;
select * from telemetry_db.normalized_telemetry_queue;

---- TELEMETRY METRICS ----
USE telemetry_db;
DROP TABLE IF EXISTS telemetry_db.telemetry_metrics;

CREATE TABLE IF NOT EXISTS telemetry_db.telemetry_metrics (
    agent_id String,
    batch_sequence Int32,

    metric_key LowCardinality(String),
    scope_type LowCardinality(String),
    scope_id String,

    metric_timestamp DateTime,

    metric_value_numeric Float64,
    metric_value_text String,

    unit LowCardinality(String),
    source LowCardinality(String),
    source_metric String,

    tags Map(String, String),

    tags_json String,
    series_key String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(metric_timestamp)
ORDER BY (
    scope_type,
    scope_id,
    metric_key,
    series_key,
    metric_timestamp
);


SELECT * FROM telemetry_db.telemetry_metrics;


---- CODEX
USE telemetry_db;

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

    parseDateTimeBestEffort(JSONExtractString(metric, 'timestamp')) AS metric_timestamp,

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

SELECT * FROM telemetry_db.mv_raw_to_structured;


---- GEMINI

USE telemetry_db;
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_raw_to_structured TO telemetry_db.telemetry_metrics AS
SELECT
    JSONExtractString(payload, 'agent_id') AS agent_id,
    JSONExtractInt(payload, 'batch_sequence') AS batch_sequence,
    JSONExtractString(metric, 'metricKey') AS metric_key,
    JSONExtractString(metric, 'scopeType') AS scope_type,
    JSONExtractString(metric, 'scopeId') AS scope_id,
    parseDateTimeBestEffort(JSONExtractString(metric, 'timestamp')) AS metric_timestamp,
    JSONExtractFloat(metric, 'value') AS metric_value_numeric,
    JSONExtractString(metric, 'value') AS metric_value_text,
    JSONExtract(metric, 'tags', 'Map(String, String)') AS tags
FROM telemetry_db.normalized_telemetry_queue 
ARRAY JOIN JSONExtractArrayRaw(payload, 'metrics') AS metric;

SELECT * FROM telemetry_db.telemetry_metrics;

SELECT * FROM telemetry_db.telemetry_metrics 
WHERE metric_timestamp = (
    SELECT MAX(metric_timestamp)
    FROM telemetry_db.telemetry_metrics
);

SELECT MAX(batch_sequence) AS max_batch_sequence
FROM telemetry_db.telemetry_metrics;

SELECT COUNT(agent_id) FROM telemetry_db.telemetry_metrics;


SELECT COUNT(agent_id) FROM telemetry_db.telemetry_metrics;
SELECT * FROM telemetry_db.telemetry_metrics where batch_sequence = 1;


---- latest_state_by_scope

USE telemetry_db;

DROP TABLE IF EXISTS telemetry_db.latest_state_by_scope;

CREATE TABLE IF NOT EXISTS telemetry_db.latest_state_by_scope (
    scope_type LowCardinality(String),
    scope_id String,
    metric_key LowCardinality(String),

    series_key UInt64,
    tags_json String,

    unit LowCardinality(String),
    source LowCardinality(String),
    source_metric String,

    latest_ts_state AggregateFunction(max, DateTime),
    latest_numeric_state AggregateFunction(argMax, Float64, Tuple(DateTime, Int32, String)),
    latest_text_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    latest_unit_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    latest_source_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    latest_source_metric_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    sample_count_state AggregateFunction(count, UInt8)
)
ENGINE = AggregatingMergeTree()
ORDER BY (
    scope_type,
    scope_id,
    metric_key,
    series_key
);


----- LATEST -----
--- MUC DICH: BANG GHI NHO TRANG THAI CUOI CUNG HAY CON GOI LA LAST SEEN
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.mv_telemetry_to_latest_state_by_scope;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_telemetry_to_latest_state_by_scope
TO telemetry_db.latest_state_by_scope
AS
SELECT
    scope_type,
    scope_id,
    metric_key,
    series_key,
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

--- TEST----
SELECT * FROM telemetry_db.latest_state_by_scope;

SELECT
    scope_type,
    scope_id,
    metric_key,
    maxMerge(latest_ts_state) AS latest_ts,
    argMaxMerge(latest_numeric_state) AS latest_numeric,
    argMaxMerge(latest_text_state) AS latest_text,
    argMaxMerge(latest_unit_state) AS latest_unit,
    argMaxMerge(latest_source_state) AS latest_source,
    argMaxMerge(latest_source_metric_state) AS latest_source_metric,
    countMerge(sample_count_state) AS sample_count
FROM telemetry_db.latest_state_by_scope
GROUP BY scope_type, scope_id, metric_key;
HAVING latest_source_metric LIKE 'lhm.cpu.temperature';
---------------

--- VIEW FOR LATEST STATE BY SCOPE
USE telemetry_db;

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

    
---- TEST -----
--- SELECT ALL
SELECT *
FROM telemetry_db.v_latest_state_by_scope;

--- QUERY CPU/MEMORY/DISK
SELECT *
FROM telemetry_db.v_latest_state_by_scope
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key IN (
      'node.cpu_usage_pct',
      'node.memory_used_pct',
      'node.disk_used_pct'
  );
  
SELECT metric_key, scope_id, series_key, tags_json, metric_value_numeric, metric_timestamp
FROM telemetry_db.telemetry_metrics
WHERE metric_key = 'container.network_rx_bytes_sec'
  AND scope_id = '5061f8fc3ae9c2dd74e77c2c01f31fb44e334cc4d08a7446e47929a894dbbbce'
ORDER BY metric_timestamp DESC
LIMIT 20;





------------ NODE LATEST STATE -------
---- VAN LA LAST SEEN

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.node_latest_state;

CREATE VIEW telemetry_db.node_latest_state AS
SELECT
    scope_id AS node_id,
    metric_key,
    series_key,

    tags_json,

    unit,
    source,
    source_metric,

    latest_ts,
    latest_value_numeric,
    latest_value_text,
    sample_count,

    multiIf(
        metric_key IN (
            'node.primary_nic_status',
            'node.uptime_seconds'
        ), 'state',

        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.memory_available_mb',
            'node.memory_commit_used_pct',
            'node.disk_used_pct',
            'node.disk_free_gb',
            'node.network_rx_bytes_sec',
            'node.network_tx_bytes_sec',
            'node.network_utilization_pct',
            'node.gpu_core_load_pct'
        ), 'utilization',

        metric_key IN (
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct',
            'node.tcp_connection_failures_rate',
            'node.cpu_dpc_rate'
        ), 'symptom',

        metric_key IN (
            'node.cpu_temperature_c',
            'node.cpu_package_power_w',
            'node.gpu_core_clock_mhz',
            'node.gpu_memory_clock_mhz',
            'node.ssd_temperature_c',
            'node.ssd_life_pct',
            'node.ssd_available_spare_pct',
            'node.ssd_percentage_used_pct'
        ), 'hardware_risk',

        'inventory'
    ) AS semantic_class,

    multiIf(
        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.disk_used_pct',
            'node.primary_nic_status',
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct',
            'node.cpu_temperature_c',
            'node.ssd_temperature_c'
        ), 1,
        0
    ) AS is_operational_metric

FROM telemetry_db.v_latest_state_by_scope
WHERE scope_type = 'node'
  AND metric_key IN (
        'node.cpu_usage_pct',
        'node.memory_used_pct',
        'node.memory_available_mb',
        'node.memory_commit_used_pct',
        'node.disk_used_pct',
        'node.disk_free_gb',
        'node.network_rx_bytes_sec',
        'node.network_tx_bytes_sec',
        'node.network_utilization_pct',
        'node.primary_nic_status',
        'node.uptime_seconds',

        'node.cpu_queue_length',
        'node.disk_queue_length',
        'node.memory_page_faults_rate',
        'node.tcp_retransmit_pct',
        'node.tcp_connection_failures_rate',
        'node.cpu_dpc_rate',

        'node.cpu_temperature_c',
        'node.cpu_package_power_w',
        'node.gpu_core_load_pct',
        'node.gpu_core_clock_mhz',
        'node.gpu_memory_clock_mhz',
        'node.ssd_temperature_c',
        'node.ssd_life_pct',
        'node.ssd_available_spare_pct',
        'node.ssd_percentage_used_pct',

        'node.hostname',
        'node.os_product',
        'node.primary_ipv4',
        'node.logical_cpu_count',
        'node.process_count',
        'node.cpu_core_frequency_mhz',
        'node.ssd_power_on_hours',
        'node.ssd_power_on_count',
        'node.ssd_data_read_gb',
        'node.ssd_data_written_gb'
  );

----- Lấy current/latest operational metrics của một node
SELECT
    node_id,
    metric_key,
    tags_json,
    latest_value_numeric,
    latest_value_text,
    latest_ts,
    semantic_class
FROM telemetry_db.node_latest_state
WHERE node_id = 'node-msi-838958db'
  AND is_operational_metric = 1
ORDER BY metric_key, tags_json;


------Lấy các disk metrics của toàn bộ node:
SELECT
    node_id,
    metric_key,
    tags_json,
    latest_value_numeric,
    latest_ts
FROM telemetry_db.node_latest_state
WHERE metric_key LIKE 'node.disk%'
ORDER BY node_id, metric_key, tags_json;


------ Symptom metrics
SELECT
    node_id,
    metric_key,
    tags_json,
    latest_value_numeric,
    latest_ts
FROM telemetry_db.node_latest_state
WHERE semantic_class = 'symptom'
ORDER BY node_id, metric_key;





----------- NODE LIVE METRICS
---- “ở thời điểm hiện tại, metric này còn đáng tin để dùng cho vận hành không?”
---- “nó đang healthy, warning, critical, hay stale?”
---- “metric này có đủ nghiêm trọng để ảnh hưởng ranking không?”

---- Phuc vu: dashboard current state, node severity, stale detection, INPUT CHO RACK SUMMARY, xac dinh culprit metrics

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.node_current_live;

CREATE VIEW telemetry_db.node_current_live AS
SELECT
    node_id,
    metric_key,
    series_key,
    tags_json,

    unit,
    source,
    source_metric,

    latest_ts,
    latest_value_numeric,
    latest_value_text,
    sample_count,

    semantic_class,
    is_operational_metric,

    dateDiff('second', latest_ts, now()) AS stale_age_sec,

    multiIf(
        dateDiff('second', latest_ts, now()) <= 30, 0,
        dateDiff('second', latest_ts, now()) <= 120, 1,
        2
    ) AS freshness_code,

    multiIf(
        dateDiff('second', latest_ts, now()) <= 30, 'fresh',
        dateDiff('second', latest_ts, now()) <= 120, 'stale',
        'unknown'
    ) AS live_state,

    if(dateDiff('second', latest_ts, now()) > 30, 1, 0) AS is_stale,

    multiIf(
        dateDiff('second', latest_ts, now()) > 120, 4,

        metric_key = 'node.primary_nic_status'
            AND lower(latest_value_text) IN ('down', 'notpresent', 'disconnected'), 3,

        metric_key = 'node.primary_nic_status'
            AND lower(latest_value_text) IN ('dormant', 'lowerlayerdown'), 2,

        metric_key = 'node.cpu_usage_pct'
            AND latest_value_numeric >= 95, 3,
        metric_key = 'node.cpu_usage_pct'
            AND latest_value_numeric >= 85, 2,

        metric_key = 'node.memory_used_pct'
            AND latest_value_numeric >= 95, 3,
        metric_key = 'node.memory_used_pct'
            AND latest_value_numeric >= 85, 2,

        metric_key = 'node.disk_used_pct'
            AND latest_value_numeric >= 95, 3,
        metric_key = 'node.disk_used_pct'
            AND latest_value_numeric >= 85, 2,

        metric_key = 'node.cpu_queue_length'
            AND latest_value_numeric >= 10, 3,
        metric_key = 'node.cpu_queue_length'
            AND latest_value_numeric >= 4, 2,

        metric_key = 'node.disk_queue_length'
            AND latest_value_numeric >= 5, 3,
        metric_key = 'node.disk_queue_length'
            AND latest_value_numeric >= 2, 2,

        metric_key = 'node.memory_page_faults_rate'
            AND latest_value_numeric >= 20000, 3,
        metric_key = 'node.memory_page_faults_rate'
            AND latest_value_numeric >= 5000, 2,

        metric_key = 'node.tcp_retransmit_pct'
            AND latest_value_numeric >= 5, 3,
        metric_key = 'node.tcp_retransmit_pct'
            AND latest_value_numeric >= 1, 2,

        metric_key = 'node.tcp_connection_failures_rate'
            AND latest_value_numeric > 10, 3,
        metric_key = 'node.tcp_connection_failures_rate' 
            AND latest_value_numeric > 0, 2,

        metric_key = 'node.cpu_temperature_c'
            AND latest_value_numeric >= 95, 3,
        metric_key = 'node.cpu_temperature_c'
            AND latest_value_numeric >= 85, 2,

        metric_key = 'node.ssd_temperature_c'
            AND latest_value_numeric >= 80, 3,
        metric_key = 'node.ssd_temperature_c'
            AND latest_value_numeric >= 70, 2,

        metric_key = 'node.ssd_life_pct'
            AND latest_value_numeric <= 10, 3,
        metric_key = 'node.ssd_life_pct'
            AND latest_value_numeric <= 20, 2,

        metric_key = 'node.ssd_available_spare_pct'
            AND latest_value_numeric <= 10, 3,
        metric_key = 'node.ssd_available_spare_pct'
            AND latest_value_numeric <= 20, 2,

        0
    ) AS severity_code,

    multiIf(
        dateDiff('second', latest_ts, now()) > 120, 1,

        metric_key = 'node.primary_nic_status'
            AND lower(latest_value_text) IN ('down', 'notpresent', 'disconnected'), 1,

        metric_key = 'node.cpu_usage_pct'
            AND latest_value_numeric >= 95, 1,

        metric_key = 'node.memory_used_pct'
            AND latest_value_numeric >= 95, 1,

        metric_key = 'node.disk_used_pct'
            AND latest_value_numeric >= 95, 1,

        metric_key = 'node.cpu_queue_length'
            AND latest_value_numeric >= 10, 1,

        metric_key = 'node.disk_queue_length'
            AND latest_value_numeric >= 5, 1,

        metric_key = 'node.tcp_retransmit_pct'
            AND latest_value_numeric >= 5, 1,

        metric_key = 'node.cpu_temperature_c'
            AND latest_value_numeric >= 95, 1,

        metric_key = 'node.ssd_temperature_c'
            AND latest_value_numeric >= 80, 1,

        0
    ) AS override_flag,

    multiIf(
        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.disk_used_pct',
            'node.primary_nic_status',
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct',
            'node.cpu_temperature_c',
            'node.ssd_temperature_c'
        ), 1,
        0
    ) AS is_ranking_metric

FROM telemetry_db.node_latest_state;


---- Select node voi severity > 2
-- quy uoc:
-- live_state
-- fresh
-- stale
-- unknown

-- severity_code
-- 0 = healthy
-- 1 = info
-- 2 = warning
-- 3 = critical
-- 4 = stale

-- override_flag
-- 1 nếu metric đủ nghiêm trọng để kéo node/rack lên ưu tiên cao
SELECT
    node_id,
    metric_key,
    tags_json,
    latest_value_numeric,
    latest_value_text,
    live_state,
    severity_code,
    override_flag,
    latest_ts
FROM telemetry_db.node_current_live
WHERE node_id = 'node-msi-838958db'
  AND severity_code >= 2
ORDER BY severity_code DESC, metric_key;


-- metric stale
SELECT
    node_id,
    metric_key,
    tags_json,
    latest_ts,
    stale_age_sec,
    live_state
FROM telemetry_db.node_current_live
WHERE is_stale = 1
ORDER BY stale_age_sec DESC;

-- node có metric critical
SELECT
    node_id,
    metric_key,
    tags_json,
    latest_value_numeric,
    latest_value_text,
    severity_code,
    override_flag
FROM telemetry_db.node_current_live
WHERE severity_code = 3
ORDER BY node_id, metric_key;







------ NODE FINGERPRINT
USE telemetry_db;

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


--- MV from NORMALIZED PAYLOAD --> FINGERPRINT RAW
SHOW TABLES IN telemetry_db;
USE telemetry_db;

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

-- aggregate latest fingerprint
USE telemetry_db;

DROP TABLE IF EXISTS telemetry_db.node_fingerprint_latest_agg;

CREATE TABLE IF NOT EXISTS telemetry_db.node_fingerprint_latest_agg (
    scope_type LowCardinality(String),
    scope_id String,

    latest_ts_state AggregateFunction(max, DateTime),

    battery_model_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    cpu_architecture_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    cpu_model_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    gpu_model_primary_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    hardware_serial_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    logical_cpu_count_state AggregateFunction(argMax, Int32, Tuple(DateTime, Int32, String)),
    mac_address_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    motherboard_model_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    os_product_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    primary_ipv4_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String)),
    ssd_model_primary_state AggregateFunction(argMax, String, Tuple(DateTime, Int32, String))
)
ENGINE = AggregatingMergeTree()
ORDER BY (scope_type, scope_id);


-- MV FOR AGGREGATE LATEST FINGERPRINT
USE telemetry_db;

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



-- FINAL VIEW LATEST FINGERPRINT
USE telemetry_db;

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

--- TEST
SELECT * FROM telemetry_db.node_fingerprint_latest




--- NODE CURRENT SUMMARY
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.node_current_summary;

CREATE VIEW telemetry_db.node_current_summary AS
WITH base AS (
    SELECT *
    FROM telemetry_db.node_current_live
),
worst_metric AS (
    SELECT
        node_id,
        argMax(metric_key, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_key,
        argMax(tags_json, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_tags_json,
        argMax(latest_value_numeric, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_numeric_value,
        argMax(latest_value_text, tuple(severity_code, override_flag, latest_ts)) AS worst_metric_text_value
    FROM base
    GROUP BY node_id
)
SELECT
    b.node_id,
    max(b.latest_ts) AS summary_ts,

    max(b.severity_code) AS max_severity_code,
    max(b.override_flag) AS has_override_flag,

    max(b.is_stale) AS is_any_stale,
    countIf(b.is_stale = 1) AS stale_metric_count,
    countIf(b.severity_code = 3) AS critical_metric_count,
    countIf(b.severity_code = 2) AS warning_metric_count,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_usage_pct') AS cpu_usage_pct_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.memory_used_pct') AS memory_used_pct_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.uptime_seconds') AS uptime_seconds_current,

    maxIf(b.latest_value_text, b.metric_key = 'node.primary_nic_status') AS primary_nic_status_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_temperature_c') AS cpu_temperature_c_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.cpu_queue_length') AS cpu_queue_length_max_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.memory_page_faults_rate') AS memory_page_faults_rate_max_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.tcp_retransmit_pct') AS tcp_retransmit_pct_max_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.disk_used_pct') AS disk_used_pct_max_current,
    maxIf(b.latest_value_numeric, b.metric_key = 'node.disk_queue_length') AS disk_queue_length_max_current,

    sumIf(b.latest_value_numeric, b.metric_key = 'node.network_rx_bytes_sec') AS network_rx_bytes_sec_sum_current,
    sumIf(b.latest_value_numeric, b.metric_key = 'node.network_tx_bytes_sec') AS network_tx_bytes_sec_sum_current,

    maxIf(b.latest_value_numeric, b.metric_key = 'node.ssd_temperature_c') AS ssd_temperature_c_max_current,
    minIf(b.latest_value_numeric, b.metric_key = 'node.ssd_life_pct') AS ssd_life_pct_min_current,

    w.worst_metric_key,
    w.worst_metric_tags_json,
    w.worst_metric_numeric_value,
    w.worst_metric_text_value

FROM base b
LEFT JOIN worst_metric w
    ON b.node_id = w.node_id
GROUP BY
    b.node_id,
    w.worst_metric_key,
    w.worst_metric_tags_json,
    w.worst_metric_numeric_value,
    w.worst_metric_text_value;

--- TEST
SELECT * FROM telemetry_db.node_current_summary




------ agg_1m_by_scope_metric
--- MOI DONG:
--- 1 BUCKET 1 PHUT CHO 1 METRIC CUA 1 METRIC CUA 1 SERIES CU THE THEO TAG
--- SERVING CHART 1H, 6H, SUPPORT SPIKE DETECTION
USE telemetry_db;

DROP TABLE IF EXISTS telemetry_db.agg_1m_by_scope_metric;

CREATE TABLE IF NOT EXISTS telemetry_db.agg_1m_by_scope_metric
(
    bucket_start DateTime,

    scope_type LowCardinality(String),
    scope_id String,
    metric_key LowCardinality(String),

    series_key UInt64,
    tags_json String,

    semantic_class LowCardinality(String),
    is_numeric_metric UInt8,

    sample_count_state AggregateFunction(count, UInt8),
    first_ts_state AggregateFunction(min, DateTime),
    last_ts_state AggregateFunction(max, DateTime),

    value_min_state AggregateFunction(min, Float64),
    value_max_state AggregateFunction(max, Float64),
    value_avg_state AggregateFunction(avg, Float64),
    value_sum_state AggregateFunction(sum, Float64),
    value_p95_state AggregateFunction(quantileTDigest(0.95), Float64),
    value_p99_state AggregateFunction(quantileTDigest(0.99), Float64),
    value_last_state AggregateFunction(argMax, Float64, DateTime),

    text_last_state AggregateFunction(argMax, String, DateTime),

    warning_sample_count_state AggregateFunction(sum, UInt64),
    critical_sample_count_state AggregateFunction(sum, UInt64),
    bad_sample_count_state AggregateFunction(sum, UInt64),
    max_severity_code_state AggregateFunction(max, UInt8)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(bucket_start)
ORDER BY (
    scope_type,
    scope_id,
    metric_key,
    series_key,
    bucket_start
);

----- Materialized View telemetry_metrics => agg_1m_by_scope_metric
--- TU DONG TINH SERIES KEY, SEMANTIC CLASS, SEVERITY
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.mv_telemetry_metrics_to_agg_1m_by_scope_metric;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_telemetry_metrics_to_agg_1m_by_scope_metric
TO telemetry_db.agg_1m_by_scope_metric
AS
WITH
    toStartOfMinute(metric_timestamp) AS bucket_start,

    toJSONString(tags) AS tags_json,

    cityHash64(
        scope_type,
        scope_id,
        metric_key,
        toJSONString(tags)
    ) AS series_key,

    multiIf(
        metric_key IN (
            'node.primary_nic_status',
            'node.uptime_seconds'
        ), 'state',

        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.memory_available_mb',
            'node.memory_commit_used_pct',
            'node.disk_used_pct',
            'node.disk_free_gb',
            'node.network_rx_bytes_sec',
            'node.network_tx_bytes_sec',
            'node.network_utilization_pct',
            'node.gpu_core_load_pct'
        ), 'utilization',

        metric_key IN (
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct',
            'node.tcp_connection_failures_rate',
            'node.cpu_dpc_rate'
        ), 'symptom',

        metric_key IN (
            'node.cpu_temperature_c',
            'node.cpu_package_power_w',
            'node.gpu_core_clock_mhz',
            'node.gpu_memory_clock_mhz',
            'node.ssd_temperature_c',
            'node.ssd_life_pct',
            'node.ssd_available_spare_pct',
            'node.ssd_percentage_used_pct'
        ), 'hardware_risk',

        'inventory'
    ) AS semantic_class,

    if(
        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.memory_available_mb',
            'node.memory_commit_used_pct',
            'node.disk_used_pct',
            'node.disk_free_gb',
            'node.network_rx_bytes_sec',
            'node.network_tx_bytes_sec',
            'node.network_utilization_pct',
            'node.gpu_core_load_pct',
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct',
            'node.tcp_connection_failures_rate',
            'node.cpu_dpc_rate',
            'node.cpu_temperature_c',
            'node.cpu_package_power_w',
            'node.gpu_core_clock_mhz',
            'node.gpu_memory_clock_mhz',
            'node.ssd_temperature_c',
            'node.ssd_life_pct',
            'node.ssd_available_spare_pct',
            'node.ssd_percentage_used_pct',
            'node.uptime_seconds'
        ),
        1,
        0
    ) AS is_numeric_metric,

    multiIf(
        metric_key = 'node.primary_nic_status'
            AND lower(metric_value_text) IN ('down', 'notpresent', 'disconnected'), 3,

        metric_key = 'node.primary_nic_status'
            AND lower(metric_value_text) IN ('dormant', 'lowerlayerdown'), 2,

        metric_key = 'node.cpu_usage_pct'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.cpu_usage_pct'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.memory_used_pct'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.memory_used_pct'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.disk_used_pct'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.disk_used_pct'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.cpu_queue_length'
            AND metric_value_numeric >= 10, 3,
        metric_key = 'node.cpu_queue_length'
            AND metric_value_numeric >= 4, 2,

        metric_key = 'node.disk_queue_length'
            AND metric_value_numeric >= 5, 3,
        metric_key = 'node.disk_queue_length'
            AND metric_value_numeric >= 2, 2,

        metric_key = 'node.memory_page_faults_rate'
            AND metric_value_numeric >= 20000, 3,
        metric_key = 'node.memory_page_faults_rate'
            AND metric_value_numeric >= 5000, 2,

        metric_key = 'node.tcp_retransmit_pct'
            AND metric_value_numeric >= 5, 3,
        metric_key = 'node.tcp_retransmit_pct'
            AND metric_value_numeric >= 1, 2,

        metric_key = 'node.tcp_connection_failures_rate'
            AND metric_value_numeric > 10, 3,
        metric_key = 'node.tcp_connection_failures_rate'
            AND metric_value_numeric > 0, 2,

        metric_key = 'node.cpu_temperature_c'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.cpu_temperature_c'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.ssd_temperature_c'
            AND metric_value_numeric >= 80, 3,
        metric_key = 'node.ssd_temperature_c'
            AND metric_value_numeric >= 70, 2,

        metric_key = 'node.ssd_life_pct'
            AND metric_value_numeric <= 10, 3,
        metric_key = 'node.ssd_life_pct'
            AND metric_value_numeric <= 20, 2,

        metric_key = 'node.ssd_available_spare_pct'
            AND metric_value_numeric <= 10, 3,
        metric_key = 'node.ssd_available_spare_pct'
            AND metric_value_numeric <= 20, 2,

        0
    ) AS severity_code

SELECT
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric,

    countState() AS sample_count_state,
    minState(metric_timestamp) AS first_ts_state,
    maxState(metric_timestamp) AS last_ts_state,

    minState(metric_value_numeric) AS value_min_state,
    maxState(metric_value_numeric) AS value_max_state,
    avgState(metric_value_numeric) AS value_avg_state,
    sumState(metric_value_numeric) AS value_sum_state,
    quantileTDigestState(0.95)(metric_value_numeric) AS value_p95_state,
    quantileTDigestState(0.99)(metric_value_numeric) AS value_p99_state,
    argMaxState(metric_value_numeric, metric_timestamp) AS value_last_state,

    argMaxState(metric_value_text, metric_timestamp) AS text_last_state,

    sumState(toUInt64(severity_code = 2)) AS warning_sample_count_state,
    sumState(toUInt64(severity_code = 3)) AS critical_sample_count_state,
    sumState(toUInt64(severity_code >= 2)) AS bad_sample_count_state,
    maxState(toUInt8(severity_code)) AS max_severity_code_state

FROM telemetry_db.telemetry_metrics
GROUP BY
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric;
    
    
--- VIEW FOR QUERY
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.v_agg_1m_by_scope_metric;

CREATE VIEW telemetry_db.v_agg_1m_by_scope_metric AS
SELECT
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric,

    countMerge(sample_count_state) AS sample_count,
    minMerge(first_ts_state) AS first_ts,
    maxMerge(last_ts_state) AS last_ts,

    minMerge(value_min_state) AS value_min,
    maxMerge(value_max_state) AS value_max,
    avgMerge(value_avg_state) AS value_avg,
    sumMerge(value_sum_state) AS value_sum,
    quantileTDigestMerge(0.95)(value_p95_state) AS value_p95,
    quantileTDigestMerge(0.99)(value_p99_state) AS value_p99,
    argMaxMerge(value_last_state) AS value_last,

    argMaxMerge(text_last_state) AS text_last,

    sumMerge(warning_sample_count_state) AS warning_sample_count,
    sumMerge(critical_sample_count_state) AS critical_sample_count,
    sumMerge(bad_sample_count_state) AS bad_sample_count,
    maxMerge(max_severity_code_state) AS max_severity_code

FROM telemetry_db.agg_1m_by_scope_metric
GROUP BY
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric;
    
--- TEST ---
--- SELECT ALL
SELECT * FROM telemetry_db.v_agg_1m_by_scope_metric 
WHERE scope_type = 'node' AND metric_key LIKE 'node.cpu_temperature_c'
ORDER BY bucket_start;

--- CPU 1H
SELECT
    bucket_start,
    value_avg,
    value_max,
    value_p95,
    value_last,
    max_severity_code
FROM telemetry_db.v_agg_1m_by_scope_metric
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key = 'node.cpu_usage_pct'
  AND bucket_start >= now() - INTERVAL 5 MINUTE
ORDER BY bucket_start;


--- disk USAGE
SELECT
    bucket_start,
    tags_json,
    value_avg,
    value_max,
    value_last
FROM telemetry_db.v_agg_1m_by_scope_metric
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key = 'node.disk_used_pct'
  AND bucket_start >= now() - INTERVAL 1 HOUR
ORDER BY bucket_start, tags_json;


--- NIC STATUS
SELECT
    bucket_start,
    text_last,
    bad_sample_count,
    max_severity_code
FROM telemetry_db.v_agg_1m_by_scope_metric
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key = 'node.primary_nic_status'
  AND bucket_start >= now() - INTERVAL 5 MINUTE
ORDER BY bucket_start;




---- AGGREGATE 5M agg_5m_by_scope_metric
USE telemetry_db;

DROP TABLE IF EXISTS telemetry_db.agg_5m_by_scope_metric;

CREATE TABLE IF NOT EXISTS telemetry_db.agg_5m_by_scope_metric
(
    bucket_start DateTime,

    scope_type LowCardinality(String),
    scope_id String,
    metric_key LowCardinality(String),

    series_key UInt64,
    tags_json String,

    semantic_class LowCardinality(String),
    is_numeric_metric UInt8,

    sample_count_state AggregateFunction(count, UInt8),
    first_ts_state AggregateFunction(min, DateTime),
    last_ts_state AggregateFunction(max, DateTime),

    value_min_state AggregateFunction(min, Float64),
    value_max_state AggregateFunction(max, Float64),
    value_avg_state AggregateFunction(avg, Float64),
    value_sum_state AggregateFunction(sum, Float64),
    value_p95_state AggregateFunction(quantileTDigest(0.95), Float64),
    value_last_state AggregateFunction(argMax, Float64, DateTime),

    text_last_state AggregateFunction(argMax, String, DateTime),

    warning_sample_count_state AggregateFunction(sum, UInt64),
    critical_sample_count_state AggregateFunction(sum, UInt64),
    bad_sample_count_state AggregateFunction(sum, UInt64),
    max_severity_code_state AggregateFunction(max, UInt8)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(bucket_start)
ORDER BY (
    scope_type,
    scope_id,
    metric_key,
    series_key,
    bucket_start
);

--- Materialized View FROM telemetry_metrics TO 5m
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.mv_telemetry_metrics_to_agg_5m_by_scope_metric;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_db.mv_telemetry_metrics_to_agg_5m_by_scope_metric
TO telemetry_db.agg_5m_by_scope_metric
AS
WITH
    toStartOfInterval(metric_timestamp, INTERVAL 5 MINUTE) AS bucket_start,

    toJSONString(tags) AS tags_json,

    cityHash64(
        scope_type,
        scope_id,
        metric_key,
        toJSONString(tags)
    ) AS series_key,

    multiIf(
        metric_key IN (
            'node.primary_nic_status',
            'node.uptime_seconds'
        ), 'state',

        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.disk_used_pct',
            'node.network_rx_bytes_sec',
            'node.network_tx_bytes_sec',
            'node.network_utilization_pct'
        ), 'utilization',

        metric_key IN (
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct'
        ), 'symptom',

        metric_key IN (
            'node.cpu_temperature_c',
            'node.ssd_temperature_c',
            'node.ssd_life_pct'
        ), 'hardware_risk',

        'inventory'
    ) AS semantic_class,

    if(
        metric_key IN (
            'node.cpu_usage_pct',
            'node.memory_used_pct',
            'node.disk_used_pct',
            'node.network_rx_bytes_sec',
            'node.network_tx_bytes_sec',
            'node.network_utilization_pct',
            'node.cpu_queue_length',
            'node.disk_queue_length',
            'node.memory_page_faults_rate',
            'node.tcp_retransmit_pct',
            'node.cpu_temperature_c',
            'node.ssd_temperature_c',
            'node.ssd_life_pct',
            'node.uptime_seconds'
        ),
        1,
        0
    ) AS is_numeric_metric,

    multiIf(
        metric_key = 'node.primary_nic_status'
            AND lower(metric_value_text) IN ('down', 'notpresent', 'disconnected'), 3,

        metric_key = 'node.primary_nic_status'
            AND lower(metric_value_text) IN ('dormant', 'lowerlayerdown'), 2,

        metric_key = 'node.cpu_usage_pct'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.cpu_usage_pct'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.memory_used_pct'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.memory_used_pct'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.disk_used_pct'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.disk_used_pct'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.cpu_queue_length'
            AND metric_value_numeric >= 10, 3,
        metric_key = 'node.cpu_queue_length'
            AND metric_value_numeric >= 4, 2,

        metric_key = 'node.disk_queue_length'
            AND metric_value_numeric >= 5, 3,
        metric_key = 'node.disk_queue_length'
            AND metric_value_numeric >= 2, 2,

        metric_key = 'node.memory_page_faults_rate'
            AND metric_value_numeric >= 20000, 3,
        metric_key = 'node.memory_page_faults_rate'
            AND metric_value_numeric >= 5000, 2,

        metric_key = 'node.tcp_retransmit_pct'
            AND metric_value_numeric >= 5, 3,
        metric_key = 'node.tcp_retransmit_pct'
            AND metric_value_numeric >= 1, 2,

        metric_key = 'node.cpu_temperature_c'
            AND metric_value_numeric >= 95, 3,
        metric_key = 'node.cpu_temperature_c'
            AND metric_value_numeric >= 85, 2,

        metric_key = 'node.ssd_temperature_c'
            AND metric_value_numeric >= 80, 3,
        metric_key = 'node.ssd_temperature_c'
            AND metric_value_numeric >= 70, 2,

        metric_key = 'node.ssd_life_pct'
            AND metric_value_numeric <= 10, 3,
        metric_key = 'node.ssd_life_pct'
            AND metric_value_numeric <= 20, 2,

        0
    ) AS severity_code

SELECT
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric,

    countState() AS sample_count_state,
    minState(metric_timestamp) AS first_ts_state,
    maxState(metric_timestamp) AS last_ts_state,

    minState(metric_value_numeric) AS value_min_state,
    maxState(metric_value_numeric) AS value_max_state,
    avgState(metric_value_numeric) AS value_avg_state,
    sumState(metric_value_numeric) AS value_sum_state,
    quantileTDigestState(0.95)(metric_value_numeric) AS value_p95_state,
    argMaxState(metric_value_numeric, metric_timestamp) AS value_last_state,

    argMaxState(metric_value_text, metric_timestamp) AS text_last_state,

    sumState(toUInt64(severity_code = 2)) AS warning_sample_count_state,
    sumState(toUInt64(severity_code = 3)) AS critical_sample_count_state,
    sumState(toUInt64(severity_code >= 2)) AS bad_sample_count_state,
    maxState(toUInt8(severity_code)) AS max_severity_code_state

FROM telemetry_db.telemetry_metrics
WHERE metric_key IN (
    'node.cpu_usage_pct',
    'node.memory_used_pct',
    'node.disk_used_pct',
    'node.network_rx_bytes_sec',
    'node.network_tx_bytes_sec',
    'node.network_utilization_pct',
    'node.cpu_queue_length',
    'node.disk_queue_length',
    'node.memory_page_faults_rate',
    'node.tcp_retransmit_pct',
    'node.cpu_temperature_c',
    'node.ssd_temperature_c',
    'node.ssd_life_pct',
    'node.primary_nic_status',
    'node.uptime_seconds'
)
GROUP BY
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric;
    
    
-- VIEW FOR 5M FINALIZED
USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.v_agg_5m_by_scope_metric;

CREATE VIEW telemetry_db.v_agg_5m_by_scope_metric AS
SELECT
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric,

    countMerge(sample_count_state) AS sample_count,
    minMerge(first_ts_state) AS first_ts,
    maxMerge(last_ts_state) AS last_ts,

    minMerge(value_min_state) AS value_min,
    maxMerge(value_max_state) AS value_max,
    avgMerge(value_avg_state) AS value_avg,
    sumMerge(value_sum_state) AS value_sum,
    quantileTDigestMerge(0.95)(value_p95_state) AS value_p95,
    argMaxMerge(value_last_state) AS value_last,

    argMaxMerge(text_last_state) AS text_last,

    sumMerge(warning_sample_count_state) AS warning_sample_count,
    sumMerge(critical_sample_count_state) AS critical_sample_count,
    sumMerge(bad_sample_count_state) AS bad_sample_count,
    maxMerge(max_severity_code_state) AS max_severity_code

FROM telemetry_db.agg_5m_by_scope_metric
GROUP BY
    bucket_start,
    scope_type,
    scope_id,
    metric_key,
    series_key,
    tags_json,
    semantic_class,
    is_numeric_metric;
  
  
--- TEST
----- SELECT ALL
SELECT * FROM telemetry_db.v_agg_5m_by_scope_metric;

---- CPU TREND 24H
SELECT
    bucket_start,
    value_avg,
    value_max,
    value_p95,
    value_last,
    max_severity_code
FROM telemetry_db.v_agg_5m_by_scope_metric
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key = 'node.cpu_usage_pct'
  AND bucket_start >= now() - INTERVAL 24 HOUR
ORDER BY bucket_start;

--- NIC TREND 7D
SELECT
    bucket_start,
    text_last,
    bad_sample_count,
    max_severity_code
FROM telemetry_db.v_agg_5m_by_scope_metric
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key = 'node.primary_nic_status'
  AND bucket_start >= now() - INTERVAL 7 DAY
ORDER BY bucket_start;


---- DISK THEO VOLUME
SELECT
    bucket_start,
    tags_json,
    value_avg,
    value_max,
    value_last
FROM telemetry_db.v_agg_5m_by_scope_metric
WHERE scope_type = 'node'
  AND scope_id = 'node-msi-838958db'
  AND metric_key = 'node.disk_used_pct'
  AND bucket_start >= now() - INTERVAL 7 DAY
ORDER BY bucket_start, tags_json;