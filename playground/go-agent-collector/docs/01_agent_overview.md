# Go Agent Collector Overview

## 1. Muc tieu

Tai lieu nay mo ta tong quan cho `go-agent-collector`, la local agent dung de thu thap va chuan hoa telemetry node/host cho he thong AR + AI infrastructure monitoring.

Muc tieu cua agent:

- lay raw metrics tu exporter chay local tren may
- map ve schema `domain metrics` thong nhat cua he thong
- bo sung metadata nhu `nodeId`, `rackId`, `site`, `environment`
- gui metric batch ve server chinh
- ho tro mo rong tu `Windows` sang `Linux` ma khong doi output contract

## 2. Vai tro cua agent trong kien truc tong the

Luong tong quan:

`raw exporter metrics` -> `go-agent-collector` -> `normalized telemetry payload` -> `main backend`

Agent khong phai la he thong phan tich chinh. No nen giu vai tro mong va on dinh:

- collect
- normalize
- enrich nhe
- derive metric co ban neu can
- batch
- retry / buffer
- send

Nhung phan nen de backend xu ly la:

- health scoring phuc tap
- risk scoring
- anomaly detection
- incident prediction
- cross-node correlation

## 3. Raw input va output mong muon

### 3.1. Raw input

Giai doan dau:

- `Windows` + `windows_exporter`

Giai doan sau:

- `Linux` + `node_exporter`

Y tuong cot loi:

- moi nguon co metric names khac nhau
- moi OS co adapter va mapping rieng
- nhung output cuoi phai giong nhau

### 3.2. Output normalized

Tat ca nguon deu map ve metric he thong, vi du:

- `node.cpu_usage_pct`
- `node.memory_used_pct`
- `node.disk_used_pct`
- `node.network_rx_bytes_sec`
- `node.uptime_seconds`

Nghia la:

- Windows metric name khac Linux metric name
- nhung backend khong can biet su khac nhau do

## 4. Nguyen tac thiet ke

### 4.1. Source-specific, output-common

- `windows_exporter` va `node_exporter` la `source-specific`
- payload gui backend la `output-common`

### 4.2. Config-driven mapping

Khong hardcode mapping qua nhieu trong code.
Nen de:

- config agent
- config asset metadata
- config metric mapping

### 4.3. Agent mong

Agent khong nen om qua nhieu business logic.
Neu dua qua nhieu scoring va rule vao agent, sau nay se kho:

- maintain
- debug
- mo rong sang Linux
- dong bo voi backend

### 4.4. Backpressure va disconnected-friendly

Vi agent chay local, no nen chiu duoc:

- server tam thoi unavailable
- mang bi cham
- can retry va buffer nhe

## 5. Trach nhiem cua agent

Agent nen co cac trach nhiem sau:

1. Goi local exporter endpoint theo interval
2. Parse Prometheus exposition format
3. Loc allowlist metric can dung
4. Map raw metric sang domain metric
5. Chuan hoa unit va timestamp
6. Enrich metadata
7. Tinh mot so metric derived nhe
8. Batch payload
9. Gui ve backend
10. Retry hoac buffer neu gui that bai

## 6. Nhung gi agent khong nen lam

De tranh scope creep, agent tam thoi khong nen lam:

- anomaly model inference nang
- risk scoring phuc tap
- incident prediction model training
- dashboard formatting
- AR presentation logic
- topology orchestration phuc tap

Agent co the tinh mot so derived metric don gian, nhung chi nen o muc:

- uptime tu boot time
- tong rx/tx tu NIC active
- mot vai counter delta can state nhe

## 7. Config de xuat

Nen co it nhat 3 nhom config:

### 7.1. Agent config

Chua:

- backend endpoint
- scrape interval
- send interval
- batch size
- timeout
- retry policy
- local buffer path

### 7.2. Asset config

Chua:

- `nodeId`
- `rackId`
- `switchId`
- `site`
- `environment`
- `primaryUplink`

### 7.3. Mapping config

Chua:

- raw metric name
- domain metric key
- aggregation rule
- unit
- enabled hay khong
- labels nao duoc giu

## 8. Source adapter model

Nen nghi theo model:

- `Source Adapter`
- `Mapping Layer`
- `Transport Layer`

### 8.1. Source adapter

Vi du:

- `windows_exporter_adapter`
- `node_exporter_adapter`

Trach nhiem:

- scrape endpoint
- parse raw metric families
- dua ve cau truc raw thong nhat trong code

### 8.2. Mapping layer

Trach nhiem:

- map raw metrics sang domain metrics
- aggregate theo rule
- enrich metadata

### 8.3. Transport layer

Trach nhiem:

- batch payload
- send HTTP
- retry
- buffer local

## 9. Runtime flow muc cao

Flow de xuat:

1. Agent boot
2. Load config
3. Detect source adapter can dung
4. Scrape local exporter
5. Parse va loc metric can dung
6. Map sang domain metrics
7. Enrich metadata
8. Batch payload
9. Send ve backend
10. Ghi state / retry neu loi

## 10. Interval de xuat

Cho PoC, co the bat dau rat thuc dung:

- scrape local exporter moi `5s`
- batch send ve backend moi `5s`
- metric cham hon van co the scrape cung nhip, nhung khong nhat thiet phai gui rieng

Sau nay neu can toi uu:

- fast lane `5s`
- medium lane `15s`
- slow lane `30s-60s`

## 11. Windows truoc, Linux sau

Thu tu hop ly:

### 11.1. Phase 1

- support `Windows`
- scrape `windows_exporter`
- map bo metric node can thiet
- gui payload on dinh

### 11.2. Phase 2

- giu nguyen schema output
- them `Linux source adapter`
- viet `metrics.linux.yaml`

Nghia la:

- khong doi backend contract
- chi them nguon vao agent

## 12. Ly do chon Go

Go rat hop cho agent nay vi:

- binary don de distribute
- concurrency tot
- memory footprint on
- de chay lau nhu service
- phu hop cho HTTP scrape + batch send
- de dong goi sau nay cho Windows va Linux

Neu team da quen Go, thi day la lua chon rat hop ly cho implementation that, khong chi la playground.

## 13. MVP can chot som

De tranh roi, MVP nen chot:

- chi support `Windows` truoc
- scrape mot endpoint local
- map bo `node metrics` uu tien
- send payload len backend
- co retry va buffer nhe
- co YAML config

## 14. Ranh gioi mo rong sau nay

Sau khi MVP on, co the them:

- Linux adapter
- metrics theo service/container
- local diagnostics endpoint
- healthcheck cho agent
- signed config / remote config
- local WAL/SQLite queue

## 15. Bo docs tiep theo nen co

De du context lam agent, nen viet tiep:

1. `02_runtime_flow.md`
   - mo ta chi tiet vong doi scrape -> map -> batch -> send

2. `03_config_design.md`
   - thiet ke `agent.yaml`, `assets.yaml`, `metrics.windows.yaml`, `metrics.linux.yaml`

3. `04_metric_mapping_spec.md`
   - quy tac map Prometheus metric sang `node.*`

4. `05_payload_schema.md`
   - contract payload gui ve backend

5. `06_state_and_buffering.md`
   - local state, retry, queue, persisted counters

6. `07_windows_source_adapter.md`
   - details cho `windows_exporter`

7. `08_linux_source_adapter.md`
   - details cho `node_exporter`

8. `09_package_structure.md`
   - cau truc package Go

9. `10_mvp_plan.md`
   - pham vi implementation giai doan 1

## 16. Ket luan

Huong dung `go-agent-collector` la hop ly neu minh giu nguyen tac sau:

- input co the khac nhau theo OS
- mapping co the khac nhau theo source
- output phai thong nhat
- agent nen mong, config-driven, de mo rong
- backend la noi xu ly scoring va phan tich chinh

Day la diem bat dau tot de sau do minh chot config, payload, package structure va code agent ma khong bi roi scope.
