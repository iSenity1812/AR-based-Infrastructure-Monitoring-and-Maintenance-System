-- =========================================================
-- TASK 0.1 QUERY PACK
-- Delegated alerting v1 baseline queries for Grafana Alerting.
-- These queries are designed against the current ClickHouse serving views.
-- They intentionally separate query-derived values from constant labels that
-- should be set in Grafana rule definitions.
-- =========================================================

USE telemetry_db;

-- NodeStale
SELECT
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    summary_ts,
    dateDiff('second', summary_ts, now()) AS stale_age_sec
FROM telemetry_db.node_current_summary
WHERE dateDiff('second', summary_ts, now()) > 120;

-- NodeCpuTempCritical
SELECT
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    max(summary_ts) AS summary_ts,
    max(cpu_temperature_c_current) AS current_value,
    min(cpu_temperature_c_current) AS sustained_min_value
FROM telemetry_db.node_summary_trend_1m
WHERE bucket_start >= toStartOfMinute(now()) - INTERVAL 5 MINUTE
GROUP BY
    node_id,
    rack_id
HAVING sustained_min_value > 90;

-- NodeMemoryPressureHigh
SELECT
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    max(summary_ts) AS summary_ts,
    max(memory_used_pct_current) AS current_value,
    min(memory_used_pct_current) AS sustained_min_value
FROM telemetry_db.node_summary_trend_1m
WHERE bucket_start >= toStartOfMinute(now()) - INTERVAL 5 MINUTE
GROUP BY
    node_id,
    rack_id
HAVING sustained_min_value > 90;

-- NodeDiskUsageHigh
SELECT
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    max(summary_ts) AS summary_ts,
    max(disk_used_pct_max_current) AS current_value,
    min(disk_used_pct_max_current) AS sustained_min_value
FROM telemetry_db.node_summary_trend_1m
WHERE bucket_start >= toStartOfMinute(now()) - INTERVAL 10 MINUTE
GROUP BY
    node_id,
    rack_id
HAVING sustained_min_value > 85;

-- NodeCpuUsageHigh
SELECT
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    max(summary_ts) AS summary_ts,
    max(cpu_usage_pct_current) AS current_value,
    min(cpu_usage_pct_current) AS sustained_min_value
FROM telemetry_db.node_summary_trend_1m
WHERE bucket_start >= toStartOfMinute(now()) - INTERVAL 5 MINUTE
GROUP BY
    node_id,
    rack_id
HAVING sustained_min_value > 90;

-- ContainerUnhealthyPresent
SELECT
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    countIf(lower(container_health_status) = 'unhealthy') AS unhealthy_container_count,
    max(summary_ts) AS summary_ts
FROM telemetry_db.container_current_summary
GROUP BY
    node_id,
    rack_id
HAVING unhealthy_container_count > 0;

-- ContainerRestarting
SELECT
    container_id AS workload_id,
    node_id,
    ifNull(
        dictGet('telemetry_db.dict_node_topology', 'rack_id', node_id),
        ''
    ) AS rack_id,
    restart_count_current,
    summary_ts
FROM telemetry_db.container_current_summary
WHERE restart_count_current > 0;

-- RackCritical
SELECT
    rack_id,
    summary_ts,
    critical_nodes AS critical_node_count,
    stale_nodes AS stale_node_count,
    bad_node_ratio,
    is_rack_level_failure
FROM telemetry_db.rack_current_summary
WHERE is_rack_level_failure = 1
   OR critical_nodes > 0
   OR has_signal_loss = 1;

