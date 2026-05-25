from telemetry_collector.collectors.host_collector import HostCollector
from telemetry_collector.core.models import CollectorContext


def test_host_collector_emits_node_mvp_metrics(monkeypatch) -> None:
    collector = HostCollector()
    context = CollectorContext(scope="node", scope_id="node-host-01")

    monkeypatch.setattr(collector, "_read_cpu_usage_pct", lambda: 12.5)
    monkeypatch.setattr(collector, "_read_memory_used_pct", lambda: 34.0)
    monkeypatch.setattr(collector, "_read_memory_available_mb", lambda: 8192.0)
    monkeypatch.setattr(collector, "_read_disk_used_pct", lambda: 51.0)
    monkeypatch.setattr(collector, "_read_disk_free_gb", lambda: 128.0)
    monkeypatch.setattr(collector, "_read_process_count", lambda: 111)
    monkeypatch.setattr(collector, "_read_service_running_count", lambda: 23)
    monkeypatch.setattr(collector, "_read_uptime_seconds", lambda: 9876.0)

    samples = collector.collect(context)

    assert {sample.metric_key for sample in samples} == {
        "node.cpu_usage_pct",
        "node.memory_used_pct",
        "node.memory_available_mb",
        "node.disk_used_pct",
        "node.disk_free_gb",
        "node.process_count",
        "node.service_running_count",
        "node.uptime_seconds",
    }
    assert all(sample.scope == "node" for sample in samples)
    assert all(sample.scope_id == "node-host-01" for sample in samples)
