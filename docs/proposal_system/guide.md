# Proposal System Guide

## 1. Muc dich

Tai lieu nay huong dan nhom trinh bay he thong o muc kien truc cho de tai AR-assisted infrastructure monitoring and maintenance.

Muc tieu cua bo tai lieu de xuat la:

- mo ta ro he thong o cap do tong quan, khong di vao implementation level
- giu dong nhat voi cac source-of-truth docs trong `docs/*`
- xac dinh dung ranh gioi `control plane`, `data plane`, `AI`, `storage`, `AR`
- lam co so de viet cac phan thuyet minh cho do an, bao cao, hoac proposal

## 2. Source of Truth Can Basing

Khi viet cac file trong `proposal_system`, uu tien tham khao:

- `docs/overview_architecture.md`
- `docs/service_decomposition.md`
- `docs/service_interaction_matrix.md`
- `docs/data_pipeline_architecture.md`
- `docs/data_architecture.md`
- `docs/system_requirements_v1_vn.md`
- `docs/topic_proposal_vn.md`
- `docs/topic_proposal.md`

Quy tac can giu:

- `docs/*` la source of truth cho architecture va product intent
- khong them gia dinh moi neu khong co trong tai lieu chinh
- neu co thay doi ve bounded context, data ownership, hoac luong xu ly thi phai cap nhat dong bo voi docs lien quan

## 3. Dinh Huong Noi Dung

Bo tai lieu de xuat nen tra loi duoc 5 cau hoi chinh:

1. He thong phuc vu ai?
2. He thong lam gi?
3. Du lieu vao tu dau va ra o dau?
4. AI dong vai tro gi trong he thong?
5. Frontend, backend, database va data pipeline ket noi voi nhau nhu the nao?

## 4. Pham Vi Kien Truc

He thong can duoc mo ta o muc architecture-first, bao gom:

- nguoi dung chinh
- chuc nang chinh
- du lieu dau vao va dau ra
- AI model va vai tro AI trong pipeline
- luong xu ly du lieu
- kien truc frontend/backend/database/AI service
- cach tich hop model AI

Khong nen dua vao:

- code-level implementation
- chi tiet class/module
- chi tiet deployment manifest
- chi tiet schema tung bang/collection neu chua co trong docs chinh

## 5. Thiet Ke Cac File Dau Ra

Tai lieu nay yeu cau tao 4 file trong thu muc `proposed_system/`:

- `proposed_system/system_overview.md`
- `proposed_system/system_architecture.md`
- `proposed_system/ai_model_integration.md`
- `proposed_system/data_flow.md`

Neu thu muc chua ton tai, can tao moi truoc khi viet noi dung.

## 6. Noi Dung De Xuat Cho Tung File

### 6.1 `system_overview.md`

File nay nen tra loi:

- boi canh van de
- doi tuong su dung chinh
- muc tieu cua he thong
- cac capability chinh
- pham vi ho tro cua Web Dashboard va WebAR Client
- gia tri nghiep vu ma he thong mang lai

De xuat co cau:

1. Introduction
2. Target Users
3. Main Goals
4. Core Features
5. Scope and Boundaries
6. Expected Outcomes

### 6.2 `system_architecture.md`

File nay nen mo ta:

- Web Dashboard va WebAR Client
- Control Plane API and BFF
- cac service trong control plane
- data plane services
- database-per-service principle
- Kafka, TimescaleDB, MongoDB, Redis, Vertex AI, Object Storage
- ranh gioi logical architecture va runtime architecture

De xuat co cau:

1. Architecture Overview
2. Client Layer
3. Control Plane
4. Data Plane
5. Storage and Event Backbone
6. Service Boundaries
7. Architecture Constraints

### 6.3 `ai_model_integration.md`

File nay nen mo ta:

- AI model dung cho anomaly detection, risk scoring, hoac predictive hint generation
- AI la enrichment capability, khong phai owner cua alert lifecycle
- du lieu dau vao cho AI
- output cua AI model
- cach model duoc train, luu, va cap nhat
- vi tri cua Vertex AI trong lifecycle
- cach platform consume inference result

De xuat co cau:

1. AI Role in the System
2. Input Data for AI
3. Model Lifecycle
4. Online and Batch Usage
5. Integration with Platform Services
6. Limitations and Constraints

### 6.4 `data_flow.md`

File nay nen mo ta cac luong du lieu chinh:

- telemetry ingest
- stream processing
- alert generation
- incident/workflow flow
- AR diagnostics flow
- AI enrichment flow

De xuat co cau:

1. End-to-End Data Flow
2. Telemetry Collection to Ingestion
3. Ingestion to Kafka
4. Stream Processing and Derived State
5. Monitoring and Alert Lifecycle
6. AR Diagnostics Composition
7. AI Enrichment Flow

## 7. Nguoi Dung Chinh

Khi mo ta user, nen nhom theo nghiep vu:

- system operator
- maintenance engineer
- admin or supervisor
- simulation user
- analyst hoac monitoring user

Voi moi nhom, can neu ro:

- muc dich su dung
- cac chuc nang ho tro
- output ma ho nhan duoc tu he thong

## 8. Chuc Nang Chinh

He thong nen duoc trinh bay voi cac nhom chuc nang sau:

- centralized infrastructure monitoring
- alert management
- incident and maintenance workflow
- AR-guided inspection support
- telemetry ingestion and stream processing
- AI-assisted anomaly and risk enrichment
- simulation-based scenario injection

## 9. Du Lieu Dau Vao

Tai lieu can mo ta cac loai input chinh:

- telemetry tu collectors
- simulation events tu simulation producers
- operator inputs tu dashboard
- QR marker scans tu WebAR Client
- workflow commands nhu acknowledge, assign, inspect, close

Neu can, co the tach input theo:

- realtime telemetry
- operational commands
- metadata va context
- AI-related feature windows

## 10. AI Model Su Dung

Khong nen ghi chung chung "AI model" ma phai mo ta theo vai tro:

- anomaly detection
- risk scoring
- predictive hints
- contextual enrichment

Neu chua co model cu the trong docs, hay mo ta theo muc do capability thay vi gan ten model cu the. Tru khi co tai lieu moi xac dinh ten model, khong nen tu gan mot model provider khac vao he thong.

## 11. Luong Xu Ly

Mot luong mo ta tot nen di theo thu tu:

1. du lieu vao he thong
2. validate va persist
3. publish event
4. stream processing va enrichment
5. sinh alert candidate hoac inference
6. compose read model
7. tra ket qua cho dashboard hoac WebAR

Can nhan manh:

- WebAR Client khong doc raw telemetry truc tiep
- Control Plane API and BFF dong vai tro compose data
- AI chi enrich, khong so huu business workflow truth

## 12. Kien Truc Frontend / Backend / Database / AI Service

Khi trinh bay architecture, nen chia theo lop:

- Frontend: Web Dashboard, WebAR Client
- Backend control plane: NestJS API and BFF, Identity, Asset Context, Monitoring, Incident Workflow, Simulation, Notification, Audit
- Data plane: Telemetry Ingestion, Stream Processing, AI Analytics
- Storage: MongoDB, TimescaleDB, Redis, Kafka, Object Storage
- AI platform: Vertex AI

De tranh lech kien truc:

- khong coi BFF la noi so huu business truth
- khong coi Kafka la source of truth
- khong dua Vertex AI vao hot path runtime neu khong co tai lieu moi quy dinh

## 13. Cach Tich Hop AI Model

Tai lieu tich hop AI nen mo ta ro:

- input feature lay tu dau
- ai service consume du lieu nao
- inference result duoc luu va consume ra sao
- model lifecycle duoc quan ly nhu the nao
- khi nao dung online inference, khi nao dung batch

Nen ghi ro rang:

- inference record la du lieu phuc vu platform
- model registry va training lifecycle nam trong Vertex AI
- output AI phai duoc bring back vao flow nghiep vu qua service boundary, khong bo qua control plane

## 14. Output Cua He Thong

Output nen duoc mo ta theo nhom:

- dashboard state
- AR diagnostics bundle
- alert va incident status
- notification outbound
- AI enrichment result
- audit trail
- historical telemetry views

## 15. Cach Viet De Nhat Quan

Khi soan noi dung, su dung dong nhat cac thuat ngu sau:

- `WebAR Client`
- `Control Plane API and BFF`
- `data plane`
- `control plane`
- `database-per-service`
- `marker resolution through control plane`
- `QR marker-based spatial anchoring`
- `AI enrichment`
- `derived serving state`

Neu mot thuat ngu xuat hien trong nhieu file, hay dung cung mot cach goi va cung mot pham vi y nghia.

## 16. Checklist Khi Hoan Thanh

Truoc khi ket thuc, kiem tra:

- moi file deu khop voi source-of-truth docs
- khong co microservice nao bi mo ta sai bounded context
- AI khong bi mo ta nhu owner cua alert lifecycle
- AR khong bi mo ta nhu client doc raw telemetry
- data ownership khop voi `database-per-service`
- output files dung ten va dung thu tu logic

## 17. Ket Luan

Neu muon lam dung dinh huong cua du an nay, hay xem bo tai lieu de xuat la mot lop mo ta kien truc cap cao, dung de truyen dat y tuong he thong va lam co so cho cac phan thiet ke chi tiet o buoc sau.
