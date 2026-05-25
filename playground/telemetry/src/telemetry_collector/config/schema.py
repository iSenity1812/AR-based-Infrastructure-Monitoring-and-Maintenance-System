from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TopologyMapping:
    rack_id: str
    node_id: str
    switch_id: str | None = None
    primary_uplink: str | None = None
