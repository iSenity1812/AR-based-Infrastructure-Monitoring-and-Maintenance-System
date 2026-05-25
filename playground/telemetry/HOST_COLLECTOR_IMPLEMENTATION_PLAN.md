# Host Collector Implementation Plan

This plan translates the telemetry docs into the first concrete collector slice for the playground project.

## Scope from the docs

Implement the host collector for `node` scope first. Start with the metrics that the catalog marks as core or high-value for MVP:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.memory_available_mb`
- `node.disk_used_pct`
- `node.disk_free_gb`
- `node.network_total_bytes_sec`
- `node.network_error_count`
- `node.process_count`
- `node.service_running_count`
- `node.uptime_seconds`

If local access is limited, return a safe fallback value rather than failing the whole collector.

## Implementation steps

1. Keep the collector focused on `node` runtime metrics only.
2. Add small helper methods for each metric family so the logic stays testable.
3. Prefer optional system inspection over hard dependencies; if a probe fails, return a fallback sample instead of raising.
4. Normalize every emitted sample through the shared `MetricSample` model with the `node` scope and `scope_id` from `CollectorContext`.
5. Include a timestamp and preserve the collector `source` in the metadata path if needed later.
6. Add a focused test that verifies the collector emits the expected MVP metric keys and keeps `node` scope consistent.
7. Keep derived scoring, alerting, and topology mapping out of the collector itself; those belong in the pipeline layer.

## Local validation target

After implementation, the collector should be able to run in the playground and return a non-empty list of node metrics without depending on the rest of the future pipeline.
