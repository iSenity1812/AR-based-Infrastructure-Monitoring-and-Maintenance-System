---
name: backend-architecture-control
description: >-
  NestJS backend scaffolding, coding, refactoring, and review skill for this repo.
  Use when the user asks to scaffold, extend, review, or fix backend modules,
  controllers, DTOs, use-cases, repositories, guards, tests, or service boundaries
  and the work must follow the current architecture, bounded contexts, and
  database-per-service rules.
---

# Backend Architecture Control

Use this skill when the task touches the backend and the goal is not just to write code,
but to keep the code aligned with the current architecture of this repository.

## What this skill is for

- Scaffold new NestJS backend features in the repo's existing style.
- Extend or refactor an existing backend service without breaking service ownership.
- Review backend changes for architectural drift, bad boundaries, or pattern mismatch.
- Help choose the correct place for a change before writing code.

## First principles

1. Read the source-of-truth docs first when the change is architectural:
   - `AGENTS.md`
   - `docs/service_decomposition.md`
   - `docs/service_interaction_matrix.md`
   - `docs/data_architecture.md`
   - `docs/data_pipeline_architecture.md`
   - `CONTRACTS.md`
   - `backend/README.md`
   - the target service's own README
2. Identify the bounded context and the service owner before editing anything.
3. Keep control-plane, data-plane, and AR concerns separated.
4. Prefer the smallest change that satisfies the request.
5. If the docs and the current code disagree, stop and realign the code or update the docs in the same change.

## Default workflow

When given a backend task:

1. Inspect the target service layout and nearby patterns.
2. Map the request to the correct service boundary and business owner.
3. Decide whether this is:
   - a new feature scaffold,
   - an update to an existing feature,
   - a bug fix,
   - or an architecture review.
4. Follow the service's established folder structure and naming.
5. Write the minimal complete set of files needed for the change.
6. Re-check the result against the architecture guardrails below.

## Scaffolding rules

- Follow the existing NestJS module structure in the target service.
- Keep controllers thin and push business logic into use-cases or services.
- Keep DTOs focused on input/output shape and validation.
- Keep persistence and external integration behind adapters or repositories.
- Reuse existing enums, constants, decorators, and error patterns when they already exist.
- Add tests where the surrounding codebase already tests that layer.
- Prefer explicit dependency injection over ad hoc imports or hidden coupling.

## Architecture guardrails

- Do not create a new service whose only job is query aggregation.
- Do not let the BFF or API layer become the owner of business truth.
- Do not cross service boundaries with direct database reads.
- Do not move workflow state into Kafka or AI components.
- Do not treat AR diagnostics as a source-of-truth domain.
- Do not blur control-plane and data-plane responsibilities.
- Respect database-per-service even if the physical cluster is shared.

## Service boundary checks

Before writing code, ask:

- Which service owns this data?
- Which service owns this workflow?
- Is this a write path or a read composition path?
- Does the request belong in an existing bounded context?
- Is this change really cross-service orchestration, or is it a local feature?

If the answer shows the request belongs to another service, move the work there rather than
forcing it into the current module.

## Review checklist

Use this checklist when reviewing existing or newly written backend code:

- The code matches the repo's architectural boundaries.
- The files sit in the right service and layer.
- Controllers stay thin.
- DTOs validate input properly.
- Error handling matches the surrounding code.
- Imports and dependency direction are sane.
- No new duplicate abstraction was added unnecessarily.
- No direct cross-service persistence access was introduced.
- The final shape matches the documentation and service decomposition.

## Output style

- When scaffolding, give the architecture reason first, then the code.
- When reviewing, lead with concrete findings and file paths.
- When the request is ambiguous, pick the safest architecture-preserving interpretation and say why.
- When a task spans multiple services, split it into one service at a time instead of mixing boundaries.

## Practical default

If the user says "scaffold", "code theo đúng kiến trúc", "review backend", "thêm module",
"sửa service", or similar, this skill should be used to make sure the backend stays
consistent with the current repo rather than drifting into a one-off local pattern.
