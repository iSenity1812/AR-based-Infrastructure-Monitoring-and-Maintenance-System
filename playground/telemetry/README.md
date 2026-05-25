# Telemetry Collector Playground

This folder contains a small `uv`-managed Python project for exploring the telemetry collector architecture described in `docs/telemetry`.

## What is included

- A package layout that matches the document's `collector`, `core`, `pipeline`, `providers`, and `transports` split.
- A runnable command entrypoint for the collector.
- Starter domain models and a sample health score implementation.
- A place for local configs and tests.

## Getting started with `uv`

```bash
cd playground/telemetry
uv sync --extra dev
uv run telemetry-collector
```

Run the sample test suite with:

```bash
uv run pytest
```

## Suggested next steps

- Connect host and network collectors to real Windows/WSL probes.
- Replace the starter score with the scoring logic from the telemetry docs.
- Add YAML config loading once the collection shape is finalized.
