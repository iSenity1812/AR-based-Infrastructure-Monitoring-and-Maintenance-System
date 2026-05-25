from __future__ import annotations

from ..core.models import CollectorContext, MetricSample
from .base import BaseCollector


class HeartbeatCollector(BaseCollector):
    def collect(self, context: CollectorContext) -> list[MetricSample]:
        return []
