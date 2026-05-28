# Go Agent Collector Runtime Flow

## 1. Muc tieu

Tai lieu nay mo ta `runtime flow` cua `go-agent-collector`, tuc la nhung gi agent thuc su lam khi chay nhu mot local service.

Muc tieu cua runtime flow:

- chot vong doi cua agent tu luc boot den luc shutdown
- tach ro cac loop va cac stage xu ly
- chot nhung state toi thieu agent can giu
- lam nen cho implementation Go sau nay

Tai lieu nay uu tien `Windows + windows_exporter` truoc, nhung giu flow du tong quat de sau nay them `Linux + node_exporter`.

## 2. Nguyen tac runtime

Runtime flow nen giu 4 nguyen tac:

- don gian de debug
- khong crash chi vi mot lan scrape hoac send loi
- cho phep batch va retry
- giu output contract on dinh cho backend

Agent nen duoc xem la:

- `source-aware`
- `config-driven`
- `state-light`
- `network-resilient`

## 3. Vong doi tong quan

Khi agent chay, vong doi o muc cao nen la:

1. Start process
2. Load config
3. Init logger va internal runtime state
4. Init source adapter
5. Init mapper, enricher, sender, buffer
6. Start scrape loop
7. Start send loop
8. Handle retry/backoff neu backend loi
9. Flush state va shutdown gracefully

## 4. Runtime components

Runtime flow nay nen co nhung thanh phan sau:

- `Config Loader`
- `Source Adapter`
- `Prometheus Parser`
- `Metric Filter`
- `Mapping Engine`
- `Aggregation Engine`
- `Metadata Enricher`
- `In-memory Queue`
- `Batch Sender`
- `Retry / Buffer Store`
- `Agent Internal Metrics`

Moi thanh phan nen co ranh gioi ro de sau nay code package Go khong bi tron trach nhiem.

## 5. Hai loop chinh

Runtime nen xoay quanh 2 loop chinh.

### 5.1. Scrape loop

`Scrape loop` chay theo `scrapeInterval`.

Trach nhiem:

- goi local exporter endpoint
- parse Prometheus exposition format
- loc nhung raw metrics can dung
- tinh mot so counter delta can state nhe
- dua normalized records tam thoi vao queue trong memory

Goi y mac dinh cho PoC:

- `scrapeInterval = 5s`

### 5.2. Send loop

`Send loop` chay theo `sendInterval`.

Trach nhiem:

- lay du lieu tu queue
- group theo batch
- build payload
- POST len backend
- neu fail thi dua vao local buffer va retry

Goi y mac dinh cho PoC:

- `sendInterval = 5s`

## 6. Flow chi tiet cua scrape loop

Trong moi chu ky scrape, agent nen lam theo thu tu sau:

### 6.1. Step 1: Read config snapshot

Lay config dang active de biet:

- source endpoint
- metric allowlist
- aggregation rule
- metadata asset

PoC co the load mot lan luc boot.
Sau nay neu can co the them config reload.

### 6.2. Step 2: Scrape local exporter

Vi du:

- Windows: `http://localhost:9182/metrics`
- Linux sau nay: `http://localhost:9100/metrics`

Neu scrape that bai:

- ghi log
- tang internal error counter
- bo qua cycle hien tai
- khong crash process

### 6.3. Step 3: Parse raw metric families

Agent can parse Prometheus text exposition thanh cau truc raw thong nhat trong code, vi du:

- metric name
- labels
- value
- type
- timestamp neu co

Muc tieu la source adapter tra ve mot raw model de mapping layer xu ly chung.

### 6.4. Step 4: Filter allowlist

Khong nen nuot tat ca raw metrics tu exporter.
Can co allowlist de:

- giam noise
- giam RAM
- giam payload
- de mapping ro rang hon

Vi du:

- `windows_cpu_*`
- `windows_memory_*`
- `windows_net_*`
- `windows_system_*`
- `windows_tcp_*`

### 6.5. Step 5: Normalize raw shape

Sau khi parse, agent nen dua metric ve raw shape nhat quan:

- `sourceMetric`
- `labels`
- `value`
- `collectedAt`

Day la lop trung gian truoc khi map sang `domain metrics`.

### 6.6. Step 6: Compute lightweight deltas

Nhung counter metric can state nhe de tinh:

- `bytes/sec`
- `packets/sec`
- `retransmit/sec`
- `error/sec`

Agent can luu:

- last raw value
- last timestamp

Neu khong co mau truoc do:

- bo qua delta cho cycle dau
- chi luu state

### 6.7. Step 7: Map raw metrics sang domain metrics

Vi du:

- Windows `windows_system_boot_time_timestamp`
- map thanh `node.uptime_seconds`

- Windows `windows_net_bytes_received_total`
- map thanh `node.network_rx_bytes_sec`

Stage nay nen:

- doc rule tu YAML
- khong hardcode nhieu trong code

### 6.8. Step 8: Aggregate theo host view

Nhieu raw metrics la theo `core`, `nic`, `drive`, hoac `state`.
Agent can tong hop lai de ra `node-level metrics`.

Vi du:

- tong hop CPU theo cac core
- chon `primary NIC`
- tong hop network tren NIC active
- chon drive system hoac aggregate storage

### 6.9. Step 9: Enrich metadata

Them context:

- `nodeId`
- `rackId`
- `switchId`
- `site`
- `environment`
- `source = windows_exporter`
- `sourceMetric`

### 6.10. Step 10: Push vao in-memory queue

Sau khi co domain records, dua vao queue trong memory de send loop xu ly.

Queue nay chi nen la queue tam thoi, khong phai noi luu tru ben vung.

## 7. Flow chi tiet cua send loop

Trong moi chu ky send, agent nen lam theo thu tu sau:

### 7.1. Step 1: Read pending records

Lay records moi tu in-memory queue.
Neu local buffer dang co du lieu cu chua gui duoc, uu tien xu ly buffer truoc hoac merge theo chinh sach da chot.

### 7.2. Step 2: Build batches

Group records thanh batch dua tren:

- batch size toi da
- payload bytes toi da
- age cua record

Mac dinh PoC co the bat dau don gian:

- `maxBatchItems = 200`

### 7.3. Step 3: Build transport payload

Moi record gui di nen co:

- metric key
- scope info
- value
- unit
- timestamp
- source
- source metric
- tags/context

### 7.4. Step 4: Send len backend

Send qua HTTP POST.
Neu backend tra thanh cong:

- danh dau batch da xong
- tang internal success counter

Neu that bai:

- ghi log
- tang error counter
- dua batch vao buffer ben vung neu can

### 7.5. Step 5: Retry voi backoff

Backoff goi y:

- bat dau `1s`
- tang dan
- max `30s`

Retry nen ap dung cho network/server error, nhung khong nen lam agent bi block vo han cho mot batch.

## 8. Local state can giu

Agent khong nen state-heavy, nhung van can giu mot so state toi thieu.

### 8.1. Counter state

Can cho:

- rate calculations
- ratio calculations
- delta counters

Vi du:

- last bytes received
- last bytes sent
- last tcp retransmits
- last packet errors

### 8.2. Boot state

Can cho:

- detect reboot
- tinh `reboot_count_24h`
- tranh nham lan khi uptime reset

### 8.3. NIC selection state

Can cho:

- giu `primary NIC` on dinh
- tranh flip qua lai giua nhieu NIC trong tung scrape

### 8.4. Buffered batches

Can cho:

- disconnected mode
- retry sau khi backend hoi phuc

PoC co the luu local duoi dang:

- JSON queue
- hoac SQLite nhe

## 9. Chon primary NIC

Vi Windows host co nhieu NIC, agent can co quy tac chon `primary NIC`.

Goi y thu tu:

1. NIC duoc khai bao trong `assets/config`
2. Neu khong co, chon NIC `up` co traffic lon nhat
3. Loai tru loopback va virtual adapter neu can

Can them co che cache ngan han de tranh primary NIC nhay lien tuc.

## 10. Error handling

Runtime flow can chi ro cach xu ly loi.

### 10.1. Scrape errors

Neu khong scrape duoc exporter:

- ghi log warn/error
- tang `scrape_fail_count`
- bo qua cycle hien tai
- tiep tuc cycle sau

### 10.2. Parse errors

Neu mot metric parse loi:

- bo metric do
- ghi log co context
- khong crash agent

### 10.3. Mapping errors

Neu rule mapping bi thieu hoac sai:

- bo qua metric do
- ghi log `mapping_miss` hoac `mapping_error`
- tiep tuc voi metrics khac

### 10.4. Send errors

Neu send that bai:

- dua batch vao retry flow
- su dung backoff
- dung local buffer neu can

## 11. Backpressure va buffering

Agent can xu ly duoc truong hop:

- backend down
- mang cham
- queue tang nhanh

Nen co:

- gioi han queue trong memory
- gioi han buffer disk
- chinh sach khi buffer day

Goi y cho PoC:

- queue memory toi da theo so records
- buffer disk toi da theo MB
- khi qua nguong, uu tien drop oldest batch va ghi log ro rang

## 12. Internal observability cua agent

Agent cung nen co telemetry rieng, it nhat o muc log va counters noi bo.

Nen co:

- `scrape_success_count`
- `scrape_fail_count`
- `send_success_count`
- `send_fail_count`
- `queue_length`
- `buffered_batch_count`
- `last_successful_send_at`

Neu muon dep hon ve sau, co the expose:

- local health endpoint
- local debug endpoint

## 13. Shutdown flow

Khi nhan signal shutdown, agent nen:

1. stop nhan cycle moi
2. cho scrape loop ket thuc
3. flush queue dang co neu trong timeout
4. persist state can thiet
5. shutdown gon

Khong nen:

- kill dot ngot khi van dang giu batch quan trong neu co the tranh

## 14. Runtime defaults de xuat cho PoC

Gia tri mac dinh hop ly:

- `scrapeInterval = 5s`
- `sendInterval = 5s`
- `httpTimeout = 3s`
- `maxBatchItems = 200`
- `retryBackoffMin = 1s`
- `retryBackoffMax = 30s`
- `bufferMaxSizeMb = 50`

Day la baseline tot de chay local agent tren laptop Windows truoc.

## 15. Flow tom tat

Flow cuoi cung co the nhin gon nhu sau:

1. Agent boot va load config
2. Scrape exporter moi 5 giay
3. Parse, filter, map, aggregate, enrich
4. Dua metrics vao queue memory
5. Batch va send moi 5 giay
6. Retry va buffer neu backend loi
7. Flush va shutdown gon khi process dung

## 16. Ket luan

Runtime flow nay giu agent o muc:

- de hieu
- de code bang Go
- du on dinh cho PoC
- de mo rong sang Linux sau nay

Tai lieu nay la nen de viet tiep:

- `03_config_design.md`
- `04_metric_mapping_spec.md`
- `05_payload_schema.md`
- `06_state_and_buffering.md`
