from __future__ import annotations


def clamp_percent(value: float) -> float:
    return max(0.0, min(value, 100.0))
