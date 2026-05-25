from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class CollectorSettings:
    enabled_modules: list[str] = field(default_factory=lambda: ["host", "network", "service", "docker", "heartbeat"])
    interval_seconds: int = 15
