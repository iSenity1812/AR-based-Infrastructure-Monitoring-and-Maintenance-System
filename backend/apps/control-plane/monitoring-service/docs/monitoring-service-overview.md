# Monitoring Service Overview

## 1. Purpose

This document provides the high-level overview for `Monitoring Service`.

Its job is to explain:

- what the service exists to do
- what data and business truth it owns
- what inputs it consumes
- what outputs it produces
- what must stay outside its boundary
- how it differs from `Incident Workflow Service`

This overview is the service-level reference that should guide Phase 2 and later implementation work.

## 2. Service Mission

`Monitoring Service` is the control-plane service responsible for turning shaped telemetry into monitoring decisions.

Its mission is to:

- evaluate operational state across infrastructure scopes
- apply monitoring policy
- create and manage alerts
- derive monitoring health summaries
- expose monitoring-oriented read models
- publish monitoring events for downstream consumers

In short:

- `Monitoring Service` owns detection and alert truth
- it does not own operational response workflow truth

## 3. Core Questions It Answers

`Monitoring Service` should answer questions such as:

- is this node, service, or container in an unhealthy state right now
- which metric or status caused that unhealthy state
- is there an active alert for this condition
- how severe is the current problem
- what is the current monitoring health of this scope

It should not answer:

- who is assigned to handle the problem
- what operational response steps are in progress
- what incident workflow state is authoritative

## 4. Bounded Context

Inside the boundary of `Monitoring Service`, the canonical business concepts are:

- monitoring policy
- rule evaluation
- alert lifecycle
- monitoring health summaries
- monitoring read models

The service owns:

- `alert_rules`
- `alerts`
- `alert_occurrences`
- `health_summaries`
- future suppression and maintenance-state monitoring policy

The service does not own:

- raw telemetry ingestion
- topology source of truth
- incident orchestration
- ticket workflow
- inspection workflow
- notification delivery

## 5. Primary Inputs

`Monitoring Service` consumes shaped data, not raw telemetry.

Primary input categories:

- `context`
- `snapshot`
- `window` in later phases

Meaning of each input:

- `context` answers what this entity is, what it is related to, and what baseline attributes or capacity it has
- `snapshot` answers what the latest known state is right now
- `window` answers how values have behaved over recent time

Examples:

- `node.hostname` from `context`
- `node.memory_total_bytes` from `context`
- `node.cpu_usage_pct` from `snapshot`
- `container.status` from `snapshot`
- rolling 20-batch CPU or retransmit behavior from `window`

## 6. Managed Monitoring Scopes

The primary scopes are:

- `node`
- `service`
- `container`
- `rack`

Scope intent:

- `node`, `service`, and `container` are direct rule evaluation targets
- `rack` is a derived monitoring scope used for rollup and operational visibility

`rack` should usually be derived from topology and member health rather than directly monitored from raw rack telemetry.

## 7. Core Outputs

The service produces:

- authoritative alerts
- alert occurrence history
- health summaries
- monitoring-facing read models
- monitoring events

Expected event families:

- `alert.opened`
- `alert.updated`
- `alert.resolved`
- `health.changed`

These outputs are meant for:

- control-plane APIs
- dashboard and context composition
- downstream services such as `Incident Workflow Service` and `Notification Service`

## 8. What It Owns In Storage

`Monitoring Service` must own its own database boundary.

Expected persisted data:

- monitoring rules
- alerts
- alert occurrences
- health summaries
- future suppression policy data if needed

It may cache or consume `context`, `snapshot`, or `window` inputs for evaluation, but those telemetry inputs are not its primary long-term system of record.

## 9. Explicit Non-Goals

The following responsibilities must stay outside this service:

- raw Kafka payload decoding
- telemetry normalization
- canonical metric shaping
- direct raw telemetry persistence
- topology truth management
- incident management
- ticket orchestration
- inspection orchestration
- notification delivery
- AI inference hot-path ownership

This keeps the service focused and prevents boundary drift.

## 10. Boundary With Incident Workflow Service

This is the most important service boundary to keep clear.

### 10.1 Monitoring Service owns

- monitoring rule definitions
- rule evaluation outcomes
- alert creation
- alert refresh
- alert resolution
- monitoring health summaries
- detection-oriented read models

### 10.2 Incident Workflow Service owns

- incidents
- tickets or work items
- assignments
- comments and handling timeline
- escalation workflow
- inspection linkage
- operational response state

### 10.3 Plain-language split

The split should be understood as:

- `Monitoring Service` owns: what is wrong
- `Incident Workflow Service` owns: what we do about it

Or:

- `alert` = operational symptom and detection truth
- `incident` = coordinated response case

### 10.4 What must not be mixed

`Monitoring Service` must not:

- create or own incidents as authoritative workflow entities
- assign responders
- own ticket lifecycle
- own operational comments or response timeline
- decide workflow completion

`Incident Workflow Service` must not:

- own monitoring rule policy
- recompute alerts from telemetry as source of truth
- decide authoritative alert open or resolved state
- own health summary derivation from telemetry

### 10.5 Relationship between alert and incident

The intended relationship is:

- a monitoring alert may lead to an incident
- an incident references one or more alerts
- an incident may outlive the alert that originally triggered it

This is why `alert` and `incident` must remain separate entities with separate ownership.

## 11. Example Boundary Scenarios

### Scenario A: single threshold breach

- `Monitoring Service` detects `node.cpu_usage_pct > 90`
- it opens `ALERT-001`
- operator decides the issue needs handling
- `Incident Workflow Service` creates `INC-101`
- later CPU returns to normal
- `Monitoring Service` resolves `ALERT-001`
- `INC-101` may still remain open while investigation continues

### Scenario B: correlated operational issue

- several container alerts are active on one node
- `Monitoring Service` keeps authoritative alert state for each condition
- `Incident Workflow Service` may group them into one incident for response coordination

This preserves detection truth while allowing workflow aggregation.

## 12. Intended Interaction Pattern

The preferred interaction pattern is:

1. `Monitoring Service` detects and updates alerts
2. it publishes monitoring events
3. operator UI or automation decides whether to create an incident
4. `Incident Workflow Service` creates and manages the incident
5. context composition or dashboard joins monitoring data with workflow data

This keeps services decoupled while still supporting a full operational flow.

## 13. Phase Roadmap

### Phase 1: Foundation

- service boundary
- domain model
- input contracts
- repository contracts
- minimum runnable service skeleton

### Phase 2: Snapshot Rules

- consume `snapshot`
- use `context` when needed
- support `threshold`, `state/status`, and `capacity-relative` rules
- open, refresh, and resolve alerts
- update health summaries

### Phase 3: Alert Lifecycle Expansion

- acknowledgement
- richer dedup and cooldown handling
- manual alert actions
- stronger alert audit behavior

### Phase 4: Window Rules

- consume `window`
- sustained threshold
- trend or drift
- spike detection
- simple short-horizon correlation

### Phase 5: Health Read Models

- node health summary
- service health summary
- container health summary
- rack rollup summary
- dashboard-facing monitoring projections

### Phase 6: Topology, Policy, and Downstream Ops

- topology-aware grouping
- suppression and maintenance policy
- alert routing
- downstream integration with notification and incident workflow
- stronger observability for the service itself

## 14. Phase 2 Focus

The immediate next phase should focus on `Snapshot Rules`.

Why:

- it creates the first real monitoring value
- it validates that service boundaries are correct
- it gives downstream services something meaningful to consume
- it does not require incident workflow logic to be mixed into monitoring

Phase 2 should stop at alert truth.

It should publish enough context for `Incident Workflow Service` to react later, but it should not absorb incident orchestration responsibilities.

## 15. Guiding Principles

When implementing this service, keep these principles stable:

- shaped telemetry in, monitoring truth out
- alert truth stays in `Monitoring Service`
- incident truth stays in `Incident Workflow Service`
- read models should not distort ownership
- later phases may deepen behavior, but they must not blur service boundaries

## 16. One-line Summary

`Monitoring Service` is the authoritative control-plane service for monitoring policy, alert truth, and health truth; `Incident Workflow Service` is the authoritative control-plane service for operational response workflow built on top of those alerts.
