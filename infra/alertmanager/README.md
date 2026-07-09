# Alertmanager Phase-1 Runtime

This folder contains the phase-1 Alertmanager runtime package used by `monitoring-service`.

## Purpose

- Accept lifecycle alerts posted by `monitoring-service`
- Group and deduplicate rack monitoring alerts
- Provide the first notification lifecycle target before downstream channels are finalized

## Files

- `alertmanager.yml`: phase-1 routing and grouping configuration
- `route-test-rack-alert.labels`: representative rack labels for route validation

## Current routing contract

The backend currently posts alerts with stable labels such as:

- `alertname=RackHealthAlert`
- `scope_type=rack`
- `scope_id=<rack-id>`
- `scope_key=rack:<rack-id>`
- `severity_code=<0..4>`
- `lifecycle_status=<active|resolved>`
- `fingerprint=<stable-transition-fingerprint>`

The phase-1 routing tree matches rack alerts by:

- `alertname="RackHealthAlert"`
- `scope_type="rack"`

## Local runtime

`backend/apps/docker-compose.services.yml` mounts this config into an `alertmanager` container and exposes the UI/API on `http://127.0.0.1:9093`.

`monitoring-service` should target:

```env
ALERTMANAGER_ENABLED=true
ALERTMANAGER_BASE_URL=http://alertmanager:9093
ALERTMANAGER_TIMEOUT_MS=5000
```

## Validation flow

Validate config syntax in PowerShell:

```powershell
docker run --rm ^
  -v ${PWD}/infra/alertmanager:/workspace ^
  prom/alertmanager:v0.28.1 ^
  amtool check-config /workspace/alertmanager.yml
```

Validate route matching with the representative rack labels:

```powershell
$labels = Get-Content .\infra\alertmanager\route-test-rack-alert.labels
docker run --rm ^
  -v ${PWD}/infra/alertmanager:/workspace ^
  prom/alertmanager:v0.28.1 ^
  amtool config routes test ^
  --config.file=/workspace/alertmanager.yml ^
  $labels
```

If `amtool` is installed locally, the same commands can be run without Docker by pointing to `infra/alertmanager/alertmanager.yml`.

## Expected route result

The representative rack label set should resolve to receiver:

```text
monitoring-rack-phase1
```

## Grouping rationale

- `group_wait: 15s` gives the poller a short buffer to coalesce simultaneous rack changes.
- `group_interval: 2m` avoids noisy rebatching during bursty transitions.
- `repeat_interval: 4h` is conservative for phase 1 and reduces operator spam while the downstream notification policy is still evolving.

## Inhibition decision

Phase 1 intentionally defers inhibition rules:

- Rack alerts are the first production slice and should remain fully visible while the team validates transition quality.
- Cross-scope suppression between rack, service, node, and container should be introduced only after those scopes emit stable alerts.
