from telemetry_collector.core.models import MetricSample
from telemetry_collector.pipeline.health_score import calculate_health_score


def test_health_score_stays_within_bounds() -> None:
    samples = [
        MetricSample("node.cpu_usage_pct", "node", "node-host-01", 20, "%"),
        MetricSample("node.memory_used_pct", "node", "node-host-01", 40, "%"),
        MetricSample("node.uptime_seconds", "node", "node-host-01", 3600, "seconds"),
    ]

    score = calculate_health_score(samples)

    assert 0.0 <= score <= 100.0
