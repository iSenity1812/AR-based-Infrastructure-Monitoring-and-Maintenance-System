# 06 — Add End-to-End AR Overlay Composition Endpoint

**What to build:** Provide the main mobile-friendly AR endpoint that composes marker/asset identity, monitoring summary, and work-order summary into one stable response. This endpoint should make the AR overlay efficient for the client while preserving the downstream service boundaries already proven in earlier tickets.

**Blocked by:** 03 — Compose AR Asset Overview With Monitoring Service; 04 — List Work Orders Linked to an AR Asset; 05 — Create AR Work Order Using Existing `assetRef`.

**Status:** completed

- [x] The BFF exposes a single AR overlay composition endpoint suitable for the primary mobile scan-to-overlay flow.
- [x] The endpoint starts from a marker code or an already resolved asset reference, matching the agreed API shape for the AR client.
- [x] The response includes normalized asset identity from Asset Service.
- [x] The response includes monitoring summary from Monitoring Service when applicable and available.
- [x] The response includes open/relevant work-order summary from Incident Workflow Service when available.
- [x] The response includes clear partial-availability metadata for monitoring and work-order sections.
- [x] Asset resolution failure returns a blocking AR-facing error because the overlay cannot be anchored without a valid asset.
- [x] Monitoring read failure does not block asset identity or work-order summary from returning.
- [x] Work-order read failure does not block asset identity or monitoring summary from returning.
- [x] The endpoint avoids creating tickets as a side effect; work-order creation remains the explicit command from ticket 05.
- [x] The response is stable, consumer-oriented, and avoids exposing raw downstream service payloads.
- [x] Tests cover the full successful overlay composition path for a rack.
- [x] Tests cover the full successful overlay composition path for a node.
- [x] Tests cover partial monitoring failure.
- [x] Tests cover partial work-order failure.
- [x] Tests cover marker/asset failure as a hard failure.
- [x] Tests prove the endpoint does not query downstream service databases directly.
- [x] The composed endpoint is demoable as the main v1 AR backend flow.

## Implementation Notes

- Added `POST /api/v1/ar/overlay` as the primary scan-to-overlay read endpoint.
- Supports either `{ "markerCode": "..." }` or `{ "asset": { "assetType": "rack" | "node", "assetCode": "..." } }`.
- Resolves marker/asset identity through the Asset Service client port only.
- Reads monitoring and work-order summaries through their existing downstream client ports only.
- Returns partial availability metadata for monitoring/work-order failures while keeping asset resolution as a hard failure.
- Does not call the ticket creation command path.
