# Spec: Alerting Task 1 Contract and Query Baseline

## Assumptions I'm Making
1. Task 1 chi tap trung vao `alert contract` va `ClickHouse query contract`, chua bao gom viec implement sync vao `Monitoring Service`.
2. Alerting v1 se dung `Grafana Alerting` de evaluate rules va `Alertmanager` de group, dedup, route, silence, inhibit, notify.
3. `Monitoring Service` se consume current alert state sau Task 1, nhung Task 1 khong chot endpoint hay adapter sync cu the.
4. Cac serving views uu tien da co san va la source of truth cho Task 1, khong mo schema migration trong phase nay.
5. `scope_id` da bi loai bo va se khong duoc dua tro lai duoi bat ky alias nao trong contract v1.
6. Alert catalog v1 trong [2026-07-13-alerting-design.md](D:\Study\FPTU\WDP301\projects\AR-based-Infrastructure-Monitoring-and-Maintenance-System\docs\superpowers\specs\2026-07-13-alerting-design.md) la danh sach rule duoc su dung de chot contract va query output.

## Objective
Viet spec rieng cho Task 1 de chot hai thu truoc khi cau hinh `Grafana Alerting` va `Alertmanager`:

1. `Alert contract`
   chot labels, annotations, grouping keys, inhibition keys, va output semantics cho tung loai alert `node`, `rack`, `workload`.
2. `ClickHouse query contract`
   chot output shape toi thieu ma moi query rule trong Grafana phai tra ve de map duoc sang alert contract ma khong can doan them.

Muc tieu nghiep vu:
- giam ambiguity truoc khi config external alert stack
- tranh de backend, Grafana, Alertmanager moi noi mot contract rieng
- dam bao team co the bat dau viet rules ma khong phai quay lai sua terminology hay scope keys

Thanh cong duoc dinh nghia la:
- moi rule v1 co output contract ro rang
- team co the config `Grafana Alerting` dua tren spec nay ma khong can phat minh them fields
- `Alertmanager` co du labels de group va inhibit dung cach sau khi bo `scope_id`

## Tech Stack
- `ClickHouse` serving views cho query alert inputs
- `Grafana Alerting` cho evaluation va alert instance lifecycle `pending / firing / resolved`
- `Alertmanager` cho grouping, dedup, silence, inhibition, routing
- `Monitoring Service` NestJS 11 la downstream consumer cua current alert state o phase sau
- TypeScript/NestJS workspace o:
  [backend/apps/control-plane/monitoring-service](D:\Study\FPTU\WDP301\projects\AR-based-Infrastructure-Monitoring-and-Maintenance-System\backend\apps\control-plane\monitoring-service)

## Commands
Lenh local co the dung de verify repo context va monitoring workspace:

```powershell
Build monitoring-service:
pnpm -C backend/apps/control-plane/monitoring-service build

Lint monitoring-service:
pnpm -C backend/apps/control-plane/monitoring-service lint

Test monitoring-service:
pnpm -C backend/apps/control-plane/monitoring-service test

Read current alerting design spec:
Get-Content -Raw docs/superpowers/specs/2026-07-13-alerting-design.md

Find scope_id regressions in specs:
Select-String -Path 'docs/superpowers/specs/*.md' -Pattern 'scope_id|scopeId'
```

Lenh ho tro verify ClickHouse contract o muc thu cong:

```powershell
Docker status:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

ClickHouse ping:
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8123/?query=SELECT%201" -Headers @{ "X-ClickHouse-User"="root"; "X-ClickHouse-Key"="password" }
```

Ghi chu:
- Task 1 khong bat buoc phai co command provision Grafana/Alertmanager trong repo.
- Task 1 tap trung vao spec va query shape; commands chi de verify local docs, service context, va ClickHouse availability.

## Project Structure
Nhung khu vuc lien quan truc tiep den Task 1:

```text
docs/superpowers/specs/
  2026-07-13-alerting-design.md
  2026-07-13-alerting-task-1-contract-and-query-spec.md

backend/apps/control-plane/monitoring-service/
  src/
    presentation/http/controllers/        -> current dashboard-facing monitoring APIs
    application/use-cases/                -> future alert sync/read-model integration
    domain/                               -> monitoring concepts and state

docs/
  service_decomposition.md                -> service ownership boundaries
  service_interaction_matrix.md           -> protocol boundaries
  data_pipeline_architecture.md           -> serving-state and alert flow context
```

Task 1 boundary:
- spec and contract design only
- khong sua code implementation
- khong sua database schema
- khong sua serving view SQL trong phase nay

## Code Style
Task 1 la spec task, nhung contract phai follow naming va response discipline cua repo:

- dung `snake_case` cho alert labels vi day la machine-processing contract
- dung `lowercase` values on dinh cho labels nhu `severity`, `scope_type`, `category`, `source`
- dung `camelCase` cho TypeScript-facing mapper/model neu phase sau co mirror contract vao backend
- khong reuse mot field generic de thay cho identity cu the cua scope

Vi du contract style dung:

```json
{
  "alertname": "NodeCpuTempCritical",
  "severity": "critical",
  "scope_type": "node",
  "node_id": "node-msi-5e8ff2c0",
  "rack_id": "rack-a1",
  "environment": "lab",
  "team": "infra",
  "category": "thermal",
  "source": "grafana"
}
```

Vi du khong duoc dung:

```json
{
  "scope_type": "node",
  "scope_id": "node-msi-5e8ff2c0"
}
```

Nguyen tac style:
- labels phai stable, low-cardinality o muc hop ly
- values dynamic nhu `current_value`, `freshnessSec`, `restart_count`, timestamp runtime phai nam trong annotations, khong nam trong labels
- grouping key phai doc duoc tu labels ma khong can infer them

## Testing Strategy
Task 1 la spec task, nen testing strategy tap trung vao validation cua contract va query shape:

- Spec review:
  - moi rule v1 co source view ro rang
  - moi rule v1 co output fields required ro rang
  - grouping/inhibition co the suy ra truc tiep tu labels
- Contract consistency review:
  - khong con `scope_id`
  - node alerts dung `node_id`
  - rack alerts dung `rack_id`
  - workload alerts dung `workload_id`
- Query-shape review:
  - moi query du kien tra ve du field toi thieu de map sang labels + annotations

Test levels cho phase sau duoc derive tu spec nay:
- Unit:
  - mapper tu query row -> alert payload
  - grouping key derivation
- Manual:
  - review query preview trong Grafana
  - review grouped/inhibited behavior trong Alertmanager

## Boundaries
- Always:
  - giu `scope_id` ngoai contract v1
  - dung identity field cu the theo scope: `node_id`, `rack_id`, `workload_id`
  - giu `Grafana Alerting` la noi evaluate rule
  - giu `Alertmanager` la noi group/dedup/inhibit/route
  - giu Task 1 o muc contract va query shape, khong nhay sang implementation code
- Ask first:
  - sua serving view schema
  - them rule moi ngoai alert catalog v1
  - doi public contract sau khi Grafana rules da bat dau duoc config
  - dua AI enrichment vao labels hay annotations cua v1
- Never:
  - dua lai `scope_id`
  - nhung metric values bien dong lien tuc vao labels
  - de `Monitoring Service` tiep tuc so huu detection logic nhu mot alert engine v1
  - config Grafana/Alertmanager dua tren fields chua duoc chot trong spec nay

## Success Criteria
- [ ] Co mot `common alert contract` ro rang cho `node`, `rack`, `workload`
- [ ] Co `query output contract` toi thieu cho moi rule v1
- [ ] Co grouping key va inhibition key nhat quan voi contract moi khong dung `scope_id`
- [ ] Co phan biet ro field nao lay tu query, field nao hardcode trong rule, field nao format thanh annotation
- [ ] Team co the buoc sang config `Grafana Alerting` ma khong can mo lai tranh luan ve contract

## Rule Catalog Scope
Task 1 se chot contract va query contract cho cac rule sau:

1. `NodeStale`
2. `NodeCpuTempCritical`
3. `NodeMemoryPressureHigh`
4. `NodeDiskUsageHigh`
5. `ContainerUnhealthyPresent`
6. `ContainerRestarting`
7. `RackCritical`
8. `NodeCpuUsageHigh`

Task 1 khong mo rong sang:
- `NodeCriticalMetricPresent`
- `NodeWorkloadHotspot`
- AI-driven anomaly alerts
- narrative/explanation alerts

## Common Alert Contract

### Labels
Required label set chung:

```json
{
  "alertname": "<RuleName>",
  "severity": "<warning|critical>",
  "scope_type": "<node|rack|workload>",
  "environment": "<lab|staging|prod>",
  "team": "<infra>",
  "category": "<availability|resource|thermal|runtime>",
  "source": "grafana"
}
```

Scope-specific required labels:

- `node` alerts:
  - `node_id`
  - `rack_id`
- `rack` alerts:
  - `rack_id`
- `workload` alerts:
  - `workload_id`
  - `node_id`
  - `rack_id`

Optional labels chi duoc them neu thuc su on dinh va co use case routing ro rang.

### Annotations
Required annotation set v1:

```json
{
  "summary": "<short human readable title>",
  "description": "<human readable description>",
  "metric_key": "<metric identity or logical key>",
  "observed_window": "<window text>",
  "dashboard_url": "<grafana dashboard url>",
  "runbook_url": "<runbook url>"
}
```

Optional annotations khi phu hop:
- `current_value`
- `threshold`

### Label Stability Rules
Allowed in labels:
- stable identifiers
- severity
- category
- team
- source
- environment

Not allowed in labels:
- `current_value`
- `freshnessSec`
- `lastSeenAt`
- `restart_count`
- runtime timestamps
- evidence text

## Grouping and Inhibition Contract

### Grouping Keys
- node alerts:
  - `group_by: [alertname, node_id]`
- rack alerts:
  - `group_by: [alertname, rack_id]`
- workload alerts:
  - `group_by: [alertname, workload_id]`

### Inhibition Keys
- `RackCritical` inhibits child alerts in same `rack_id`
- `critical` inhibits corresponding `warning` when same scope identity:
  - same `node_id` for node alerts
  - same `workload_id` for workload alerts

Task 1 khong chot toan bo route tree, nhung bat buoc chot du labels de route tree co the duoc viet o Task config tiep theo.

## Query Contract Design

### Query Contract Principle
Task 1 khong bat buoc viet full SQL cuoi cung cho moi rule, nhung bat buoc chot:
- source view
- output fields required
- evaluation field semantics
- field-to-label mapping
- field-to-annotation mapping

Moi query contract phai tra loi duoc 5 cau hoi:
1. Rule doc view nao?
2. Rule evaluate metric/condition nao?
3. Query can tra ra cac identity fields nao?
4. Query can tra ra dynamic values nao de fill annotations?
5. Field nao la query output, field nao la rule constant?

### Field Provenance Types
Co 3 nhom field:

1. `query-derived`
   - lay truc tiep tu result row
2. `rule-constant`
   - hardcode trong Grafana rule definition
3. `annotation-formatted`
   - duoc format tu query-derived + rule-constant

Vi du:
- `alertname` -> `rule-constant`
- `category` -> `rule-constant`
- `node_id` -> `query-derived`
- `current_value` -> `annotation-formatted` tu query-derived

## Rule-by-Rule Query Baseline

### 1. NodeStale
- Scope:
  - `node`
- Source view:
  - `telemetry_db.node_current_summary`
- Condition:
  - `summary_ts` cu hon nguong stale v1
- Required query output:
  - `node_id`
  - `rack_id`
  - `summary_ts`
- Query-derived labels:
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=NodeStale`
  - `scope_type=node`
  - `category=availability`
  - `source=grafana`
- Annotation fields:
  - `metric_key=summary_ts`
  - `observed_window=current snapshot`
  - `description` dua tren freshness expectation

### 2. NodeCpuTempCritical
- Scope:
  - `node`
- Source view:
  - `telemetry_db.node_summary_trend_1m`
- Condition:
  - `cpu_temperature_c_current > 90` trong cua so sustained
- Required query output:
  - `node_id`
  - `rack_id`
  - `cpu_temperature_c_current`
  - `summary_ts`
- Query-derived labels:
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=NodeCpuTempCritical`
  - `scope_type=node`
  - `severity=critical`
  - `category=thermal`
- Annotation fields:
  - `metric_key=node.cpu_temperature_c`
  - `current_value`
  - `threshold=90`
  - `observed_window=5m`

### 3. NodeMemoryPressureHigh
- Scope:
  - `node`
- Source view:
  - `telemetry_db.node_summary_trend_1m`
- Condition:
  - `memory_used_pct_current` vuot nguong warning/critical trong cua so sustained
- Required query output:
  - `node_id`
  - `rack_id`
  - `memory_used_pct_current`
  - `summary_ts`
- Query-derived labels:
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=NodeMemoryPressureHigh`
  - `scope_type=node`
  - `category=resource`
- Annotation fields:
  - `metric_key=node.memory_used_pct`
  - `current_value`
  - `threshold`
  - `observed_window=5m`

### 4. NodeDiskUsageHigh
- Scope:
  - `node`
- Source view:
  - `telemetry_db.node_summary_trend_1m`
  - fallback `telemetry_db.node_current_summary`
- Condition:
  - `disk_used_pct_max_current` vuot nguong sustained
- Required query output:
  - `node_id`
  - `rack_id`
  - `disk_used_pct_max_current`
  - `summary_ts`
- Query-derived labels:
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=NodeDiskUsageHigh`
  - `scope_type=node`
  - `category=resource`
- Annotation fields:
  - `metric_key=node.disk_used_pct_max`
  - `current_value`
  - `threshold`
  - `observed_window=10m`

### 5. ContainerUnhealthyPresent
- Scope:
  - `node`
- Source view:
  - `telemetry_db.container_current_summary`
- Condition:
  - ton tai container unhealthy tren node
- Required query output:
  - `node_id`
  - `rack_id`
  - count hoac existence indicator cua unhealthy containers
- Query-derived labels:
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=ContainerUnhealthyPresent`
  - `scope_type=node`
  - `category=runtime`
- Annotation fields:
  - `metric_key=container.health_status`
  - `observed_window=current snapshot`

### 6. ContainerRestarting
- Scope:
  - `workload`
- Source view:
  - `telemetry_db.container_current_summary`
  - `telemetry_db.container_summary_trend_1m`
- Condition:
  - workload restart bat thuong
- Required query output:
  - `workload_id`
  - `node_id`
  - `rack_id`
  - `restart_count_current` hoac restart delta semantic
- Query-derived labels:
  - `workload_id`
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=ContainerRestarting`
  - `scope_type=workload`
  - `category=runtime`
- Annotation fields:
  - `metric_key=container.restart_count`
  - `current_value`
  - `observed_window=current snapshot`

### 7. RackCritical
- Scope:
  - `rack`
- Source view:
  - derived rack serving view neu co
  - hoac aggregate query tu node-level views
- Condition:
  - rack co nhieu node critical/stale vuot nguong
- Required query output:
  - `rack_id`
  - child count indicators can thiet cho condition
- Query-derived labels:
  - `rack_id`
- Rule-constant labels:
  - `alertname=RackCritical`
  - `scope_type=rack`
  - `severity=critical`
  - `category=availability`
- Annotation fields:
  - `observed_window=current snapshot or 5m`
  - `description` mo ta tinh chat widespread condition

### 8. NodeCpuUsageHigh
- Scope:
  - `node`
- Source view:
  - `telemetry_db.node_summary_trend_1m`
- Condition:
  - `cpu_usage_pct_current` vuot nguong sustained
- Required query output:
  - `node_id`
  - `rack_id`
  - `cpu_usage_pct_current`
  - `summary_ts`
- Query-derived labels:
  - `node_id`
  - `rack_id`
- Rule-constant labels:
  - `alertname=NodeCpuUsageHigh`
  - `scope_type=node`
  - `category=resource`
- Annotation fields:
  - `metric_key=node.cpu_usage_pct`
  - `current_value`
  - `threshold`
  - `observed_window=5m`

## Deliverables of Task 1
Task 1 duoc xem la hoan thanh khi team co duoc:

1. mot contract labels/annotations da chot
2. mot bang hoac spec section cho moi rule v1:
   - source view
   - condition
   - required query outputs
   - query-derived labels
   - rule-constant labels
   - annotation fields
3. mot grouping/inhibition baseline phu hop voi contract moi
4. danh sach open questions con lai de giai quyet truoc Task config Grafana

## Open Questions
- `environment` se duoc lay tu query output hay inject theo deployment-level rule config?
- `workload_id` hien da co san nhat quan trong serving views hay can map tu `container_id`/logical workload identifier?
- `RackCritical` se dung rack serving view rieng hay query aggregate tu node-level views trong Grafana phase dau?
- `ContainerRestarting` o v1 co chap nhan noisy snapshot-based detection, hay bat buoc phai chot delta/window rule ngay tu dau?
- co can them `team` ownership chi tiet hon `infra` cho mot so rule runtime sau phase dau hay khong?
