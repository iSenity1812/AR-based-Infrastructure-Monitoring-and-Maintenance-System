# Control Plane Services

This folder contains all backend services responsible for **control, orchestration, and operational workflows** in the system.

## Purpose

- Manage users, access, roles (identity-service)
- Manage assets and topology (asset-context-service)
- Handle alerts, incidents, tickets (monitoring-service, incident-workflow-service)
- Simulation, notifications, and audit tracking

## Structure

Each service is a self-contained microservice:

- `control-plane-api/` – unified API gateway for control plane
- `identity-service/` – authentication & authorization
- `asset-context-service/` – topology and asset metadata
- `monitoring-service/` – alert generation & lifecycle
- `incident-workflow-service/` – incident/ticket management
- `simulation-service/` – scenario execution & simulation data
- `notification-service/` – notification delivery
- `audit-service/` – audit logs & compliance

## Rules

- Each service owns its own database (MongoDB by default)
- No business logic shared between services
- Communication is via HTTP REST, gRPC, or event bus
- Services follow **Clean Architecture** internally

## Goal

Enable independent development, testing, and deployment of all control-related services while keeping strong boundaries and ownership.
