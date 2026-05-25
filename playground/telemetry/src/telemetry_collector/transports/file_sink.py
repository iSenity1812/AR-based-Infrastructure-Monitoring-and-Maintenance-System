from __future__ import annotations

from pathlib import Path

from ..core.models import MetricSample


def write_file(path: str | Path, samples: list[MetricSample]) -> None:
    target = Path(path)
    target.write_text("\n".join(f"{sample.metric_key}={sample.value}" for sample in samples), encoding="utf-8")
