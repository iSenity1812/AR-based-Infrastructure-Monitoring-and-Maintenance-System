# AR BFF Service

Mobile-facing backend entry point for marker-based AR workflows.

## Current Scope

- Health endpoint
- Authenticated marker scan endpoint backed by Asset Service marker resolution
- Authenticated AR asset overview backed by Asset Service and Monitoring Service
- Authenticated AR work-order list/create backed by Incident Workflow Service
- API envelope response
- Request and correlation IDs
- JWT/permission guard wiring for future protected AR endpoints
- Downstream client ports for Asset Service, Monitoring Service, and Incident Workflow Service

This service is an orchestration layer only. It does not own marker lifecycle,
asset identity, monitoring state, tickets, incidents, evidence, or workflow
execution.

## Endpoints

- `GET /api/v1/health`
- `POST /api/v1/ar/markers/scan`
- `GET /api/v1/ar/assets/:assetType/:assetCode/overview`
- `GET /api/v1/ar/assets/:assetType/:assetCode/work-orders`
- `POST /api/v1/ar/assets/:assetType/:assetCode/work-orders`

```json
{
  "markerCode": "MK-RACK-A1"
}
```

```json
{
  "ticketCode": "WO-AR-001",
  "title": "Inspect rack cooling anomaly",
  "description": "Created from AR overlay.",
  "priority": "HIGH"
}
```

## Current Integration Notes

Incident Workflow Service currently lists tickets by `ticketCode`, `incidentId`,
and `status`, but not directly by `assetRef`. The AR BFF uses the existing list
endpoint and filters normalized ticket summaries by `assetRef.assetId`. This is
the narrowest compatible behavior for ticket 04; a future Incident Workflow
extension can add first-class asset-linked ticket filtering without changing the
AR-facing BFF response.

## Environment

- `PORT`
- `API_PREFIX`
- `CORS_ORIGIN`
- `SWAGGER_ENABLED`
- `JWT_ACCESS_SECRET`
- `ASSET_SERVICE_BASE_URL`
- `MONITORING_SERVICE_BASE_URL`
- `INCIDENT_WORKFLOW_SERVICE_BASE_URL`

## Verification

```bash
pnpm lint
pnpm test
pnpm build
```
