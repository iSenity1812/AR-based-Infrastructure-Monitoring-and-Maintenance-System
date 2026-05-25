from __future__ import annotations

from ..core.models import MetricSample


def deduplicate(samples: list[MetricSample]) -> list[MetricSample]:
    return samples
