# Go Agent Collector Package Structure

## 1. Muc tieu

Tai lieu nay de xuat `folder structure` va `package structure` cho `go-agent-collector`.

Muc tieu:

- chot khung thu muc truoc khi code
- tach ro runtime, mapping, state, transport, adapter
- giu code Go de test va de mo rong

## 2. Nguyen tac chia package

Package structure nen theo 5 nguyen tac:

- mot package mot trach nhiem chinh
- package ten ngan, ro nghia
- han che coupling giua source adapter va transport
- de test tung lop rieng
- de them Linux ma khong pha Windows flow

## 3. Folder structure de xuat

```text
playground/go-agent-collector/
  cmd/
    agent/
      main.go
  configs/
    agent.yaml
    assets.yaml
    metrics.windows.yaml
    metrics.linux.yaml
  docs/
    README.md
    01_agent_overview.md
    02_runtime_flow.md
    03_config_design.md
    architecture.d2
    09_package_structure.md
  internal/
    app/
      bootstrap.go
      run.go
    config/
      loader.go
      schema.go
      validate.go
    domain/
      metric.go
      raw_metric.go
      batch.go
      enums.go
    source/
      source.go
      windows/
        adapter.go
      linux/
        adapter.go
    parser/
      prometheus_text.go
    mapping/
      engine.go
      rules.go
    aggregate/
      engine.go
      nic_selector.go
      uptime.go
    enrich/
      metadata.go
    queue/
      memory.go
    sender/
      http.go
      payload.go
    state/
      counters.go
      boot.go
      nic.go
    buffer/
      store.go
    retry/
      policy.go
    observability/
      logger.go
      metrics.go
    shutdown/
      signal.go
  testdata/
    windows_exporter_metrics.txt
    node_exporter_metrics.txt
  data/
    .gitkeep
  go.mod
  go.sum
  README.md
```

## 4. Giai thich tung tang

### 4.1. `cmd/agent`

Day la entrypoint cua binary.

Trach nhiem:

- nap app
- goi bootstrap
- chay runtime

Khong nen chua business logic.

### 4.2. `configs/`

Noi dat file config local cho dev va MVP:

- `agent.yaml`
- `assets.yaml`
- `metrics.windows.yaml`
- `metrics.linux.yaml`

Sau nay co the co them `example` hoac `dev/prod`.

### 4.3. `internal/app`

Tang wire-up tong:

- ket noi config
- tao dependencies
- khoi dong loops

Day la noi phoi hop, khong phai noi chua thuat toan mapping chi tiet.

### 4.4. `internal/config`

Trach nhiem:

- load YAML
- parse thanh struct
- validate
- apply env override neu co

### 4.5. `internal/domain`

Noi dat cac model cot loi:

- raw metric
- normalized metric
- batch
- enum source type

Package nay rat quan trong vi giup tat ca cac lop noi chuyen chung mot ngon ngu du lieu.

### 4.6. `internal/source`

Noi dat source adapter abstraction.

Vi du:

- interface `Source`
- adapter `windows`
- adapter `linux`

Y tuong:

- adapter khac nhau
- output raw model giong nhau

### 4.7. `internal/parser`

Trach nhiem:

- parse Prometheus text exposition

Tach rieng de:

- test parser doc lap
- tranh source adapter lam qua nhieu viec

### 4.8. `internal/mapping`

Trach nhiem:

- doc rule mapping
- map raw metric sang domain metric

Day la trai tim cua config-driven approach.

### 4.9. `internal/aggregate`

Trach nhiem:

- tong hop CPU, NIC, disk
- tinh uptime
- chon primary NIC

Package nay nen giu nhung logic derived nhe ma agent can lam truoc khi gui.

### 4.10. `internal/enrich`

Trach nhiem:

- them `nodeId`, `rackId`, `site`, `environment`, `sourceMetric`

### 4.11. `internal/queue`

Trach nhiem:

- giu records tam thoi trong RAM
- cap API de scrape loop push va send loop pop

### 4.12. `internal/sender`

Trach nhiem:

- build payload
- gui HTTP
- xu ly response

### 4.13. `internal/state`

Trach nhiem:

- luu counter state
- boot state
- NIC state

No khac voi `buffer`:

- `state` la state nhe de tinh toan
- `buffer` la de giu batch chua gui duoc

### 4.14. `internal/buffer`

Trach nhiem:

- persist payload/batch khi send fail
- replay lai sau

### 4.15. `internal/retry`

Trach nhiem:

- backoff policy
- retry decision

### 4.16. `internal/observability`

Trach nhiem:

- logger
- internal counters
- health/debug hooks neu can

### 4.17. `internal/shutdown`

Trach nhiem:

- bat signal OS
- trigger graceful shutdown

### 4.18. `testdata/`

Rat nen co tu dau.

Noi dat:

- sample metrics text
- fixtures cho parser va mapping test

## 5. Tai sao dung `internal/`

Dung `internal/` la hop ly vi:

- day la ung dung agent, khong phai SDK public
- tranh expose package ben trong qua som
- giu ranh gioi code noi bo ro rang

## 6. Cau truc package toi thieu cho MVP

Neu muon di nhanh, MVP co the bat dau voi tap nho hon:

```text
internal/
  app/
  config/
  domain/
  source/
  parser/
  mapping/
  enrich/
  queue/
  sender/
  state/
```

Sau do moi tach them:

- `aggregate`
- `buffer`
- `retry`
- `observability`
- `shutdown`

## 7. File nao se code truoc

Neu scaffold agent ngay sau docs nay, thu tu hop ly la:

1. `cmd/agent/main.go`
2. `internal/config/*`
3. `internal/domain/*`
4. `internal/source/source.go`
5. `internal/source/windows/adapter.go`
6. `internal/parser/prometheus_text.go`
7. `internal/mapping/engine.go`
8. `internal/sender/http.go`
9. `internal/app/bootstrap.go`

## 8. Quy tac import va dependency

Nen giu dependency mot chieu:

- `cmd` -> `app`
- `app` -> `config`, `source`, `mapping`, `sender`, `state`
- `mapping`, `aggregate`, `enrich` -> `domain`
- `source` -> `parser`, `domain`
- `sender` -> `domain`

Khong nen de:

- `domain` import nguoc lai package runtime
- `mapping` import thang `sender`

## 9. NIC trong package structure se nam o dau

Vi `NIC` lien quan toi logic chon adapter mang chinh, no nen nam o:

- `internal/aggregate/nic_selector.go`
hoac
- `internal/state/nic.go`

Y nghia:

- `aggregate/nic_selector.go` chon NIC nao la primary trong mot cycle
- `state/nic.go` giu cache de tranh primary NIC bi nhay lien tuc

## 10. Ket luan

Folder structure tren giup minh co mot Go agent:

- de scaffold
- de test
- de mo rong
- khong bi tron logic source, mapping, state va transport

Sau file nay, minh co the di tiep rat tu nhien sang:

- `04_metric_mapping_spec.md`
- hoac scaffold code MVP thang tu package structure nay
