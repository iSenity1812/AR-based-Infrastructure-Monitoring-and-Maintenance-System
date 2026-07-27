# 01 — Add AR BFF Service Shell and Health Check

**What to build:** Create a minimal AR-facing BFF service entry point for marker-based AR workflows. The service should be independently runnable, follow the current control-plane backend conventions, expose a basic health endpoint, and establish the dependency-injection shape for future Asset Service, Monitoring Service, and Incident Workflow Service clients. This ticket does not need to call downstream services yet; it makes the AR BFF real and testable.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] A new AR BFF service or equivalent AR-facing backend module exists in the control-plane backend structure.
- [x] The service has a health endpoint that can be called without requiring downstream services.
- [x] The service uses the repository's existing NestJS/control-plane patterns for application bootstrap, configuration, validation, API prefixing, and response envelope behavior where applicable.
- [x] The service has authentication/authorization wiring shaped consistently with the other protected control-plane services, even if only the health endpoint is public.
- [x] The service defines ports or client abstractions for Asset Service, Monitoring Service, and Incident Workflow Service, with no direct database access to those services.
- [x] The service has environment configuration placeholders for downstream service base URLs or transport settings.
- [x] A smoke test or controller-level test proves the health endpoint returns the expected service identity/status.
- [x] A build command for the service succeeds, or the ticket documents any pre-existing workspace/tooling blocker that prevents verification.
- [x] The implementation does not introduce marker lifecycle, monitoring state, ticket lifecycle, or workflow execution ownership into the BFF.
- [x] The service is ready for ticket 02 to add marker scan resolution without requiring a broad restructuring pass.
