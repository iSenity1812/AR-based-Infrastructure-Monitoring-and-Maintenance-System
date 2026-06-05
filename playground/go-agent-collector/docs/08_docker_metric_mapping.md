# Docker Metric Mapping for `go-agent-collector`

## 1. Muc tieu

Tai lieu nay chot baseline metric mapping cho `Docker adapter` trong `go-agent-collector`.

Muc tieu:

- collect workload context song song voi `windows_exporter`
- dua container inventory va one-shot stats ve cung batch pipeline
- giu ro ranh gioi giua `node metrics` va `container/service metrics`

## 2. Phase 1 scope

Docker adapter phase 1 chi gom:

- container inventory
- runtime state
- labels, ports, networks, mounts, restart policy, health status
- one-shot stats cho CPU, memory, network I/O, block I/O, PIDs
- optional service rollups trong cung scrape cycle

Khong gom:

- `docker logs`
- event streaming dai han
- cross-source scoring giua node va container

## 3. Coexistence voi node metrics

Agent se chay `multi-source`:

- `windows_exporter` -> `node.*`
- `docker` -> `container.*`, `service.*`

Hai nhom metric:

- di chung queue
- di chung sender
- di chung batch payload

Nhung van giu:

- `node` la source of truth cho host health
- `container/service` la workload context va workload runtime signals

## 4. Service derivation

`container.service_name` duoc suy ra theo thu tu:

1. `com.docker.compose.service`
2. nhan `service`
3. nhan `app`
4. nhan `app.kubernetes.io/name`
5. normalized container name
6. image repository name

Muc tieu la uu tien metadata co y nghia nghiep vu truoc, roi moi fallback theo runtime naming.

## 5. Normalized metrics

Inventory:

- `container.name`
- `container.image`
- `container.image_tag`
- `container.runtime_id`
- `container.status`
- `container.state`
- `container.health_status`
- `container.restart_count`
- `container.service_name`
- `container.node_id`

Runtime:

- `container.cpu_usage_pct`
- `container.memory_used_bytes`
- `container.memory_used_pct`
- `container.memory_limit_bytes`
- `container.network_rx_bytes_sec`
- `container.network_tx_bytes_sec`
- `container.block_read_bytes_sec`
- `container.block_write_bytes_sec`
- `container.pid_count`

Optional inventory counts:

- `container.port_binding_count`
- `container.mount_count`
- `container.network_count`

Service rollups:

- `service.container_count`
- `service.running_container_count`
- `service.cpu_usage_pct_sum`
- `service.memory_used_bytes_sum`

## 6. Scope va payload rules

Rule scope:

- `container.*` -> `scopeType=container`, `scopeId=container_id`
- `service.*` -> `scopeType=service`, `scopeId=service_name`
- `node.*` -> `scopeType=node`, `scopeId=node_id`

Rule source:

- node metric records -> `source=windows_exporter`
- docker metric records -> `source=docker`

Payload phase 1 cho phep mot batch co mixed scopes:

- `node`
- `container`
- `service`

## 7. Notes implementation

Docker adapter phase 1 khong dung shell `docker ...`.
No dung Docker Go SDK va phai:

- list containers
- inspect tung container
- lay one-shot stats cho container dang running
- skip container loi ma khong fail ca scrape cycle

Network va block I/O throughput duoc tinh bang delta giua cac scrape trong agent memory.
