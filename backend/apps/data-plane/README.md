# Data Plane Services

This folder contains all backend services responsible for **data ingestion, processing, storage, and AI analytics**.

## Purpose

- Ingest telemetry and streaming data
- Process and store raw and derived data
- Evaluate rules, detect anomalies, generate alerts
- Perform AI analytics and predictive insights

## Structure

Each service is a self-contained microservice:

- `telemetry-ingestion-service/` – receive telemetry from collectors, validate, persist, publish events
- `stream-processing-service/` – real-time data processing, rule evaluation, alert candidate generation
- `ai-analytics-service/` – anomaly detection, predictive scoring, enrichment of dashboards and AR

## Rules

- Each service may use specialized stores:
  - TimescaleDB for time-series
  - Redis for caching or derived snapshots
  - Kafka for event streaming
- Services do not share business logic with control plane
- Communication via event bus or internal APIs
- Follow **Clean Architecture** internally

## Goal

Provide reliable, scalable, and extensible data pipeline and AI analytics platform for the system.
