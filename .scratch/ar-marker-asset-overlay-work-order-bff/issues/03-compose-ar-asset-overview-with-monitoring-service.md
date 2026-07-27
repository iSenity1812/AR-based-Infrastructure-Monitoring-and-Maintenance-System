# 03 — Compose AR Asset Overview With Monitoring Service

**What to build:** Add monitoring context to the AR asset experience. After an asset has been resolved from a marker, the AR client can request an overview that combines Asset Service identity context with Monitoring Service operational state for the same rack or node. The result should be useful for an AR overlay and resilient to monitoring read failures.

**Blocked by:** 02 — Implement Marker Scan Resolution Through Asset Service.

**Status:** completed

- [x] The BFF exposes an AR asset overview endpoint that accepts or derives a canonical asset ID.
- [x] The endpoint resolves or verifies the asset through Asset Service before requesting monitoring data.
- [x] Rack assets request rack-level monitoring state, overview, alert summary, or the closest existing Monitoring Service read contract.
- [x] Node assets request node-level monitoring state, overview, metrics, alert summary, or the closest existing Monitoring Service read contract.
- [x] The response includes asset identity fields from Asset Service and operational summary fields from Monitoring Service where available.
- [x] The response includes clear availability metadata indicating whether monitoring data is available, unavailable, partial, or not applicable.
- [x] Monitoring Service read failures do not erase the resolved asset identity from the response.
- [x] Asset resolution failure still blocks the endpoint because the AR overview cannot be anchored without a valid asset.
- [x] The endpoint does not store monitoring state locally in the BFF.
- [x] The endpoint does not duplicate monitoring aggregation rules that already belong to Monitoring Service.
- [x] Tests cover rack asset overview composition.
- [x] Tests cover node asset overview composition.
- [x] Tests cover Monitoring Service unavailable behavior while still returning asset identity and explicit availability metadata.
- [x] Tests cover asset-not-found behavior without calling Monitoring Service.
- [x] The response remains additive enough for ticket 06 to compose it into the main AR overlay response.
