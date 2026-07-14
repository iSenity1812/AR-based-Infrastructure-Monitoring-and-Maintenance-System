# Alertmanager Phase-1 Runtime

This folder contains the Alertmanager runtime package used by the delegated alerting v1 local stack.

## Purpose

- Group and deduplicate delegated alerts emitted by Grafana-managed rules
- Apply rack and severity-based inhibition
- Provide the first local routing tree for `lab` alert delivery

## Files

- `alertmanager.yml`: local routing and inhibition configuration for delegated alerting v1
- `lab-webhook-sink/server.py`: local webhook receiver for lab delivery verification
- `route-test-rack-alert.labels`: representative rack labels for route validation
- `route-test-node-alert.labels`: representative node labels for route validation
- `route-test-workload-alert.labels`: representative workload labels for route validation
- `task-1-routing-baseline.yaml`: target-state routing baseline for delegated alerting v1 work

## Current routing contract

The legacy backend-posted rack alert path used labels such as:

- `alertname=RackHealthAlert`
- `scope_type=rack`
- `scope_id=<rack-id>`
- `scope_key=rack:<rack-id>`
- `severity_code=<0..4>`
- `lifecycle_status=<active|resolved>`
- `fingerprint=<stable-transition-fingerprint>`

The delegated alerting v1 contract used by Grafana and Alertmanager is different:

- no `scope_id`
- node grouping uses `node_id`
- rack grouping uses `rack_id`
- workload grouping uses `workload_id`

That target baseline is captured in `task-1-routing-baseline.yaml` and should
drive the next infra configuration tasks instead of extending `scope_id` usage.

The current delegated routing tree matches alerts by:

- `scope_type`
- `environment`
- `severity`
- concrete identity labels such as `rack_id`, `node_id`, `workload_id`

## Local runtime

`backend/apps/docker-compose.services.yml` and `backend/apps/docker-compose.shared.yml` can mount this config into an `alertmanager` container and expose the UI/API on `http://127.0.0.1:9093`.

Task 0.4 adds a local webhook sink container for lab delivery validation:

- `http://127.0.0.1:18081/critical`
- `http://127.0.0.1:18081/warning`
- `http://127.0.0.1:18081/default`

The sink persists received requests in the Docker volume mounted at `/data/requests.jsonl` inside the container and also prints each delivery to container logs.

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

Validate route matching with the representative node labels:

```powershell
$labels = Get-Content .\infra\alertmanager\route-test-node-alert.labels
docker run --rm ^
  -v ${PWD}/infra/alertmanager:/workspace ^
  prom/alertmanager:v0.28.1 ^
  amtool config routes test ^
  --config.file=/workspace/alertmanager.yml ^
  $labels
```

Validate route matching with the representative workload labels:

```powershell
$labels = Get-Content .\infra\alertmanager\route-test-workload-alert.labels
docker run --rm ^
  -v ${PWD}/infra/alertmanager:/workspace ^
  prom/alertmanager:v0.28.1 ^
  amtool config routes test ^
  --config.file=/workspace/alertmanager.yml ^
  $labels
```

## Expected route results

The representative rack label set should resolve to receiver:

```text
monitoring-rack-lab
```

The representative node label set should resolve to receiver:

```text
monitoring-node-critical-lab
```

The representative workload label set should resolve to receiver:

```text
monitoring-workload-warning-lab
```

## Lab delivery channels

The current lab receivers are wired as:

- `monitoring-rack-lab` -> `http://alert-webhook-sink:8080/critical`
- `monitoring-node-critical-lab` -> `http://alert-webhook-sink:8080/critical`
- `monitoring-workload-critical-lab` -> `http://alert-webhook-sink:8080/critical`
- `monitoring-node-warning-lab` -> `http://alert-webhook-sink:8080/warning`
- `monitoring-workload-warning-lab` -> `http://alert-webhook-sink:8080/warning`
- `monitoring-lab-default` -> `http://alert-webhook-sink:8080/default`

All webhook receivers use `send_resolved: true` so resolved transitions can also be inspected in lab.

## Manual delivery verification

Start or refresh the local delivery stack:

```powershell
docker compose -f .\backend\apps\docker-compose.shared.yml up -d alert-webhook-sink alertmanager grafana
```

Post a sample critical alert into Alertmanager:

```powershell
$now = (Get-Date).ToUniversalTime()
$payload = @(
  @{
    labels = @{
      alertname = 'NodeCpuTempCritical'
      scope_type = 'node'
      node_id = 'node-lab-01'
      rack_id = 'rack-a1'
      severity = 'critical'
      environment = 'lab'
      source = 'manual-test'
    }
    annotations = @{
      summary = 'Manual critical test'
    }
    startsAt = $now.ToString('o')
    endsAt = $now.AddSeconds(45).ToString('o')
  }
) | ConvertTo-Json -Depth 6

Invoke-RestMethod `
  -Method Post `
  -Uri 'http://127.0.0.1:9093/api/v2/alerts' `
  -ContentType 'application/json' `
  -Body $payload
```

Inspect deliveries:

```powershell
docker logs backend-shared-alert-webhook-sink --since 2m
```

If you wait until the posted alert `endsAt` passes, the sink should receive a resolved webhook as well because the receivers send resolved notifications.

## Grouping rationale

- `group_wait: 15s` allows short bursts of alerts for the same scope to batch together.
- `group_interval: 2m` avoids noisy rebatching during quick repeated state changes.
- `repeat_interval: 4h` is conservative for lab validation before real downstream channels are finalized.

## Inhibition decision

The local delegated config now includes initial inhibition rules:

- `RackCritical` suppresses `NodeStale` and `ContainerUnhealthyPresent` on the same `rack_id`.
- `critical` suppresses matching `warning` alerts on the same `node_id` or `workload_id`.
