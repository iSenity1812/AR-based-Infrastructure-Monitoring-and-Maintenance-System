# AR-based Infrastructure Monitoring and Maintenance System

This repository defines the architecture, engineering standards, and implementation guidance for a proof-of-concept platform focused on:

- centralized infrastructure monitoring
- WebAR-assisted maintenance workflows
- alert, incident, and ticket operations
- AI-assisted anomaly and risk enrichment
- simulated data center operations

The repository is documentation-first. The current workspace primarily captures system intent, architecture boundaries, engineering rules, and target operating model.

## What This Project Is

The platform combines:

- a `control plane` for workflow, topology, monitoring, incidents, and maintenance
- a `data plane` for telemetry ingest, stream processing, and analytics
- a browser-based `WebAR Client` for QR marker scan, diagnostics overlay, and inspection submission

The current strategic decisions are:

- `NestJS` for the control plane
- `Python` services for the data plane
- `Kafka` as the event backbone
- `MongoDB` for operational data, segmented by service boundary
- `TimescaleDB` for telemetry and time-series history
- `Redis` for derived serving state
- `Vertex AI` for training and model lifecycle only
- `WebAR + QR marker-based interaction` as the canonical field interface

## Documentation Model

Use these precedence rules when working in this repository:

1. `docs/*` is the source of truth for product and architecture intent.
2. `AGENTS.md` defines contributor and AI-agent operating behavior.
3. Root companion docs define implementation-specific guidance:
   - `ENGINEER.md`
   - `CONTRACTS.md`
   - `FRONTEND.md`
   - `OPS.md`

If implementation or new documentation diverges from the documented architecture, update the relevant source-of-truth docs in the same change.

## Recommended Reading Order

Start here for system and architecture context:

1. [docs/system_requirements_v1_vn.md](./docs/system_requirements_v1_vn.md)
2. [docs/topic_proposal_vn.md](./docs/topic_proposal_vn.md)
3. [docs/overview_architecture.md](./docs/overview_architecture.md)
4. [docs/service_decomposition.md](./docs/service_decomposition.md)
5. [docs/service_interaction_matrix.md](./docs/service_interaction_matrix.md)
6. [docs/data_pipeline_architecture.md](./docs/data_pipeline_architecture.md)
7. [docs/data_architecture.md](./docs/data_architecture.md)

Then read the implementation handbooks:

- [AGENTS.md](AGENTS.md)
- [ENGINEER.md](ENGINEER.md)
- [CONTRACTS.md](CONTRACTS.md)
- [FRONTEND.md](FRONTEND.md)
- [OPS.md](OPS.md)

## Architecture Snapshot

Target microservice boundaries:

- `Control Plane API and BFF`
- `Identity Service`
- `Asset Context Service`
- `Monitoring Service`
- `Incident Workflow Service`
- `Simulation Service`
- `Notification Service`
- `Audit Service`
- `Telemetry Ingestion Service`
- `Stream Processing Service`
- `AI Analytics Service`

Key architecture rules:

- preserve `database-per-service`
- keep `control plane` and `data plane` separated
- keep `WebAR Client` browser-based unless source-of-truth docs explicitly change that decision
- keep `Kafka` as an event backbone, not as workflow persistence
- keep `Vertex AI` outside the online request hot path

## Repository Structure

Current repository focus:

- `docs/` holds architecture, requirements, and supporting system design documents
- `playground/` contains exploration or prototype work such as telemetry collector artifacts
- root-level handbook docs define implementation, contracts, frontend, and operations standards

Target monorepo direction:

- `apps/` for deployable services and frontend apps
- `packages/` for shared cross-cutting libraries
- `infra/` for deployment and runtime assets

## WebAR Note

The canonical field client is `WebAR Client`, not a native mobile AR app.

That means:

- QR marker scan happens in a browser-based WebAR experience
- marker resolution goes through backend APIs
- the WebAR client consumes diagnostics bundles, not raw telemetry
- `React Native/Expo` is optional companion-app technology, not the default AR runtime

## Operations Baseline

The current target operating model is:

- `Docker` for packaging
- `k3s` on VM for both `cheap VPS` and `GCP VM` deployment profiles
- `Traefik` as baseline ingress
- `OpenTelemetry`, `Jaeger`, `Prometheus`, and `Grafana` for observability

See [OPS.md](OPS.md) for runtime details.

## Current State

This repository is still architecture-first and documentation-heavy.

It is designed to:

- align implementation before code expands
- keep system boundaries explicit
- give engineers and AI agents a stable source of truth for future scaffolding and implementation

## Contributing

Before making architecture-significant changes:

- read the relevant source-of-truth docs
- preserve terminology consistency
- update impacted architecture and handbook docs in the same change

If you are implementing code from this repository, start with:

- [AGENTS.md](AGENTS.md)
- [ENGINEER.md](ENGINEER.md)
- [FRONTEND.md](FRONTEND.md)
- [CONTRACTS.md](CONTRACTS.md)
- [OPS.md](OPS.md)
