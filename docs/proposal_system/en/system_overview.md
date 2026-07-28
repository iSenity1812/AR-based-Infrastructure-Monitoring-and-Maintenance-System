# System Overview

## 1. Introduction

He thong de xuat la mot nen tang AR-assisted infrastructure monitoring and maintenance cho moi truong simulated data center.

Muc tieu chinh cua he thong:

- tap trung giam sat ha tang theo thoi gian gan real-time
- ho tro canh bao va xu ly su co
- cung cap AR-guided inspection cho ky su bao tri
- bo sung anomaly detection va risk scoring bang AI
- giu ro ranh gioi giua control plane va data plane

He thong duoc mo ta theo architecture-first, co cac thanh phan chinh:

- Web Dashboard
- WebAR Client
- Control Plane API and BFF
- cac microservice control plane
- cac service data plane
- Redpanda, ClickHouse, MongoDB, Redis, Object Storage
- Vertex AI cho training va model lifecycle

## 2. Main Users

### 2.1 System Operator

Nguoi van hanh he thong su dung dashboard de:

- xem tinh trang ha tang tong quan
- theo doi alert va incident
- kiem tra log, audit, va notification status

### 2.2 Maintenance Engineer

Ky su bao tri su dung WebAR Client de:

- quet QR marker trong khu vuc can thao tac
- xem diagnostics bundle theo asset context
- nhan huong dan kiem tra va xu ly su co
- cap nhat inspection hoac maintenance status

### 2.3 Admin / Supervisor

Nguoi quan tri su dung dashboard de:

- quan ly user, role, access policy
- quan ly asset context va marker mapping
- theo doi hieu qua van hanh va xu ly su co

### 2.4 Simulation User

Nguoi test hoac demo su dung simulation flow de:

- tao scenario
- inject fault
- quan sat telemetry va alert response

### 2.5 Analyst / Monitoring User

Nguoi phan tich su dung he thong de:

- xem history telemetry
- xem trends, aggregates, va anomaly signals
- phuc vu root-cause analysis va bao cao

## 3. Core Functions

He thong ho tro cac nhom chuc nang chinh sau:

- centralized infrastructure monitoring
- telemetry ingestion va stream processing
- alert lifecycle management
- incident and maintenance workflow
- AR-guided diagnostics va inspection
- AI-assisted anomaly and risk enrichment
- simulation-based data generation
- audit va notification

## 4. Key Inputs

Du lieu dau vao chinh bao gom:

- telemetry batches tu collectors
- simulation events tu simulation producers
- operator commands tu dashboard
- QR marker scans tu WebAR Client
- workflow updates nhu acknowledge, assign, inspect, close
- metadata ve asset, topology, va maintenance context

## 5. Key Outputs

Ket qua dau ra cua he thong bao gom:

- dashboard views
- AR diagnostics bundle
- alert status va incident status
- notification delivery events
- audit trail
- historical telemetry views
- AI enrichment results

## 6. Scope and Boundaries

He thong tap trung vao:

- control plane cho nghiep vu van hanh
- data plane cho ingest va processing
- AR diagnostics qua control plane
- AI la lop enrich, khong phai owner cua workflow truth

He thong khong tap trung vao:

- native mobile AR app
- direct raw telemetry access tu WebAR Client
- mo hinh AI thay the hoan toan quy trinh van hanh
- query-only microservice chi de tong hop du lieu

## 7. Expected Value

Gia tri mong doi:

- phat hien bat thuong som hon
- rut ngan thoi gian chan doan su co
- giam sai sot khi kiem tra tai hien truong
- tang kha nang traceability va auditability
- gop phan thanh mot mo hinh van hanh co AI support nhung van giu source of truth ro rang


