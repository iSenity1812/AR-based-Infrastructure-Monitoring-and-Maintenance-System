#!/bin/bash
set -e

CH_CLIENT="clickhouse-client --user=root --password=password --database=telemetry_db --multiquery"

echo "Running ClickHouse init scripts..."

$CH_CLIENT < /docker-entrypoint-initdb.d/00_bootstrap/init_db.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/01_raw_ingestion/01_telemetry_metrics.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/01_raw_ingestion/02_mv_raw_to_structured.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/02_latest_state/01_latest_state_by_scope_table.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/02_latest_state/02_mv_telemetry_to_latest_state_by_scope.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/02_latest_state/03_v_latest_state_by_scope.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/03_reference_policy/01_metric_profile.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/01_node_latest_state.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/02_node_current_live.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/03_node_fingerprint_raw.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/04_mv_raw_to_node_fingerprint_raw.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/05_node_fingerprint_latest_agg.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/06_mv_node_fingerprint_raw_to_latest_agg.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/07_node_fingerprint_latest.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/08_node_current_summary.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/05_window_aggregates/01_agg_1m_by_scope_metric.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/05_window_aggregates/02_mv_telemetry_metrics_to_agg_1m_by_scope_metric.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/05_window_aggregates/03_v_agg_1m_by_scope_metric.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/04_node_serving/09_node_summary_trend_1m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/05_window_aggregates/04_agg_5m_by_scope_metric.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/05_window_aggregates/05_mv_telemetry_metrics_to_agg_5m_by_scope_metric.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/05_window_aggregates/06_v_agg_5m_by_scope_metric.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/01_rack_current_summary.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/02_rack_summary_trend_1m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/03_rack_summary_trend_5m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/04_rack_summary_history.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/05_mv_agg_1m_to_rack_summary_history.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/06_mv_agg_5m_to_rack_summary_history.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/06_rack_serving/07_v_rack_summary_history.sql

$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/01_container_latest_state.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/02_container_current_live.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/03_container_current_summary.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/04_service_latest_state.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/05_service_current_live.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/06_service_current_summary.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/07_container_summary_trend_1m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/08_container_summary_trend_5m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/09_service_summary_trend_1m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/10_service_summary_trend_5m.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/11_service_summary_history.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/12_mv_agg_1m_to_service_summary_history.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/13_mv_agg_5m_to_service_summary_history.sql
$CH_CLIENT < /docker-entrypoint-initdb.d/07_container_service_serving/14_v_service_summary_history.sql

echo "ClickHouse init scripts completed."
