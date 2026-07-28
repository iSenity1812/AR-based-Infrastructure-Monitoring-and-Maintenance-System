# AI Model Integration

## 1. AI Role in the System

AI duoc su dung nhu mot lop enrichment cho he thong, khong phai owner cua operational workflow.

Vai tro chinh:

- anomaly detection
- risk scoring
- predictive hint generation
- contextual enrichment cho dashboard va AR diagnostics

AI khong duoc:

- thay the alert lifecycle
- thay the incident workflow
- tro thanh source of truth cua business data

## 2. AI Inputs

Du lieu vao cho AI co the den tu:

- telemetry windows
- enriched telemetry from stream processing
- snapshot context
- asset context
- historical alert patterns
- simulation-tagged telemetry

Input nen duoc compose tu data plane va control plane boundary, khong lay truc tiep tu raw client access.

## 3. AI Output

Output cua AI model co the gom:

- anomaly score
- risk score
- predicted failure hint
- enrichment tags
- confidence metadata

Output phai duoc ghi nhan thanh inference record de platform co the trace lai.

## 4. Model Lifecycle

Lifecycle de xuat:

1. platform trich feature windows
2. feature export duoc luu ra object storage neu can
3. Vertex AI dung de train va theo doi experiment
4. model registry luu version model
5. platform sync model metadata ve AI Analytics Service
6. online scoring hoac batch scoring su dung model da duoc dang ky

## 5. Integration With Platform Services

### 5.1 With Stream Processing Service

Stream Processing Service co the:

- tao feature windows
- enrich snapshot
- phat sinh input cho AI scoring

### 5.2 With Monitoring Service

Monitoring Service co the consume AI output de:

- bo sung context cho alert
- ho tro triage
- hien thi diagnostics giau ngu canh hon

### 5.3 With Control Plane API and BFF

BFF dung AI output trong read composition:

- dashboard views
- AR diagnostics bundle
- triage context

### 5.4 With Incident Workflow Service

Incident Workflow Service co the nhan enrichment de:

- ho tro quyet dinh xu ly
- lien ket voi incident va ticket

## 6. Online and Batch Usage

### 6.1 Online

Online scoring phu hop cho:

- near real-time anomaly alerts
- risk enrichment
- quick diagnostics support

### 6.2 Batch

Batch processing phu hop cho:

- training dataset generation
- offline evaluation
- feature export
- periodic analytics

## 7. Vertex AI Usage

Vertex AI duoc dung cho:

- training jobs
- experiment tracking
- model registry
- lifecycle management

Vertex AI khong duoc dat trong hot path cua:

- telemetry ingest
- alert lifecycle
- AR diagnostics request path

## 8. Storage for AI Data

### 8.1 AI Analytics DB

AI Analytics Service luu:

- inference records
- model metadata phuc vu platform

### 8.2 Object Storage

Dung cho:

- feature exports
- model artifacts
- evidence and archives

### 8.3 Redpanda

Dung cho:

- inference completion events
- downstream enrichment propagation

## 9. Constraints

- AI khong duoc tro thanh owner cua alert creation
- AI khong duoc so huu maintenance workflow truth
- AI khong duoc query database cua service khac truc tiep
- AI output phai di qua service boundary ro rang
- khong dua Vertex AI vao online hot path neu chua co quy dinh moi


