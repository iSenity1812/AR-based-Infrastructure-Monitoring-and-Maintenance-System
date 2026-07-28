# Service Interaction Matrix

## 1. Overview

Tai lieu nay mo ta `service interaction matrix` cho nen tang AR + AI infrastructure monitoring.

Muc tieu:

- Chot cach cac service giao tiep voi nhau.
- Chuan hoa viec dung `REST`, `gRPC`, `Redpanda`, `Socket`.
- Lam co so cho `API architecture`, `event contract`, `deployment architecture`.

Trong tai lieu nay:

- `REST` duoc dung cho north-south traffic va command API ro rang.
- `gRPC` duoc dung cho east-west traffic can lookup/composition nhanh.
- `Redpanda` duoc dung cho async propagation va decoupling.
- `Socket` chi dung cho realtime push ra client.

## 2. Interaction Rules

| Protocol | Use when | Avoid when |
| --- | --- | --- |
| `REST` | client-facing APIs, collector ingest, workflow command APIs | low-latency internal fan-out giua nhieu service |
| `gRPC` | internal synchronous lookup, aggregation path, low-latency composition | public browser-facing API va long-running async flows |
| `Redpanda` | telemetry fan-out, alert/inference propagation, replay, decoupling | request/response can immediate result |
| `Socket` | realtime push tu control plane den dashboard/AR client | backbone giua services hoac business write path |

## 3. Matrix

| Source | Target | Interaction purpose | Protocol | Interaction type |
| --- | --- | --- | --- | --- |
| `Web Dashboard` | `Control Plane API and BFF` | login, topology views, monitoring, workflow commands | `REST` | synchronous |
| `Web Dashboard` | `Control Plane realtime gateway` | live dashboard push updates | `Socket` | asynchronous push |
| `WebAR Client` | `Control Plane API and BFF` | auth, QR marker scan, diagnostics bundle, inspection submission | `REST` | synchronous |
| `WebAR Client` | `Control Plane realtime gateway` | live ticket/alert refresh neu can | `Socket` | asynchronous push |
| `Telemetry Collectors` | `Telemetry Ingestion Service` | batched telemetry ingest | `REST` | synchronous request, async downstream effects |
| `Simulation Producers` | `Telemetry Ingestion Service` | simulated telemetry/event ingest | `REST` | synchronous request, async downstream effects |
| `Control Plane API and BFF` | `Identity Service` | auth and identity queries | `gRPC` | synchronous internal |
| `Control Plane API and BFF` | `Asset Context Service` | asset and marker queries | `gRPC` | synchronous internal |
| `Control Plane API and BFF` | `Monitoring Service` | alert queue, recent health, diagnostics read models | `gRPC` | synchronous internal |
| `Control Plane API and BFF` | `Incident Workflow Service` | incident, ticket, inspection commands and queries | `gRPC` | synchronous internal |
| `Control Plane API and BFF` | `Simulation Service` | scenario and run control | `gRPC` | synchronous internal |
| `Telemetry Ingestion Service` | `Asset Context Service` | asset lookup va enrichment context | `gRPC` | synchronous internal |
| `Telemetry Ingestion Service` | `Redpanda` | publish validated telemetry events | `Redpanda` | asynchronous |
| `Telemetry Ingestion Service` | `Object Storage` | archive invalid or replayable payloads | `REST` or SDK | asynchronous side effect |
| `Stream Processing Service` | `Redpanda` | consume telemetry events and emit snapshot updates and alert candidates | `Redpanda` | asynchronous |
| `AI Analytics Service` | `Redpanda` | consume telemetry/snapshot events and emit inference completions | `Redpanda` | asynchronous |
| `Monitoring Service` | `Redpanda` | consume alert candidates and AI completions, publish alert-created events | `Redpanda` | asynchronous |
| `Monitoring Service` | `Notification Service` | alert notification trigger | `Redpanda` | asynchronous |
| `Monitoring Service` | `Audit Service` | alert audit trigger | `Redpanda` | asynchronous |
| `Incident Workflow Service` | `Notification Service` | incident/ticket/inspection notifications | `Redpanda` | asynchronous |
| `Incident Workflow Service` | `Audit Service` | workflow audit trigger | `Redpanda` | asynchronous |
| `Simulation Service` | `Redpanda` | publish simulation lifecycle and trace events | `Redpanda` | asynchronous |
| `Notification Service` | `External notification channels` | webhook/email/chat delivery | `REST` | synchronous outbound |
| `All business services` | `Audit Service` | domain audit event submission | `Redpanda` | asynchronous |

## 4. Interaction Patterns by Boundary

### 4.1 Client to Platform

`Client -> platform` se dung:

- `REST` cho:
  - login
  - CRUD va workflow command
  - diagnostics retrieval
  - inspection submission
- `Socket` cho:
  - dashboard live updates
  - AR live refresh neu can

### 4.2 Data Plane Internal

`Data plane` se dung:

- `gRPC` cho `ingestion -> asset lookup`
- `Redpanda` cho:
  - telemetry fan-out
  - snapshot updates
  - alert candidate generation
  - AI scoring

### 4.3 Control Plane Internal

`Control plane` se dung:

- `gRPC` cho BFF composition va low-latency reads
- `Redpanda` cho:
  - alert created
  - notification trigger
  - audit trigger
  - inspection workflow propagation

## 5. Recommended Protocol Decisions

### 5.1 REST

Nen dung `REST` cho:

- tat ca public APIs cho `Web Dashboard` va `WebAR Client`
- `Telemetry Collector -> Telemetry Ingestion Service`
- outbound adapters nhu webhook

Ly do:

- don gian, phu hop voi browser/mobile/collector
- de document
- hop voi near-realtime batch ingest

### 5.2 gRPC

Nen dung `gRPC` cho:

- `Telemetry Ingestion Service -> Asset Context Service`
- `Control Plane API and BFF -> Identity`, `Asset Context`, `Monitoring`, `Incident Workflow`, `Simulation`

Ly do:

- latency thap
- contract ro
- phu hop voi internal service composition ma khong tao them query microservice rieng

### 5.3 Redpanda

Nen dung `Redpanda` cho:

- validated telemetry events
- snapshot.updated
- alert.candidate
- alert.created
- ai.inference.completed
- inspection.submitted
- simulation.events

Ly do:

- fan-out
- at-least-once delivery
- replay
- tach producer va consumer

### 5.4 Socket

Nen dung `Socket` cho:

- live dashboard cards
- live alert counters
- live ticket refresh neu can

Khong nen dung cho:

- service-to-service giao tiep
- command workflow
- ingest pipeline backbone

## 6. Recommended Phase-1 Cut

Neu can cat bot de implementation phase 1 smooth hon, nen giu toi thieu:

- `REST`
  - clients -> control plane API/BFF
  - collectors -> ingestion
- `gRPC`
  - ingestion -> asset context
  - BFF -> identity/asset/monitoring/incident workflow
- `Redpanda`
  - ingest -> stream processing/AI
  - monitoring and workflow -> notification/audit
- `Socket`
  - control plane -> dashboard

Nhung luong co the de phase sau:

- `Socket` cho AR
- direct simulation producer -> Redpanda
- qua nhieu synchronous control-plane-to-control-plane command hop

## 7. Companion Summary

| Interaction group | Recommended protocol | Main rationale |
| --- | --- | --- |
| `Client-facing APIs` | `REST` | compatibility, simplicity, documentability |
| `Collector ingest` | `REST` | batch payloads, retry semantics, easy auth |
| `Internal lookup/composition` | `gRPC` | low latency, typed contracts |
| `Async domain and telemetry propagation` | `Redpanda` | decoupling, replay, fan-out |
| `Realtime UI push` | `Socket` | dashboard/AR live updates only |

## 8. Review Checklist

Tai lieu nay dat muc tieu neu:

- moi cap giao tiep quan trong deu co protocol ro rang.
- `REST`, `gRPC`, `Redpanda`, `Socket` khong bi dung lap vai tro.
- AR diagnostics path duoc thiet ke qua `BFF composition`, khong can them microservice doc lap chi de query-hop.
- telemetry pipeline duoc thiet ke theo asynchronous event backbone hop ly.
- co the dung tai lieu nay de suy ra `API architecture`, `Redpanda topic contract`, `deployment traffic policy`, `service mesh policy` o vong sau.

