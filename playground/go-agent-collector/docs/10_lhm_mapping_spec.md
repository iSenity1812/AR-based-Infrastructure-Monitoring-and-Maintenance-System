# LibreHardwareMonitor Mapping Spec

## 1. Muc tieu

Tai lieu nay dinh nghia cach dung `LibreHardwareMonitor` qua `http://localhost:8085/data.json` nhu mot `secondary source` cho `go-agent-collector`.

Muc tieu:

- tach ro field nao nen dua vao `hardware fingerprint`
- tach ro field nao nen map thanh `metrics`
- giu mot schema nhat quan voi `metrics.windows.yaml`
- tranh nhai lai raw sensor tree vao payload bat buoc

## 2. Vai tro cua LHM trong he thong

`windows_exporter` van la nguon chinh cho runtime telemetry:

- CPU
- memory
- network
- process
- disk queue

`LHM` la nguon phu de enrich:

- GPU
- SSD / NVMe health
- temperature
- battery
- hardware model / ownership context

Nguyen tac:

- khong gui 2 batch rieng le cho 2 source
- `LHM` va `windows_exporter` cung gom ve 1 batch payload
- `LHM` chi bo sung data cho node context va mot so health metric

## 3. Cach doc data.json

Endpoint `data.json` tra ve mot cay sensor.

Moi node thuong co:

- `HardwareId`
- `SensorId`
- `Text`
- `Type`
- `Min`
- `Value`
- `Max`
- `Children`

Trong do:

- `HardwareId` thuong dai dien cho thiet bi/cum thiet bi
- `SensorId` thuong dai dien cho 1 sensor time-series
- `Text` la ten hien thi de render/debug

## 4. Quy tac phan loai

### 4.1. Dua vao `hardwareFingerprint` neu:

- field on dinh hoac chi doi cham
- field giup discovery/register/classify asset
- field co gia tri metadata hon la time-series

Vi du:

- board model
- cpu model
- gpu model
- nvme model
- battery model
- tong memory / slot inventory

### 4.2. Dua vao `metrics` neu:

- field co y nghia van hanh theo thoi gian
- field co the canh bao / predictive maintenance
- field co the so sanh giua cac lan scrape

Vi du:

- temperature
- load
- power
- clock
- life / wear
- capacity usage
- throughput
- charge level

### 4.3. Khong nen dua vao payload noi bo

- tat ca per-core VID neu khong can
- tat ca DIMM timing chi tiet neu chi phuc vu debug
- tat ca sub-load GPU neu MVP khong can
- raw tree full text neu khong can inspect

## 5. De xuat fingerprint block

`context.hardwareFingerprint` nen giu cac field on dinh sau:

| Field              | Nguon goi y                        | Ly do                  |
| ------------------ | ---------------------------------- | ---------------------- |
| `primaryIpv4`      | NIC phu hop nhat                   | identity networking    |
| `macAddress`       | NIC phu hop nhat                   | network fingerprint    |
| `hardwareSerial`   | Neu LHM hoac source khac co serial | unique hardware trace  |
| `osProduct`        | Windows product / build            | classifier cho backend |
| `logicalCpuCount`  | system info                        | capacity context       |
| `cpuArchitecture`  | system info                        | platform context       |
| `motherboardModel` | `/motherboard`                     | stable host identity   |
| `cpuModel`         | `/amdcpu/0`                        | stable CPU identity    |
| `gpuModelPrimary`  | `/gpu-amd/0`, `/gpu-amd/2`, ...    | GPU inventory          |
| `ssdModelPrimary`  | `/nvme/0`, `/nvme/1`, ...          | storage inventory      |
| `batteryModel`     | `/battery/...`                     | device class context   |

Ghi chu:

- neu field khong co san, co the omit
- fingerprint la best-effort, khong lam batch fail
- chi nen giu 1 so field dai dien, khong can nhan het raw model list vao context

## 6. De xuat metric block

### 6.1. CPU / thermal / power

| LHM sensor path           | Target metric key              | scopeType | unit  | valueType | aggregation | Notes                |
| ------------------------- | ------------------------------ | --------- | ----- | --------- | ----------- | -------------------- |
| `/amdcpu/0/temperature/2` | `node.cpu_temperature_c`       | node      | `C`   | gauge     | direct      | CPU thermal pressure |
| `/amdcpu/0/load/0`        | `node.cpu_total_load_pct`      | node      | `%`   | gauge     | direct      | Overall CPU load     |
| `/amdcpu/0/power/0`       | `node.cpu_package_power_w`     | node      | `W`   | gauge     | direct      | Package power        |
| `/amdcpu/0/clock/1`       | `node.cpu_core_clock_mhz`      | node      | `MHz` | gauge     | avg         | Average core clock   |
| `/amdcpu/0/clock/2`       | `node.cpu_effective_clock_mhz` | node      | `MHz` | gauge     | avg         | Effective clock      |

### 6.2. GPU

| LHM sensor path      | Target metric key           | scopeType | unit  | valueType | aggregation | Notes                                 |
| -------------------- | --------------------------- | --------- | ----- | --------- | ----------- | ------------------------------------- |
| `/gpu-amd/0/load/0`  | `node.gpu_core_load_pct`    | node      | `%`   | gauge     | direct      | GPU core utilization                  |
| `/gpu-amd/0/clock/0` | `node.gpu_core_clock_mhz`   | node      | `MHz` | gauge     | direct      | GPU core clock                        |
| `/gpu-amd/0/clock/2` | `node.gpu_memory_clock_mhz` | node      | `MHz` | gauge     | direct      | GPU memory clock                      |
| `/gpu-amd/0/load/2`  | `node.gpu_3d_load_pct`      | node      | `%`   | gauge     | direct      | Optional, useful for workload profile |

### 6.3. SSD / NVMe

| LHM sensor path         | Target metric key                        | scopeType | unit    | valueType | aggregation | Notes                   |
| ----------------------- | ---------------------------------------- | --------- | ------- | --------- | ----------- | ----------------------- |
| `/nvme/0/temperature/0` | `node.ssd_temperature_c`                 | node      | `C`     | gauge     | direct      | Current SSD temp        |
| `/nvme/0/level/20`      | `node.ssd_life_pct`                      | node      | `%`     | gauge     | direct      | Remaining drive life    |
| `/nvme/0/level/102`     | `node.ssd_percentage_used_pct`           | node      | `%`     | gauge     | direct      | Wear indicator          |
| `/nvme/0/level/100`     | `node.ssd_available_spare_pct`           | node      | `%`     | gauge     | direct      | SMART/NVMe spare        |
| `/nvme/0/level/101`     | `node.ssd_available_spare_threshold_pct` | node      | `%`     | gauge     | direct      | Threshold reference     |
| `/nvme/0/factor/24`     | `node.ssd_power_on_hours`                | node      | `hours` | gauge     | direct      | Age / usage proxy       |
| `/nvme/0/factor/23`     | `node.ssd_power_on_count`                | node      | `count` | gauge     | direct      | Power cycle count       |
| `/nvme/0/data/21`       | `node.ssd_data_read_gb`                  | node      | `GB`    | gauge     | direct      | Cumulative read volume  |
| `/nvme/0/data/22`       | `node.ssd_data_written_gb`               | node      | `GB`    | gauge     | direct      | Cumulative write volume |
| `/nvme/0/data/31`       | `node.ssd_free_space_gb`                 | node      | `GB`    | gauge     | direct      | Remaining free space    |
| `/nvme/0/data/32`       | `node.ssd_total_space_gb`                | node      | `GB`    | gauge     | direct      | Capacity                |
| `/nvme/0/throughput/54` | `node.ssd_read_rate`                     | node      | `KB/s`  | gauge     | direct      | Optional live activity  |
| `/nvme/0/throughput/55` | `node.ssd_write_rate`                    | node      | `KB/s`  | gauge     | direct      | Optional live activity  |

### 6.4. Battery

| LHM sensor path               | Target metric key                       | scopeType | unit  | valueType | aggregation | Notes                      |
| ----------------------------- | --------------------------------------- | --------- | ----- | --------- | ----------- | -------------------------- |
| `/battery/MS-158L_1/level/0`  | `node.battery_charge_pct`               | node      | `%`   | gauge     | direct      | Current charge             |
| `/battery/MS-158L_1/level/1`  | `node.battery_degradation_pct`          | node      | `%`   | gauge     | direct      | Battery wear               |
| `/battery/MS-158L_1/energy/0` | `node.battery_design_capacity_mwh`      | node      | `mWh` | gauge     | direct      | Design capacity            |
| `/battery/MS-158L_1/energy/1` | `node.battery_full_charge_capacity_mwh` | node      | `mWh` | gauge     | direct      | Effective full capacity    |
| `/battery/MS-158L_1/energy/2` | `node.battery_remaining_capacity_mwh`   | node      | `mWh` | gauge     | direct      | Current remaining capacity |

## 7. Field nen gom vao `tags`

`tags` chi nen chua field can phan biet metric series, hoac label thiet bi con:

- `gpu`
- `gpu_index`
- `drive`
- `drive_index`
- `slot`
- `sensor`
- `sensor_group`

Khong nen de trong `tags`:

- board model
- cpu model
- gpu model
- serial
- total capacity
- device class metadata da dung cho fingerprint

## 8. Gop voi `metrics.windows.yaml`

Co the de xuat mot file moi:

- `configs/metrics.lhm.yaml`

Format nen giong `metrics.windows.yaml`:

- `category`
- `key`
- `status`
- `enabled`
- `sourceMetric`
- `scopeType`
- `unit`
- `valueType`
- `aggregation`
- `keepLabels`
- `notes`

Vi du:

```yaml
metrics:
  - category: hardware_health
    key: node.ssd_life_pct
    status: draft
    enabled: true
    sourceMetric: lhm_nvme_level_20
    scopeType: node
    unit: "%"
    valueType: gauge
    aggregation: direct
    keepLabels:
      - drive
      - drive_index
    notes: Remaining SSD life from NVMe SMART data.
```

## 9. Chot quy tac MVP

Neu field:

- on dinh, classify asset, phuc vu discovery => `fingerprint`
- thay doi theo thoi gian, canh bao, predictive => `metrics`

Neu khong chac:

- uu tien fingerprint neu day la metadata cua thiet bi
- uu tien metrics neu day la pressure signal hoac wear signal

## 10. Khuyen nghi implement

Collector nen co 2 adapter:

- `windows_exporter`
- `LHM`

Va 1 lop normalize chung:

- gom fingerprint vao `context`
- gom health signal vao `metrics`
- giu 1 batch duy nhat khi send

Tai lieu nay la mo ta dau vao de sau do co the sinh ra:

- `metrics.lhm.yaml`
- mapping code cho LHM adapter
- backend compatibility cho discover/register va risk scoring
