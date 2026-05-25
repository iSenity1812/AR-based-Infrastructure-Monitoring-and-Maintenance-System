from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(slots=True)
class CollectorContext:
    scope: str
    scope_id: str
    topology_id: str | None = None
    source: str = "local"


@dataclass(slots=True)
class MetricSample:
    metric_key: str
    scope: str
    scope_id: str
    value: float | int | str | bool
    unit: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
