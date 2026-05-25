from __future__ import annotations

from abc import ABC, abstractmethod

from ..core.models import CollectorContext, MetricSample


class BaseCollector(ABC):
    @abstractmethod
    def collect(self, context: CollectorContext) -> list[MetricSample]:
        raise NotImplementedError
