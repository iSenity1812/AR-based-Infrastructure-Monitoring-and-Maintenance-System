from __future__ import annotations

from datetime import datetime, timezone

from .core.models import CollectorContext, MetricSample
from .pipeline.health_score import calculate_health_score
from .collectors.host_collector import HostCollector


def build_sample_context() -> CollectorContext:
    return CollectorContext(
        scope="node",
        scope_id="node-host-01",
        topology_id="rack-a1",
        source="local",
    )


def build_sample_samples(context: CollectorContext) -> list[MetricSample]:
    now = datetime.now(timezone.utc)
    return [
        MetricSample(
            metric_key="node.cpu_usage_pct",
            scope=context.scope,
            scope_id=context.scope_id,
            value=21.5,
            unit="%",
            timestamp=now,
        ),
        MetricSample(
            metric_key="node.memory_used_pct",
            scope=context.scope,
            scope_id=context.scope_id,
            value=48.2,
            unit="%",
            timestamp=now,
        ),
        MetricSample(
            metric_key="node.uptime_seconds",
            scope=context.scope,
            scope_id=context.scope_id,
            value=86400,
            unit="seconds",
            timestamp=now,
        ),
    ]


def main() -> None:
    context = build_sample_context()
    collector = HostCollector()
    samples = collector.collect(context)
    score = calculate_health_score(samples)

    print(f"Telemetry collector started for {context.scope}:{context.scope_id}")
    print(f"Collected {len(samples)} host metrics")
    print(f"Health score: {score:.1f}")
    for sample in samples:
        print(f"- {sample.metric_key} = {sample.value} {sample.unit}")


if __name__ == "__main__":
    main()
