# Apps

This folder contains all deployable applications in the system, including both backend and frontend.

Each app is an independent runtime that can be built, tested, and deployed separately.

## Structure

- `backend/` – Microservices handling business logic, data, and APIs.
- `frontend/` – User-facing applications (web, AR clients, dashboards).

### Backend apps

- Follow Clean Architecture internally.
- Control plane services (alert, ticket, topology, etc.)
- Data plane services (ingestion, rule engine, AI analytics)

### Frontend apps

- React / Vue / other web clients
- AR / mobile clients
- Consume backend APIs and events

## Rules

- No shared runtime state between apps
- Backend and frontend communicate via HTTP APIs, WebSockets, or event bus (Kafka)
- Each backend service owns its database; frontend does not own business data

## Goal

Enable independent development and deployment of both backend and frontend in the same monorepo.
