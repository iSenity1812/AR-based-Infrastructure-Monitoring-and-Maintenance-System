from __future__ import annotations

from ..core.models import MetricSample


def write_stdout(samples: list[MetricSample]) -> None:
    for sample in samples:
        print(f"{sample.metric_key}={sample.value} {sample.unit}")
