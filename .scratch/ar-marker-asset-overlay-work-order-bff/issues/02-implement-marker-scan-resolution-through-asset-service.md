# 02 — Implement Marker Scan Resolution Through Asset Service

**What to build:** Add the first useful AR tracer bullet: the AR client submits a marker code and receives normalized asset identity for the rack or node mounted with that marker. The BFF should call Asset Service as the source of truth and return a stable AR-facing response containing asset identity and display context. This ticket proves marker-based AR recognition works end to end without monitoring or work-order composition yet.

**Blocked by:** 01 — Add AR BFF Service Shell and Health Check.

**Status:** completed

- [x] The BFF exposes a marker scan endpoint that accepts a marker code from the AR client.
- [x] The endpoint requires the appropriate authenticated user context for AR asset access, unless the project already has an explicit public marker-scan policy.
- [x] The BFF calls Asset Service marker resolution rather than querying Asset Service persistence directly.
- [x] A successful scan returns normalized asset identity fields: asset ID, asset type, asset code, display name, and marker code.
- [x] A successful scan for a node includes parent rack context when Asset Service provides it.
- [x] A successful scan for a rack does not require node-specific fields.
- [x] Unknown, retired, inactive, invalid, or unmounted marker responses are mapped to explicit AR-facing errors.
- [x] Asset Service availability failure is mapped to an explicit service-unavailable response for the scan endpoint.
- [x] The response contract is stable and consumer-oriented, not a raw pass-through of the downstream Asset Service response.
- [x] Tests cover successful rack marker resolution.
- [x] Tests cover successful node marker resolution with parent rack context.
- [x] Tests cover marker-not-found or marker-not-active behavior without calling Monitoring Service or Incident Workflow Service.
- [x] Tests prove the BFF does not continue into monitoring or work-order composition when marker resolution fails.
- [x] The BFF still does not own marker lifecycle operations such as marker creation, activation, mounting, validation, remapping, or retirement.
