# Telemetry Collector Architecture Brainstorm

## 1. Muc tieu

Tai lieu nay brainstorming cho phan `Telemetry Collector` cua he thong PoC AR + AI monitoring. Muc tieu:

- De xuat tech direction de thu nghiem nhanh.
- De xuat structure folder va package cho collector.
- Xac dinh luong chay du lieu tu host/container/service den backend.
- Chot cach to chuc collector khi `rack` la topology ao, `laptop = node/server` va `container = workload`.
- Lam co so de scaffold code sau do.

Tai lieu nay nghieng ve huong `Python-first for experimentation`.

## 2. Dinh huong kien truc

## 2.0. Glossary (lam ro "server" di dau)

Trong PoC nay, de tranh nham:

- `rack` = nhom topology/mo phong cua mini data center.
- `switch` = network asset trong rack, giu uplink/port context.
- `node` = thiet bi tinh toan (server theo nghia DCIM).
- `service` = ung dung/chuc nang chay tren node (API, worker, ingest,...).
- `container` = don vi runtime trien khai (Docker container) co the chua service.

Neu ban quen tu "server": hay doc tu "server" thanh `node`.
Neu ban quen tu "laptop": trong PoC laptop thuong dong vai `node`, khong phai `rack`.

### 2.1. Tu duy chinh

Khong nen nghi theo kieu moi scope la mot ung dung rieng. Nen nghi:

- `One collector application`
- `Multiple collector modules`
- `Shared schema and transport`

Nghia la:

- mot app collector co the chay tren may local
- ben trong co nhieu module lay metric
- tat ca module deu dong goi ve cung mot metric envelope

### 2.2. Cac collector logic trong PoC

Trong PoC, co the chia thanh 5 collector logic:

- `host collector`
  - lay CPU, memory, disk, uptime, OS info
  - scope: `node`

- `network collector`
  - lay adapter status, rx/tx, IP, VPN, uplink
  - scope: `interface`, `ipam`, mot phan `switch` va `switch_port`

- `service collector`
  - lay Windows service status, app health check, API latency
  - scope: `service`

- `docker collector`
  - lay container status, restart count, image, resource usage
  - scope: `container`

- `heartbeat / pipeline collector`
  - bao collector van song, so metric da gui, do tre ingest local
  - scope: `operations`

### 2.3. Cach map trong PoC

- `rack = topology context ao`
- `switch = network asset modeled/partly-simulated`
- `host OS = node` (server trong PoC, vi du laptop)
- `network adapter = interface`
- `windows service/backend api = service` (ung dung)
- `docker container = container`

Collector chay tren laptop co the phat sinh metric cho nhieu scope cung luc.

### 2.4. Vai tro cua switch trong collector model

Trong PoC hien tai, `switch` khong nhat thiet la thiet bi that co SNMP hoac API rieng. Thay vao do:

- metadata switch duoc khai bao trong topology
- `switch.status`, `switch.uplink_status`, `switch_port.*` co the duoc derive hoac simulate
- collector enrich metric cua node/interface de suy ra network context cap switch

Trang thai hien tai cua `switch`:

- Da chot: uplink status, port status, connected asset, flap/event context
- Dang research: VLAN, STP, LACP, MAC table, SNMP inventory, routing behavior

## 3. Tai sao nen thu bang Python truoc

Python hop cho giai doan nay vi:

- viet collector nhanh
- de goi Windows command va parse output
- de lam proof-of-concept cho Docker metrics
- de chen them scoring, anomaly logic, retry logic
- de test schema va API ingest

Neu sau nay can:

- dong goi binary nhe
- chay lau va on dinh
- phat hanh agent cho nhieu host

thi co the rewrite sang Go.

## 4. Folder structure de xuat

## 4.1. Structure tong quan

```text
telemetry/
  collector_architecture_brainstorm.md
  collector/
    README.md
    pyproject.toml
    .env.example
    configs/
      collector.local.yaml
      metrics.yaml
      assets.yaml
    scripts/
      run_collector.py
      run_once.py
    src/
      telemetry_collector/
        __init__.py
        main.py
        bootstrap.py
        config/
          __init__.py
          settings.py
          schema.py
        core/
          __init__.py
          models.py
          enums.py
          clock.py
          logging.py
          errors.py
        collectors/
          __init__.py
          base.py
          topology_collector.py
          host_collector.py
          network_collector.py
          service_collector.py
          docker_collector.py
          heartbeat_collector.py
        providers/
          __init__.py
          windows/
            __init__.py
            counters.py
            services.py
            network.py
            system.py
          docker/
            __init__.py
            client.py
          probes/
            __init__.py
            http_probe.py
            ping_probe.py
        pipeline/
          __init__.py
          scheduler.py
          normalizer.py
          enricher.py
          aggregator.py
          topology_mapper.py
          health_score.py
          deduplicator.py
        transports/
          __init__.py
          http_client.py
          file_sink.py
          stdout_sink.py
        repositories/
          __init__.py
          asset_repository.py
          state_repository.py
        utils/
          __init__.py
          ids.py
          time.py
          units.py
        tests/
          test_models.py
          test_health_score.py
          test_normalizer.py
```

## 4.2. Y nghia tung tang

### `config/`

Chua cau hinh:

- endpoint backend
- chu ky thu thap
- bat/tat module nao
- mapping asset nhu `rack_id`, `switch_id`, `node_id`, `primary_uplink`

### `core/`

Chua domain model chung:

- `MetricEnvelope`
- `CollectorContext`
- `MetricSample`
- enum cho `scopeType`, `collectorType`, `metricValueType`
- topology mapping cho `rack -> switch -> node -> service/container`

Day la tang rat quan trong de cac collector module khong tu y tra ve JSON lung tung.

### `collectors/`

Noi chua cac collector logic.

Moi collector:

- biet minh phai lay du lieu gi
- tra ve danh sach metric theo schema chung
- khong tu push network truc tiep neu co the tranh duoc

### `providers/`

Tang nay la noi noi chuyen voi he thong ben ngoai:

- Windows Performance Counters
- Windows services
- network adapters
- Docker CLI/API
- HTTP health endpoint
- ping probe

Va co the bao gom:

- file topology/static asset mapping
- probe uplink giua node va endpoint de suy ra `switch.uplink_status`

Tach `providers` giup:

- de test
- de thay nguon du lieu
- de mock trong unit test

### `pipeline/`

Day la tang xu ly metric sau khi thu thap:

- chuan hoa format
- enrich metadata
- tinh metric derived
- map metric cua node/interface sang `switch` va `switch_port`
- tinh `health_score`
- loai metric trung hoac metric loi

### `transports/`

Noi gui metric den dich:

- HTTP ingest API
- file output de debug
- stdout de local dev

### `repositories/`

Noi doc metadata va luu state cuc bo:

- mapping rack/node/service/container
- mapping rack/switch/node/service/container
- checkpoint hoac cache state de tinh `restart_count`, `flap_count`

## 5. Package design chi tiet

## 5.1. Core models de xuat

Nen co it nhat cac model sau:

- `MetricEnvelope`
- `MetricValue`
- `CollectorRunResult`
- `AssetContext`
- `CollectorModule`
- `TopologyLink`

Vi du:

```python
from dataclasses import dataclass, field
from typing import Any

@dataclass
class MetricEnvelope:
    metric_key: str
    scope_type: str
    scope_id: str
    collector_type: str
    timestamp: str
    value: Any
    unit: str
    source: str
    tags: dict[str, str] = field(default_factory=dict)
```

## 5.2. Base collector interface

Moi collector nen theo cung interface:

```python
class BaseCollector:
    name: str
    collector_type: str

    def collect(self) -> list[MetricEnvelope]:
        raise NotImplementedError
```

Neu muon dep hon:

- them `is_enabled()`
- them `collect_metadata()`
- them `healthcheck()`

## 5.3. Host collector

Trach nhiem:

- doc topology metadata cho rack, switch, node, marker
- validate mapping giua switch port va node/interface
- emit metadata heartbeat hoac inventory event neu can

Khong nen:

- tu thu metric runtime

## 5.4. Host collector

Trach nhiem:

- CPU
- memory
- disk
- uptime
- process count
- service running count
- node health score input

Khong nen:

- tu tinh alert
- tu push dashboard format

## 5.5. Network collector

Trach nhiem:

- interface status
- link speed
- rx/tx throughput
- IP address
- prefix
- VPN status
- uplink derivation
- switch uplink derivation
- switch port context derivation

Co the phat sinh:

- `interface.*`
- `ipam.*`
- `switch.uplink_status`
- `switch_port.*`
- `rack.network_uplink_status`

## 5.6. Service collector

Trach nhiem:

- lay service status
- goi health endpoint
- do latency
- lay error rate neu app expose

Service collector nen doc danh sach service can monitor tu config:

```yaml
services:
  - service_id: api-gateway
    display_name: API Gateway
    type: http
    health_url: http://localhost:3000/health
  - service_id: collector-service
    type: windows-service
    windows_name: TelemetryCollector
```

## 5.7. Docker collector

Trach nhiem:

- list container dang chay
- lay `status`, `restart_count`, `image`
- lay CPU/memory
- map container voi service logic neu co

Neu Docker khong ton tai:

- module co the disabled
- khong lam collector crash

## 5.8. Heartbeat collector

Trach nhiem:

- tao heartbeat metric
- dem so metric da collect
- dem so metric gui thanh cong
- ghi nhan thoi gian run
- cho backend biet collector van song

## 6. Flow xu ly de xuat

## 6.1. Flow tong quan

```text
Scheduler
  -> run enabled collectors
  -> receive raw metric samples
  -> normalize fields
  -> enrich with asset metadata
  -> derive computed metrics
  -> batch metrics
  -> send to backend ingest API
  -> record local state and logs
```

## 6.2. Flow chi tiet 1 chu ky

1. Nap config.
2. Tao `CollectorContext`.
3. Scheduler chon collector can chay theo interval.
4. Collector goi provider de lay raw data.
5. Collector tra ve `MetricEnvelope[]`.
6. `normalizer` kiem tra key, unit, timestamp.
7. `enricher` them `rack_id`, `switch_id`, `node_id`, `site`, `primary_uplink`.
8. `topology_mapper` gan interface/node vao switch port neu co mapping.
9. `aggregator` tinh metric tong hop nhu `rack.status`, `rack.health_score`, `switch.status`, `switch_port.flap_count_1h`.
10. `transport` gui batch metric.
11. `state_repository` luu state can cho lan sau.
12. Ghi log va metric heartbeat.

## 6.3. Flow khi loi

Neu 1 module loi:

- ghi log module do
- danh dau `collector.module_error_count`
- khong lam sap toan bo collector

Neu push backend loi:

- retry co gioi han
- co local fallback file queue neu can
- tang `ops.ingestion_error_count`

## 7. Config design de xuat

## 7.1. File `collector.local.yaml`

```yaml
collector:
  collector_id: collector-local-01
  rack_id: rack-a1
  switch_id: sw-a1
  node_id: node-host-01
  site: lab-local
  environment: poc
  interval_seconds: 5
  batch_size: 200

transport:
  type: http
  ingest_url: http://localhost:8080/api/telemetry/ingest
  timeout_seconds: 5
  api_key: dev-key

modules:
  host: true
  network: true
  service: true
  docker: true
  heartbeat: true
```

## 7.2. File `assets.yaml`

```yaml
rack:
  rack_id: rack-a1
  rack_code: RACK-A1
  site: lab-local
  primary_uplink: Wi-Fi
  u_capacity: 12
  u_used: 6

switch:
  switch_id: sw-a1
  name: SW-A1
  uplink_name: UPLINK-01
  research_status: partial-modeled
  ports:
    - port_id: sw-a1-p1
      name: Gi0/1
      connected_node_id: node-host-01

node:
  node_id: node-host-01
  hostname: laptop-main
  device_type: laptop
```

## 7.3. File `metrics.yaml`

```yaml
metrics:
  node.cpu_usage_pct:
    enabled: true
    interval_seconds: 5
  node.memory_used_pct:
    enabled: true
    interval_seconds: 5
  service.response_time_ms:
    enabled: true
    interval_seconds: 10
```

## 8. File-by-file implementation goi y

## 8.1. `main.py`

Trach nhiem:

- entrypoint
- nap settings
- bootstrap collector app
- khoi dong scheduler

## 8.2. `bootstrap.py`

Trach nhiem:

- wire dependencies
- tao providers
- tao collectors
- tao transport
- tao pipeline services

Day la noi rat hop de gom khoi tao object.

## 8.3. `scheduler.py`

Trach nhiem:

- lap lich tung collector theo chu ky
- cho phep `run once`
- tong hop ket qua mot vong thu thap

Ban dau co the rat don gian:

- vong lap while true
- sleep theo interval

Sau nay moi nang cap scheduler dep hon.

## 8.4. `normalizer.py`

Trach nhiem:

- dam bao `metric_key` hop le
- timestamp theo ISO 8601
- unit khong rong
- scope co ton tai
- switch va switch_port scope hop le neu metric duoc derive

Module nay se giup backend do “ban”.

## 8.5. `enricher.py`

Trach nhiem:

- gan `rack_id`, `node_id`
- gan `switch_id`
- gan `site`, `environment`
- map ten interface sang interface_id neu can
- map container sang service logic neu co config

## 8.6. `health_score.py`

Trach nhiem:

- tinh `node.health_score`
- tinh `switch.health_score`
- tinh `rack.health_score`
- khong nen dinh alert threshold cứng tai day

Nen de cong thuc o dang config duoc.

## 8.7. `http_client.py`

Trach nhiem:

- batch va post metric
- retry/backoff
- timeout
- auth header

## 8.8. `state_repository.py`

Trach nhiem:

- luu state local dang JSON/SQLite nhe
- dung de tinh:
  - restart count delta
  - flap count
  - last successful push

PoC co the dung JSON file truoc.

## 9. Flow metric theo scope

## 9.1. Rack flow

`topology collector` + `host collector` + `network collector` -> `aggregator` -> sinh:

- `rack.status`
- `rack.health_score`
- `rack.network_uplink_status`

Rack metric chu yeu la metric `derived`.

## 9.2. Switch flow

`topology collector` + `network collector` + `state_repository` -> sinh:

- `switch.status`
- `switch.health_score`
- `switch.uplink_status`
- `switch_port.status`
- `switch_port.flap_count_1h`

Switch metric trong PoC da phan:

- phan da co the chot: topology, uplink, port status, port flap, connected asset
- phan con dang research: VLAN, STP, LACP, SNMP inventory, MAC table, routing

## 9.3. Node flow

`host collector` -> sinh truc tiep:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.disk_used_pct`
- `node.uptime_seconds`

## 9.4. Container flow

`docker collector` -> sinh:

- `container.status`
- `container.restart_count`
- `container.cpu_usage_pct`
- `container.memory_used_mb`

## 9.5. Service flow

`service collector` -> sinh:

- `service.status`
- `service.response_time_ms`
- `service.error_rate_pct`

## 9.6. Operations flow

`heartbeat collector` + transport result -> sinh:

- `ops.collector_last_seen_at`
- `ops.ingestion_success_rate_pct`
- `ops.ingestion_error_count`

## 10. Thu vien Python goi y

Khong can qua nhieu package luc dau. Goi y:

- `pydantic` hoac `dataclasses`
- `requests` hoac `httpx`
- `psutil`
- `pyyaml`
- `docker` SDK hoac goi CLI Docker
- `pytest`

Neu muon rat gon:

- `psutil`
- `requests`
- `pyyaml`

Cho Windows-specific metrics, co the dung:

- `subprocess` goi PowerShell
- hoac `wmi` / `pywin32` neu that su can

Ban dau nen uu tien `psutil + subprocess` de di nhanh.

## 11. MVP implementation plan

## 11.1. Phase 1

Lam duoc cac metric sau:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.disk_used_pct`
- `node.uptime_seconds`
- `interface.status`
- `interface.rx_bytes_sec`
- `interface.tx_bytes_sec`
- `ipam.interface_ipv4`
- `service.status`
- `ops.collector_last_seen_at`
- `switch_port.status`

## 11.2. Phase 2

Them:

- `service.response_time_ms`
- `vpn.tunnel_status`
- `switch.uplink_status`
- `rack.health_score`
- `rack.status`
- `ops.ingestion_success_rate_pct`

## 11.3. Phase 3

Them:

- `container.status`
- `container.restart_count`
- `container.cpu_usage_pct`
- `container.memory_used_mb`
- `switch.health_score`
- `switch_port.flap_count_1h`

## 12. Quy tac thiet ke quan trong

- Moi collector module chi nen lo thu thap du lieu scope cua no.
- Moi metric deu phai qua schema chung.
- Khong tron metadata inventory va time-series neu khong can.
- Khong de module bi loi lam crash toan agent.
- Config phai bat/tat tung module duoc.
- Co `run once` mode de debug.
- Co `stdout/file sink` de test truoc khi push backend.
- Scope `switch` chi nen derive tu topology + network context cho den khi phan research switch nang cao duoc chot.

## 13. De xuat file tiep theo nen tao

Sau tai lieu nay, nen tao them:

- `telemetry/collector/README.md`
- `telemetry/collector/pyproject.toml`
- `telemetry/collector/configs/collector.local.yaml`
- `telemetry/collector/src/telemetry_collector/core/models.py`
- `telemetry/collector/src/telemetry_collector/collectors/base.py`

## 14. Ket luan

Huong phu hop nhat cho giai doan thu nghiem la:

- dung `Python`
- mot app collector
- nhieu module collector
- schema metric thong nhat
- enrich o tang pipeline
- derive `switch` tu topology context + network probes trong giai doan research

Voi cach nay, ban vua co the demo nhanh, vua giu duoc kien truc sach de sau nay mo rong hoac rewrite sang Go neu can.
