# Mobile Development Plan

## Product Direction

The mobile app is focused on field and operations workflows that benefit from a handheld device:

- technician ticket handling
- incident context lookup
- evidence capture and upload
- role-based operations actions
- future AR inspection handoff

The visual language follows the AR-IMMS command-center style: dark operational panels, cyan borders, compact information density, strong status pills, and clear action hierarchy.

## Phase 1 - Ticket and Incident Flow

Current implementation covers:

- login and persisted session
- demo operator and technician sessions for UI testing
- role-aware navigation
- ticket list with operator/technician filtering
- ticket create form for operators
- ticket assignment action for dispatch-capable roles
- technician acknowledge action
- ticket comments
- evidence image selection and Cloudflare R2 presigned upload flow
- incident list and incident detail
- profile with roles and permissions

## Phase 2 - Backend Hardening

Recommended next work:

- add refresh-token handling
- add global request retry and auth-expiry handling
- add typed error banners instead of alerts
- normalize API DTOs if backend response shapes change
- add endpoint support for ticket start work, resolve, close, and cancel
- add incident status transition once backend supports it

## Phase 3 - Field UX

Recommended next work:

- camera capture flow in addition to image-library picking
- offline draft comments and evidence queue
- scan marker or QR entry point for asset context
- route from asset context to active tickets
- technician task filters: assigned, acknowledged, in progress, resolved

## Phase 4 - AR Inspection

Recommended next work:

- AR session shell
- marker resolution through asset-service
- asset telemetry snapshot panel
- inspection checklist
- evidence capture directly from inspection session

## Folder Ownership

- `app/`: route files only, thin screen composition
- `src/api/`: backend API calls and DTO normalization
- `src/auth/`: session, permissions, auth helpers
- `src/components/`: reusable visual primitives
- `src/constants/`: permission and enum constants
- `src/mocks/`: demo data for UI-only testing
- `src/theme/`: colors, spacing, radii, typography
- `src/types/`: shared TypeScript domain models
- `src/features/`: add this when flows grow beyond route-level screens

## Role Model

- Monitoring Operator:
  - create tickets
  - assign tickets
  - read tickets and incidents
  - update ticket workflow status when backend supports the action

- Maintenance Technician:
  - read assigned tickets
  - acknowledge assigned tickets
  - add comments
  - attach evidence
  - resolve work when backend supports the action

- IT Administrator:
  - can use operator workflows and future administrative views
