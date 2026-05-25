from __future__ import annotations

from ..core.models import MetricSample


def calculate_health_score(samples: list[MetricSample]) -> float:
    metrics = {sample.metric_key: sample.value for sample in samples}

    cpu_usage = float(metrics.get("node.cpu_usage_pct", 0.0))
    memory_usage = float(metrics.get("node.memory_used_pct", 0.0))
    uptime_seconds = float(metrics.get("node.uptime_seconds", 0.0))

    cpu_penalty = min(cpu_usage, 100.0) * 0.35
    memory_penalty = min(memory_usage, 100.0) * 0.35
    uptime_bonus = min(uptime_seconds / 86400.0, 1.0) * 10.0

    score = 100.0 - cpu_penalty - memory_penalty + uptime_bonus
    return max(0.0, min(score, 100.0))
