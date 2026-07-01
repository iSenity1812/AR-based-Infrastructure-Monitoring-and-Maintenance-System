# Monitoring Service Phase 1 Design Spec

## 1. Purpose

This document defines the Phase 1 design for `Monitoring Service`.

Phase 1 focuses on establishing the service boundary, owned domain model, input and output contracts, and the minimum implementation shape required before alert logic and health projections are built in later phases.

This phase does not aim to implement advanced anomaly logic, full incident orchestration, or broad UI composition. It exists to lock the architecture so that later rule engine work can be added without reworking service ownership.

## 2. Source Alignment

This spec aligns with the current repository source of truth:

- [docs/service_decomposition.md](D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/docs/service_decomposition.md)
- [docs/service_interaction_matrix.md](D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/docs/service_interaction_matrix.md)
- [docs/data_architecture.md](D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/docs/data_architecture.md)
- [docs/project-structure.md](D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/docs/project-structure.md)

Repository intent already states that `Monitoring Service` owns:

- `alert_rules`
- `alerts`
- monitoring read models

This spec narrows that high-level intent into a concrete Phase 1 implementation boundary.

## 3. Phase 1 Goal

Phase 1 must answer these questions clearly:

1. What business truth does `Monitoring Service` own?
2. What shaped telemetry inputs may it consume?
3. What outputs will it expose to other services and the control plane?
4. What data and logic must stay out of this service?
5. What module structure should the implementation follow?

Phase 1 is complete when the service can be scaffolded with a stable contract and domain model, even if later phases still add rule execution depth.

## 4. Service Mission

`Monitoring Service` is the control-plane service responsible for turning shaped telemetry into monitoring decisions.

Its business mission is to:

- evaluate operational state across infrastructure scopes
- create and manage alerts
- derive monitoring health summaries
- expose monitoring-facing read models to the control plane
- publish monitoring events for downstream workflow and notification systems

It is not a raw telemetry processing service.

## 5. Bounded Context

The bounded context of `Monitoring Service` is:

- monitoring policy
- alert lifecycle
- monitoring status and health truth
- derived monitoring read models

Inside this boundary, the service owns:

- rule definitions
- rule evaluation outcomes
- active and historical alerts
- health summaries by scope
- suppression and maintenance-state policy in later phases

Outside this boundary:

- raw telemetry ownership belongs to ingestion and data-plane services
- topology truth belongs to `Asset Context Service`
- incident execution truth belongs to `Incident Workflow Service`
- delivery of notifications belongs to `Notification Service`

## 6. Explicit Non-Goals

Phase 1 must not introduce these responsibilities:

- raw Kafka payload decoding
- telemetry normalization or canonicalization
- direct raw telemetry persistence
- dashboard-only query aggregation without owned state
- incident ownership
- AI inference hot path logic
- repository-wide Redis scans as a primary data access pattern

## 7. Primary Inputs

Phase 1 officially supports these input categories:

- `context` shaped data
- `snapshot` shaped data

`window` shaped data is acknowledged as a planned future input, but it is not part of the Phase 1 evaluation contract.

### 7.1 Why only context and snapshot in Phase 1

Phase 1 should stay focused on current-state monitoring rules.

`context` provides:

- identity
- relationships
- capacity baseline
- topology hints

`snapshot` provides:

- latest state
- latest numeric values
- latest status fields

This is enough to support first useful monitoring behavior without pulling temporal logic into the base architecture too early.

## 8. Input Semantics

Phase 1 uses shaped inputs with the following meaning:

- `context` answers: what is this entity, how is it related, and what baseline attributes does it have
- `snapshot` answers: what is this entity's latest known state right now

Examples:

- `node.hostname` from `context` is used for alert enrichment
- `node.memory_total_bytes` from `context` is used for capacity-relative reasoning
- `node.cpu_usage_pct` from `snapshot` is used for threshold evaluation
- `container.status` from `snapshot` is used for state-rule evaluation

## 9. Managed Monitoring Scopes

Phase 1 formally recognizes these monitoring scopes:

- `node`
- `service`
- `container`
- `rack`

Scope intent:

- `node`, `service`, and `container` are direct monitoring scopes
- `rack` is a derived monitoring scope backed by metadata and aggregation

Phase 1 rule evaluation is centered on:

- `node`
- `service`
- `container`

`rack` is included in the model because it is needed for health rollup and future blast-radius views, but it is not the first-class rule target in the initial implementation.

## 10. Core Use Cases in Phase 1

Phase 1 should support the following use-case set at the contract level.

Write-side use cases:

- ingest shaped monitoring inputs
- register monitoring rule
- update monitoring rule
- evaluate current-state rule
- open alert
- refresh existing alert
- resolve alert

Read-side use cases:

- list open alerts
- get alert detail
- get health summary by scope
- get recent health overview by node, service, container, or rack

Not every use case must be feature-complete in Phase 1, but the service shape must reserve proper module boundaries for them.

## 11. Domain Model v1

Phase 1 defines four primary domain models.

### 11.1 MonitoringRule

`MonitoringRule` represents monitoring policy.

Minimum fields:

- `rule_id`
- `name`
- `scope_type`
- `metric_key`
- `operator`
- `threshold_value`
- `severity`
- `enabled`
- `evaluation_mode`
- `created_at`
- `updated_at`

Notes:

- Phase 1 only needs simple threshold and state operators
- a full expression DSL is explicitly deferred

### 11.2 Alert

`Alert` is the authoritative monitoring problem entity.

Minimum fields:

- `alert_id`
- `fingerprint`
- `rule_id`
- `scope_type`
- `scope_id`
- `agent_id`
- `severity`
- `status`
- `title`
- `summary`
- `first_seen_at`
- `last_seen_at`
- `acknowledged_at`
- `resolved_at`

Notes:

- `Alert` is not just a log line
- it is a lifecycle-managed entity

### 11.3 AlertOccurrence

`AlertOccurrence` records each evaluation match or refresh event associated with an alert.

Minimum fields:

- `occurrence_id`
- `alert_id`
- `observed_at`
- `metric_key`
- `observed_value`
- `threshold_value`
- `batch_sequence`

Notes:

- useful for audit
- useful for recurrence and operator diagnosis
- allows later flapping detection without reshaping the alert entity

### 11.4 HealthSummary

`HealthSummary` is the derived status projection for each monitored scope.

Minimum fields:

- `scope_type`
- `scope_id`
- `agent_id`
- `health_status`
- `highest_severity`
- `open_alert_count`
- `warning_alert_count`
- `critical_alert_count`
- `updated_at`

For `rack`, this model may include derived rollup fields in later phases, but the base identity and severity counters belong here from the start.

## 12. Ubiquitous Language

The following vocabulary should be treated as canonical inside `Monitoring Service`.

- `Rule`: monitoring policy definition
- `Observation`: shaped input seen during evaluation
- `Match`: a rule evaluation that triggers
- `Alert`: managed monitoring issue entity
- `Occurrence`: one recorded instance of a match or alert refresh
- `HealthSummary`: current monitoring projection for a scope
- `Scope`: the monitored object, such as node, service, container, or rack

This language prevents confusion between:

- telemetry event
- rule match
- alert event
- incident

## 13. Data Ownership

`Monitoring Service` must own its own database boundary.

Owned collections or tables:

- `monitoring_rules`
- `alerts`
- `alert_occurrences`
- `health_summaries`

Planned future ownership:

- `silences`
- `maintenance_windows`
- `suppression_policies`

Phase 1 must not read authoritative business data directly from other services' databases.

Cross-service data access must happen through:

- consumed shaped events
- replicated read models when explicitly justified
- internal API or gRPC calls for topology or context lookup

## 14. Storage Strategy

Phase 1 storage should align with the repo architecture direction:

- MongoDB logical database owned by `Monitoring Service`

Why MongoDB fits here:

- alert and rule documents are operational entities, not time-series telemetry
- health summary documents are read-model shaped
- entity evolution is likely before schema stabilizes

Redis may be used later for hot-serving read models, but it is not the primary source of truth for alert lifecycle.

## 15. External Dependencies

Phase 1 depends on these external systems or service boundaries:

- shaped telemetry outputs from the data plane
- `Asset Context Service` for topology and metadata resolution where needed
- `Control Plane API` or context composition layer for query consumers

Planned downstream integrations:

- `Notification Service`
- `Audit Service`
- `Incident Workflow Service`

These downstream systems should consume monitoring events, not own monitoring lifecycle state.

## 16. Interaction Model

Phase 1 interaction style:

- asynchronous input for shaped telemetry-derived state
- synchronous query exposure for control-plane monitoring views
- asynchronous output events for alert lifecycle changes

Input pattern:

- consume shaped `context` and `snapshot` updates

Output pattern:

- expose query APIs for monitoring read access
- publish `alert_opened`, `alert_updated`, and `alert_resolved` events later in implementation

## 17. Rule Types Supported by Phase 1

Phase 1 only needs current-state rule support.

Examples:

- threshold rules:
  - `node.cpu_usage_pct > 90`
  - `node.memory_used_pct > 85`
- state rules:
  - `container.status != running`
  - `container.health_status = unhealthy`
- capacity-relative rules:
  - `running_container_count < container_count`
  - memory pressure interpretation using context baseline

Deferred rule families:

- sustained threshold rules
- moving-window rules
- trend or drift rules
- anomaly scoring
- multi-metric correlation

These belong to later phases after `window` input is officially integrated.

## 18. Health Model

Phase 1 health derivation should be simple and deterministic.

Suggested statuses:

- `healthy`
- `warning`
- `critical`
- `unknown`

Suggested derivation:

- `critical` if any open critical alert exists for the scope
- `warning` if no critical alert exists but at least one warning alert exists
- `healthy` if no open alert exists and recent data is valid
- `unknown` if data is missing or stale according to future freshness policy

This model is intentionally simple and suitable for dashboard and AR composition.

## 19. Rack Scope in Phase 1

`rack` must be treated as a derived scope.

It does not consume raw rack telemetry in Phase 1.

Its initial role is:

- aggregate and present rollup monitoring status
- support topology-aware dashboards
- provide future blast-radius views

Phase 1 should model `rack` in a way that allows later derived fields such as:

- node counts
- open alert counts
- critical node counts
- average utilization summaries

But it should not fake rack raw telemetry.

## 20. API and Contract Direction

Phase 1 should reserve module boundaries for:

- command handlers for rule and alert lifecycle
- query handlers for open alerts and health summaries
- inbound consumers for shaped monitoring inputs
- persistence adapters for owned monitoring documents

Suggested internal boundary types:

- `ports/inbound`
- `ports/outbound`
- `application/usecases/commands`
- `application/usecases/queries`
- `adapters/inbound`
- `adapters/outbound`

The exact transport can evolve later, but the use-case boundaries should be stable from Phase 1 onward.

## 21. Proposed Folder Structure

Target path:

- `backend/apps/control-plane/monitoring-service/`

Phase 1 structure:

```text
backend/apps/control-plane/monitoring-service/
  docs/
  src/
    domain/
      entities/
      value-objects/
      services/
    application/
      ports/
      use-cases/
        commands/
        queries/
    adapters/
      inbound/
      outbound/
        persistence/
    infrastructure/
      config/
      bootstrap/
```

Implementation note:

- controllers and transport adapters should stay thin
- alert and rule behavior should live in the domain or application layers
- topology and shaped-input access should stay behind outbound or inbound adapters

## 22. Phase 1 Risks

The main risks at this phase are architectural, not algorithmic.

### 22.1 Boundary drift

Risk:

- the service becomes a generic query aggregator or telemetry processor

Mitigation:

- keep ownership limited to rules, alerts, and health summaries

### 22.2 Wrong input contract

Risk:

- consuming dashboard-facing read models instead of stable shaped monitoring inputs

Mitigation:

- use `context` and `snapshot` as first-class monitoring inputs

### 22.3 Alert and incident confusion

Risk:

- alert lifecycle and incident workflow become mixed

Mitigation:

- alert remains authoritative here
- incident remains authoritative in `Incident Workflow Service`

### 22.4 Premature temporal complexity

Risk:

- window, trend, and anomaly logic bloats Phase 1

Mitigation:

- defer `window` rule logic to a later phase

## 23. Done Criteria

Phase 1 is complete when all of the following are true:

1. `Monitoring Service` boundary is documented and agreed.
2. Owned entities are defined:
   - `MonitoringRule`
   - `Alert`
   - `AlertOccurrence`
   - `HealthSummary`
3. Managed scopes are defined:
   - `node`
   - `service`
   - `container`
   - `rack`
4. Official Phase 1 inputs are fixed:
   - `context`
   - `snapshot`
5. Storage ownership is fixed to the service database boundary.
6. Folder structure and layer boundaries are fixed.
7. Future phases can add rule depth without changing ownership.

## 24. Recommended Next Step

The next document after this spec should define the Phase 1 implementation plan for:

- service scaffold
- domain entity definitions
- input adapter contract for `context` and `snapshot`
- repository interfaces
- first snapshot-rule evaluation use cases

That planning work becomes the direct bridge into implementation.
