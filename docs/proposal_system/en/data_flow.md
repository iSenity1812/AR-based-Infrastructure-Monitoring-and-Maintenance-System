# Data Flow

## 1. End-to-End Data Flow

Luong du lieu chinh trong he thong di theo huong:

Telemetry Collectors / Simulation Producers -> Telemetry Ingestion Service -> Kafka / TimescaleDB -> Stream Processing Service -> Monitoring Service / AI Analytics Service -> Control Plane API and BFF -> Web Dashboard / WebAR Client

## 2. Telemetry Collection

Collectors va simulation producers gui batch telemetry voi metadata.

Dau vao co the gom:

- metric samples
- asset identifiers
- timestamp
- simulation tags
- producer metadata

## 3. Ingestion Flow

Telemetry Ingestion Service thuc hien:

1. authenticate producer
2. validate schema
3. enforce idempotency
4. persist raw telemetry
5. publish canonical event

Neu payload khong hop le:

- luu archive neu can
- ghi nhan invalid metadata
- khong dua vao stream processing nhu du lieu hop le

## 4. Kafka Backbone Flow

Kafka dung de:

- phan tan telemetry events
- fan-out cho stream processing
- truyen snapshot updates
- truyen AI enrichment outputs
- truyen simulation events

Kafka la event backbone, khong phai noi luu business truth.

## 5. Stream Processing Flow

Stream Processing Service nhan event de:

- enrich topology
- tao latest snapshot
- tinh aggregate window
- evaluate rule
- tao alert candidate
- chuan bi feature cho AI

Derived outputs co the di vao:

- Redis
- TimescaleDB
- Kafka

## 6. Monitoring and Alert Flow

Monitoring Service nhan output derived de:

- tao va cap nhat alert
- quan ly alert rules
- phuc vu read models cho dashboard

Neu alert can xu ly nghiep vu tiep:

- Incident Workflow Service tao hoac cap nhat incident va ticket
- Notification Service gui thong bao
- Audit Service ghi audit trail

## 7. AR Diagnostics Flow

Khi WebAR Client quet QR marker:

1. client gui request den Control Plane API and BFF
2. BFF resolve marker qua Asset Context Service
3. BFF lay latest snapshot tu derived state
4. BFF lay alert context tu Monitoring Service
5. BFF lay workflow context tu Incident Workflow Service
6. BFF co the lay historical snippet tu TimescaleDB neu can
7. BFF compose diagnostics bundle va tra ve client

Quan trong:

- WebAR Client khong query raw telemetry truc tiep
- marker resolution phai di qua control plane

## 8. AI Enrichment Flow

AI enrichment di theo cac buoc:

1. stream processing tao feature window
2. AI Analytics Service nhan input
3. model thuc hien anomaly / risk scoring
4. inference record duoc luu
5. ket qua duoc publish hoac consume boi Monitoring Service va BFF

AI output co the duoc dung de:

- bo sung alert context
- hien thi risk level
- ho tro triage va inspection

## 9. Alert to Incident Flow

Sau khi alert duoc triage:

1. Monitoring Service giu lifecycle alert
2. Incident Workflow Service tao incident hoac ticket
3. Notification Service gui thong bao
4. Audit Service ghi lai hanh dong
5. Control Plane API and BFF cung cap tinh trang moi nhat cho UI

## 10. Feedback Loop

Du lieu tu workflow va inspection co the quay lai:

- cap nhat asset context
- lam enrich alert context
- huan luyen AI batch
- dieu chinh rule monitoring

Day la vong lap cai tien, nhung van phai giu ro ownership cua tung service.

## 11. Data Flow Constraints

- khong co direct raw telemetry access tu WebAR Client
- khong de BFF tro thanh source of truth
- khong dung Kafka de thay cho DB nghiep vu
- khong de AI ngan mot minh quan ly workflow
- khong query cross-service database truc tiep

