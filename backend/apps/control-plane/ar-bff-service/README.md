# AR BFF Service

Mobile-facing backend entry point for marker-based AR workflows.

## Current Scope

- Health endpoint
- Authenticated marker scan endpoint backed by Asset Service marker resolution
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

```json
{
  "markerCode": "MK-RACK-A1"
}
```

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
