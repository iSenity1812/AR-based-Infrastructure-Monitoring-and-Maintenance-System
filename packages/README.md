# Packages

This folder contains shared libraries used across multiple applications.

These are reusable building blocks and must NOT contain business-specific logic.

## Types of packages
- Shared utilities (logging, error handling, helpers)
- Event contracts (Kafka/event schemas)
- Shared kernel (base entities, DTO patterns)
- Client SDKs for internal services

## Rules
- Must be framework-agnostic where possible
- No domain/business logic specific to a single service
- Changes here affect multiple apps → must be stable and backward compatible

## Goal
Reduce duplication and enforce consistency across all services.