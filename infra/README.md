# Infrastructure

This folder contains all infrastructure-related configurations and deployment definitions.

It defines how the system runs, not what the system does.

## Contents

- Database configurations (MongoDB, TimescaleDB, Redis)
- Message broker setup (Kafka topics, configs)
- `k3s` manifests / deployment files
- Docker configurations
- Observability stack (logging, metrics, tracing)

## Current deployment layout

- `infra/ci`: shared CI/CD helper scripts
- `infra/k3s`: service manifests for lightweight Kubernetes targets, including clusters running on Google Cloud VMs

## Rules

- No business logic
- No application code
- Changes here affect system runtime behavior
- Must be reviewed carefully before production deployment

## Goal

Provide reliable, scalable, and observable runtime environment for all services.
