# Monitoring Service Phase 2 Business Analysis

## 1. Business Objective

### 1.1 Business problem

The platform already has shaped telemetry lanes such as `context` and `snapshot`, but there is not yet an authoritative business service that can answer a simple operational question:

- is something wrong right now
- how serious is it
- is this a new issue or the same issue continuing
- what is the current health status of the affected monitoring scope

Without this phase:

- telemetry remains observational data only
- operators still need to interpret raw or shaped values manually
- downstream workflow services do not have a stable monitoring truth to react to
- dashboard health state cannot be made consistent across node, service, and container scopes

### 1.2 User and system value

This phase creates the first monitoring behavior with direct business value.

Value for operators:

- clear current-state detection instead of manual metric reading
- stable alert objects instead of transient threshold breaches
- consistent health view for monitored entities

Value for Product Owner and stakeholder:

- monitoring behavior becomes reviewable as business rules
- alert scope, severity, and lifecycle become governed by product policy
- downstream incident and notification features can be built on authoritative monitoring output

Value for the platform:

- establishes `Monitoring Service` as the owner of detection truth
- decouples telemetry shaping from alert decisioning
- creates deterministic outputs for audit, QA, and future automation

### 1.3 Success outcome

Phase 2 is successful when all of the following are true:

- current-state rules can be defined and activated for supported scopes
- incoming `snapshot` data is evaluated consistently against active rules
- when a rule condition is met, the system opens or refreshes an alert deterministically
- when a violating condition disappears, the system resolves the corresponding alert deterministically
- `health_summary` is updated to reflect current monitoring truth
- monitoring lifecycle events are published for downstream consumers
- duplicate or repeated evaluations do not create uncontrolled duplicate alerts

### 1.4 Feature boundary

This phase is intentionally limited to current-state monitoring.

Inside boundary:

- `snapshot`-driven rule evaluation
- `context` lookup when rule evaluation or alert enrichment needs baseline data
- rule types:
  - threshold
  - state or status
  - capacity-relative
- alert open, refresh, resolve
- occurrence recording
- health summary update
- monitoring event publication

Outside boundary:

- incident creation and assignment
- acknowledgement workflow
- silence or maintenance suppression
- long-horizon window analysis
- anomaly or ML-based detection
- notification delivery orchestration

## 2. Scope Definition

### 2.1 In scope

#### 2.1.1 Consume monitoring `snapshot` input

Why needed:

- detection requires a current-state signal as evaluation input

Business impact:

- enables the system to detect active issues now instead of waiting for historical analysis

#### 2.1.2 Use `context` as supporting reference input

Why needed:

- some rules need baseline or identity information, such as capacity and display metadata

Business impact:

- improves rule correctness and alert readability
- allows capacity-relative evaluation without hardcoding capacity into each rule

#### 2.1.3 Support three rule families

Rule families:

- threshold
- state or status
- capacity-relative

Why needed:

- these cover the majority of first useful operational checks

Business impact:

- gives the product practical monitoring coverage early with low policy complexity

#### 2.1.4 Create and maintain authoritative alerts

Why needed:

- a threshold breach is not itself a business object; operations need a managed issue entity

Business impact:

- provides stable alert identity for UI, audit, and downstream workflow

#### 2.1.5 Record alert occurrences

Why needed:

- repeated matches must be traceable for diagnosis and future behavior analysis

Business impact:

- supports QA verification, operational explainability, and future lifecycle features

#### 2.1.6 Update health summaries

Why needed:

- the dashboard and control plane need an at-a-glance operational state per scope

Business impact:

- enables consistent severity rollup and simplified monitoring UX

#### 2.1.7 Publish monitoring events

Why needed:

- downstream consumers must react to alert and health changes without querying internal storage directly

Business impact:

- protects service boundary and enables extensibility for incident, notification, and audit flows

### 2.2 Out of scope

#### 2.2.1 Incident workflow creation and assignment

Why excluded:

- belongs to `Incident Workflow Service`

Business impact:

- preserves the split between detection truth and response workflow truth

#### 2.2.2 Manual acknowledgement and operator action tracking

Why excluded:

- lifecycle expansion belongs to a later phase

Business impact:

- keeps Phase 2 focused on reliable current-state detection first

#### 2.2.3 Window-based and trend-based evaluation

Why excluded:

- requires temporal logic and different input contracts

Business impact:

- avoids mixing snapshot detection with time-series reasoning too early

#### 2.2.4 Suppression policy, maintenance window, and silence rules

Why excluded:

- these are policy overlays, not base detection behavior

Business impact:

- reduces ambiguity while initial alert truth is being validated

#### 2.2.5 Dynamic anomaly scoring or ML inference

Why excluded:

- not required for deterministic Phase 2 behavior

Business impact:

- keeps rules explainable for PO, QA, and operators

### 2.3 Future enhancement

#### 2.3.1 Alert acknowledgement and richer lifecycle

Why later:

- builds on stable alert identity produced in this phase

Business impact:

- supports human-in-the-loop operations without changing detection truth ownership

#### 2.3.2 Window and sustained-condition rules

Why later:

- depends on `window` input and temporal evaluation engine

Business impact:

- reduces noise and false positives for bursty signals

#### 2.3.3 Maintenance suppression and policy layering

Why later:

- only valuable after base alerting is trustworthy

Business impact:

- reduces operational noise in planned maintenance periods

#### 2.3.4 Alert-to-incident automation

Why later:

- depends on stable monitoring events and cross-service contract agreement

Business impact:

- shortens response time without moving incident truth into monitoring

## 3. Actors and Responsibilities

| Actor                            | Role                                                         | Data sent                                     | Output received                                 | Ownership                                                         |
| -------------------------------- | ------------------------------------------------------------ | --------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Telemetry Shaping Service        | Upstream producer of shaped monitoring inputs                | `snapshot`, `context` events                  | none required in Phase 2                        | owns shaping output only, not alert truth                         |
| Monitoring Service               | Detection and alert authority                                | receives shaped inputs and rule commands      | emits alerts, health changes, monitoring events | owns rules, alerts, occurrences, health summaries                 |
| Product Owner / Monitoring Admin | Defines monitoring policy                                    | rule definitions, enable or disable decisions | rule status, policy effect                      | owns business intent of rule policy, not persisted entity storage |
| Control Plane API / BFF          | Read composition layer                                       | query requests                                | alerts and health read models                   | does not own monitoring truth                                     |
| Operator                         | Consumes monitoring output                                   | query intent only in this phase               | alerts, health state                            | no entity ownership                                               |
| Incident Workflow Service        | Downstream workflow consumer                                 | no write into monitoring truth in Phase 2     | monitoring events, alert references             | owns incident lifecycle                                           |
| Notification Service             | Downstream delivery consumer                                 | no write into monitoring truth in Phase 2     | alert change events                             | owns delivery outcome, not alert truth                            |
| Audit Service                    | Downstream audit consumer                                    | no write into monitoring truth in Phase 2     | alert and rule change events                    | owns audit log, not business alert state                          |
| Asset Context Service            | External source of topology and asset metadata when required | topology or asset metadata lookup results     | none                                            | owns topology truth                                               |

### 3.1 Entity ownership

| Entity                                      | Owner                                                 |
| ------------------------------------------- | ----------------------------------------------------- |
| Monitoring Rule                             | Monitoring Service                                    |
| Alert                                       | Monitoring Service                                    |
| Alert Occurrence                            | Monitoring Service                                    |
| Health Summary                              | Monitoring Service                                    |
| Incident                                    | Incident Workflow Service                             |
| Topology / Rack membership / Asset metadata | Asset Context Service                                 |
| Raw telemetry                               | Telemetry Ingestion and data-plane telemetry services |

## 4. Business Flow

### 4.1 Scenario: CPU threshold violation

Given:

- rule `node.cpu_usage_pct > 90` is active
- a valid `snapshot` is received for a `node`
- the snapshot contains `node.cpu_usage_pct = 95`

When:

- Monitoring Service evaluates the snapshot against active rules for that scope

Then:

- the rule is matched
- deduplication logic checks whether the same issue already has an active alert
- if no active matching alert exists, a new alert is opened
- an occurrence is recorded
- the node health summary is recalculated
- an `alert opened` event is published
- if health state changes, a `health changed` event is published

### 4.2 Scenario: continuing violation

Given:

- an active alert already exists for the same rule and same fingerprint
- a new snapshot again violates the same condition

When:

- the system evaluates the new snapshot

Then:

- no duplicate alert is created
- the existing alert is refreshed
- `last_seen_at` is updated
- a new occurrence is recorded
- health summary remains degraded or critical
- an `alert updated` event is published if business policy requires downstream awareness of refresh

Decision Required:

- whether every refresh must publish `alert.updated`, or only material field changes should publish it

### 4.3 Scenario: recovery

Given:

- an active alert exists for a rule
- a new snapshot for the same scope no longer violates the condition

When:

- the system evaluates recovery against the active rule set

Then:

- the existing alert is resolved
- `resolved_at` is set
- health summary is recalculated
- an `alert resolved` event is published
- if health changes, a `health changed` event is published

### 4.4 Scenario: state or status violation

Given:

- rule `container.status != running` is active
- snapshot contains container status `exited`

When:

- the snapshot is evaluated

Then:

- a state-rule alert is opened or refreshed
- the alert summary identifies the observed status
- the container health summary becomes degraded according to severity policy

### 4.5 Scenario: capacity-relative violation

Given:

- rule compares runtime value against known capacity or baseline
- snapshot contains current usage
- related baseline data exists in `context`

When:

- the service evaluates the rule

Then:

- the baseline is resolved from `context`
- the derived comparison is performed
- the alert result follows the same open or refresh lifecycle as any other matched rule

### 4.6 Recovery path: temporary missing metric in one snapshot

Given:

- the rule is active
- the monitored scope is otherwise valid
- the new snapshot does not contain the required metric field

When:

- evaluation starts

Then:

- the system does not invent a value
- the evaluation result is handled according to missing-data policy

Decision Required:

- whether a missing metric means:
  - skip evaluation only
  - resolve existing alert
  - mark health unknown
  - open a separate data-quality alert

Recommended business stance for Phase 2:

- skip rule evaluation for that rule instance
- do not auto-resolve an existing alert solely because the metric is missing
- optionally mark freshness or data completeness in a later phase

### 4.7 Error path: invalid snapshot payload

Given:

- upstream sends a malformed or semantically invalid monitoring input

When:

- Monitoring Service cannot trust the payload for evaluation

Then:

- the payload is rejected by input validation
- no rule evaluation occurs
- no alert state is changed
- the failure is logged and surfaced operationally

Business note:

- malformed payload is an integration or platform issue, not an infrastructure condition alert

### 4.8 Error path: context-dependent rule without required context

Given:

- a capacity-relative rule requires context baseline
- the required context record is missing or stale

When:

- evaluation is attempted

Then:

- the rule cannot be evaluated reliably
- the system must not guess the baseline

Decision Required:

- whether the service should:
  - skip the rule
  - mark health unknown
  - emit an internal monitoring gap event

Recommended Phase 2 behavior:

- skip that rule evaluation and emit an internal monitoring event for observability

### 4.9 Edge case: duplicate snapshot delivery

Given:

- the same snapshot is delivered more than once due to upstream retry or redelivery

When:

- Monitoring Service receives the duplicate payload

Then:

- it must not create multiple alerts for the same evaluation state
- occurrences should remain deterministic according to idempotency policy

Decision Required:

- whether duplicate redelivery should create another occurrence or be treated as the same processed evaluation

Recommended Phase 2 behavior:

- idempotent on alert state
- occurrence behavior should be deterministic using a delivery identity or evaluation fingerprint if available

### 4.10 Edge case: multiple rules match the same scope

Given:

- one snapshot violates more than one active rule for the same scope

When:

- rule evaluation completes

Then:

- each rule is evaluated independently
- each matched rule may produce its own alert unless an explicit correlation policy says otherwise
- health summary severity is derived from the resulting set of open alerts

Business note:

- Phase 2 should not merge independent rule matches into one composite alert

## 5. Functional Requirements

### FR-201

Description:

- The system shall accept valid `snapshot` inputs for supported monitoring scopes.

Business rule:

- only shaped monitoring inputs are eligible for Phase 2 evaluation

Input:

- `snapshot` payload with scope identity, observation timestamp, and rule-relevant fields

Processing logic:

- validate payload shape and monitoring scope
- reject unsupported or invalid inputs before evaluation

Output:

- accepted input proceeds to rule evaluation

Exception handling:

- invalid input is rejected without changing alert state

Acceptance criteria:

- valid snapshots are evaluated
- invalid snapshots do not create, update, or resolve alerts

### FR-202

Description:

- The system shall support active and inactive monitoring rules.

Business rule:

- only active rules participate in evaluation

Input:

- rule definition and enablement status

Processing logic:

- load active rules applicable to the incoming scope and metric family

Output:

- candidate rule set for evaluation

Exception handling:

- if no active rules exist, evaluation ends with no alert change

Acceptance criteria:

- inactive rules never trigger alerts

### FR-203

Description:

- The system shall evaluate threshold rules against current snapshot values.

Business rule:

- operator behavior and threshold inclusivity must be explicitly defined by policy

Input:

- active threshold rule
- current snapshot value

Processing logic:

- compare observed value with configured threshold using the rule operator

Output:

- match or no-match evaluation outcome

Exception handling:

- missing or non-comparable values follow missing-data policy

Acceptance criteria:

- threshold evaluation returns deterministic outcomes for boundary values

### FR-204

Description:

- The system shall evaluate state or status rules against enumerated snapshot fields.

Business rule:

- comparison must be exact according to supported operators

Input:

- active state rule
- current snapshot status value

Processing logic:

- compare observed status with expected or disallowed state

Output:

- match or no-match evaluation outcome

Exception handling:

- null or missing status follows missing-data policy

Acceptance criteria:

- status mismatch opens or refreshes the appropriate alert

### FR-205

Description:

- The system shall evaluate capacity-relative rules using `snapshot` plus required `context`.

Business rule:

- derived comparison cannot run without required baseline data

Input:

- capacity-relative rule
- snapshot observation
- related context baseline

Processing logic:

- resolve baseline
- derive comparable value
- evaluate rule

Output:

- match or no-match evaluation outcome

Exception handling:

- if baseline is missing, the system follows missing-context policy

Acceptance criteria:

- no derived comparison is performed using guessed or defaulted capacity

### FR-206

Description:

- The system shall create a new alert when a rule match occurs and no active alert exists for the same issue.

Business rule:

- alert identity is governed by deduplication fingerprint policy

Input:

- matched rule evaluation outcome

Processing logic:

- compute fingerprint
- search for active alert with same fingerprint
- create new alert only if none exists

Output:

- new alert and initial occurrence

Exception handling:

- persistence failure prevents partial state from being considered successful

Acceptance criteria:

- first valid match creates exactly one alert

### FR-207

Description:

- The system shall refresh an existing active alert when the same issue is detected again.

Business rule:

- repeated matches of the same issue must not create duplicate active alerts

Input:

- matched rule evaluation outcome with existing active alert

Processing logic:

- update `last_seen_at`
- refresh relevant observed fields
- record occurrence

Output:

- updated active alert and new occurrence if policy allows

Exception handling:

- if alert cannot be refreshed, no inconsistent duplicate alert may be created as fallback

Acceptance criteria:

- repeated violation reuses the active alert deterministically

### FR-208

Description:

- The system shall resolve an active alert when the rule condition is no longer true for the same monitored issue.

Business rule:

- resolution is based on evaluation outcome, not manual workflow action in Phase 2

Input:

- no-match result for a previously open alert

Processing logic:

- identify active alert
- update status to resolved
- set resolution timestamp

Output:

- resolved alert

Exception handling:

- if no active alert exists, no resolve action is performed

Acceptance criteria:

- recovery snapshot resolves the corresponding alert exactly once

### FR-209

Description:

- The system shall record alert occurrences for matched evaluations according to occurrence policy.

Business rule:

- occurrence history must support audit and future analysis

Input:

- matched rule evaluation

Processing logic:

- create an occurrence record linked to the alert

Output:

- persisted occurrence

Exception handling:

- if occurrence persistence fails, business transaction policy must define whether alert change is rolled back

Decision Required:

- whether alert state change and occurrence write are atomic business requirements

Acceptance criteria:

- occurrence history remains consistent with alert lifecycle policy

### FR-210

Description:

- The system shall maintain a health summary per monitoring scope.

Business rule:

- health summary reflects the current set of open alerts and data validity policy

Input:

- alert lifecycle outcome for a scope

Processing logic:

- calculate highest severity
- calculate counts by severity
- assign resulting health status

Output:

- updated health summary

Exception handling:

- stale or missing data treatment requires explicit business policy

Acceptance criteria:

- health summary changes consistently when alert set changes

### FR-211

Description:

- The system shall publish monitoring events when alert or health business state changes.

Business rule:

- events are downstream notifications of monitoring truth, not the source of truth themselves

Input:

- alert opened, refreshed, resolved, or health changed

Processing logic:

- construct event payload from authoritative persisted state

Output:

- monitoring lifecycle event

Exception handling:

- event delivery failure handling must not silently create divergence between stored state and downstream view

Decision Required:

- whether event publication must be transactional via outbox or may be eventually retried asynchronously

Acceptance criteria:

- downstream consumers receive deterministic lifecycle signals for persisted business changes

### FR-212

Description:

- The system shall behave idempotently for duplicate input delivery.

Business rule:

- duplicate delivery must not create duplicate active alerts for the same issue

Input:

- repeated logically identical snapshot input

Processing logic:

- apply deduplication and idempotency checks before state mutation

Output:

- stable alert state

Exception handling:

- if deduplication cannot be confirmed, system must fail safe without proliferating duplicate active alerts

Acceptance criteria:

- repeated delivery does not produce duplicate open alerts

## 6. Business Rules

### 6.1 Rule lifecycle

#### 6.1.1 Rule creation

- A rule is created by a monitoring policy actor through the control-plane path.
- A rule must identify:
  - target scope type
  - rule type
  - target metric or state field
  - operator
  - threshold or expected state
  - severity
  - active status

Decision Required:

- whether rule identity must also include environment, asset group, or topology selector in Phase 2

#### 6.1.2 Rule activation

- only active rules are considered in evaluation
- inactive rules remain stored but non-executable

Decision Required:

- whether deactivating a rule should immediately resolve related open alerts or only stop future evaluation

Recommended policy:

- stop future evaluation only
- do not auto-resolve open alerts without explicit policy, because previous issue truth may still need visibility

#### 6.1.3 Rule target applicability

- rule applies only to matching scope type
- rule applies only when required metric or state field exists and is semantically compatible

### 6.2 Evaluation rule

#### 6.2.1 Operator behavior

Supported operator families in Phase 2:

- numeric:
  - `>`
  - `>=`
  - `<`
  - `<=`
  - `=`
  - `!=`
- state or status:
  - `=`
  - `!=`

Decision Required:

- whether string comparison must be case-sensitive

Recommended policy:

- case-insensitive only if upstream canonicalization guarantees meaning stability
- otherwise exact canonical enum comparison is safer

#### 6.2.2 Threshold boundary

- boundary evaluation follows the exact operator
- `>` excludes equality
- `>=` includes equality
- `<` excludes equality
- `<=` includes equality

This must be reflected identically in QA test cases and product wording.

#### 6.2.3 Missing data handling

If the required metric is missing:

- do not fabricate a value
- do not treat missing as healthy
- do not create a false threshold breach

Decision Required:

- whether missing data should impact health directly in Phase 2

Recommended Phase 2 business rule:

- missing required input causes rule evaluation to be skipped
- health remains based on existing open alerts
- data completeness or freshness health is deferred to a later phase

#### 6.2.4 Multiple rule matching

- multiple different rules may match the same scope from the same snapshot
- each rule is evaluated independently
- each rule may create or refresh a separate alert

Reasoning:

- independent policies should remain traceable and auditable
- correlation belongs to a later phase, not core detection truth

#### 6.2.5 Duplicate snapshot handling

- duplicate deliveries must not create duplicate active alerts

Decision Required:

- whether duplicate deliveries are identified by upstream event id, batch id plus sequence, or deterministic snapshot fingerprint

### 6.3 Alert lifecycle

#### 6.3.1 State machine

Phase 2 minimum states:

- `OPEN`
- `RESOLVED`

Future states outside this phase:

- `ACKNOWLEDGED`
- `SUPPRESSED`

#### 6.3.2 Transitions

| From       | To                   | Trigger                           | Condition                             | Expected result                                                              |
| ---------- | -------------------- | --------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| none       | `OPEN`               | rule match                        | no active alert with same fingerprint | create alert, create occurrence, publish open event                          |
| `OPEN`     | `OPEN`               | repeated rule match               | same fingerprint still active         | refresh alert, record occurrence per policy, publish update event per policy |
| `OPEN`     | `RESOLVED`           | recovery evaluation               | condition no longer matches           | set resolved timestamp, update health, publish resolve event                 |
| `RESOLVED` | `OPEN` or new `OPEN` | recurrence after prior resolution | same issue appears again              | Decision Required                                                            |

#### 6.3.3 New alert versus reuse versus reopen

When a violation happens:

- create new alert if no matching active alert exists
- refresh existing active alert if same fingerprint is already open

Decision Required:

- if a resolved alert sees the same issue again, should the system:
  - reopen the old alert
  - create a new alert linked to the old history

Recommended Phase 2 policy:

- create a new alert and keep the prior resolved alert historical

Reasoning:

- simpler audit trail
- easier QA verification
- avoids ambiguous lifecycle semantics before acknowledgement workflow exists

#### 6.3.4 Resolution rule

- an alert resolves only when the same monitored issue evaluates as recovered
- alert must not resolve merely because another unrelated rule becomes healthy

### 6.4 Deduplication

#### 6.4.1 Fingerprint definition

Fingerprint should represent the business identity of one monitored issue, not one delivery event.

Recommended minimum fingerprint components:

- `rule_id`
- `scope_type`
- `scope_id`

Optional additional components if the rule targets sub-dimensions:

- metric dimension identity that changes the issue meaning, such as disk id, interface id, or container id

Must not include:

- event timestamp
- batch sequence
- transient delivery id

Decision Required:

- whether `severity` belongs in fingerprint

Recommended policy:

- severity should not be part of the fingerprint if the same rule on the same scope remains the same issue

#### 6.4.2 Same issue definition

Two evaluations are the same issue when:

- they refer to the same rule intent
- on the same monitored scope
- for the same metric or sub-entity dimension where relevant

#### 6.4.3 New issue definition

A new alert should be created when:

- there is no active alert with the same fingerprint
- or the previous alert is already resolved and the policy chooses new alert on recurrence

## 7. Data Dictionary

### 7.1 Alert

| Field             | Meaning                                              | Required | Example                                 |
| ----------------- | ---------------------------------------------------- | -------- | --------------------------------------- | ---- | -------- |
| `alert_id`        | Unique identifier of the alert entity                | Required | `ALT-20260626-000231`                   |
| `fingerprint`     | Dedup identity of the monitored issue                | Required | `rule-cpu90                             | node | node-01` |
| `rule_id`         | Rule that produced the alert                         | Required | `rule-node-cpu-critical`                |
| `scope_type`      | Monitored scope type                                 | Required | `node`                                  |
| `scope_id`        | Identifier of the affected scope                     | Required | `node-01`                               |
| `agent_id`        | Telemetry-producing agent identity if applicable     | Optional | `node-msi-8bc4df0d`                     |
| `severity`        | Business severity assigned by policy                 | Required | `critical`                              |
| `status`          | Current lifecycle state                              | Required | `OPEN`                                  |
| `title`           | Short human-readable alert title                     | Required | `Node CPU usage exceeded threshold`     |
| `summary`         | Human-readable business summary of the issue         | Required | `CPU usage is 95%, above 90% threshold` |
| `metric_key`      | Main metric or state field associated with the issue | Required | `node.cpu_usage_pct`                    |
| `observed_value`  | Current violating value for explainability           | Optional | `95`                                    |
| `threshold_value` | Configured threshold if applicable                   | Optional | `90`                                    |
| `first_seen_at`   | Time the issue first opened                          | Required | `2026-06-26T09:00:00Z`                  |
| `last_seen_at`    | Most recent time the issue was confirmed             | Required | `2026-06-26T09:05:00Z`                  |
| `resolved_at`     | Time the issue resolved                              | Optional | `2026-06-26T09:12:00Z`                  |
| `context_ref`     | Lightweight reference to supporting context          | Optional | `node-01`                               |

### 7.2 Alert Occurrence

| Field             | Meaning                                           | Required | Example                |
| ----------------- | ------------------------------------------------- | -------- | ---------------------- |
| `occurrence_id`   | Unique identifier of one observed match           | Required | `AOC-20260626-004511`  |
| `alert_id`        | Parent alert identity                             | Required | `ALT-20260626-000231`  |
| `observed_at`     | Time the condition was observed                   | Required | `2026-06-26T09:05:00Z` |
| `metric_key`      | Metric or state field that matched                | Required | `node.cpu_usage_pct`   |
| `observed_value`  | Value that matched the rule                       | Optional | `96`                   |
| `threshold_value` | Rule comparison baseline                          | Optional | `90`                   |
| `operator`        | Comparison operator used                          | Optional | `>`                    |
| `batch_reference` | Upstream batch or delivery reference if available | Optional | `snapshot-batch-567`   |

Lifecycle meaning:

- occurrence is an evidence record of a rule match or refresh event
- occurrence is not the authoritative current alert state by itself

### 7.3 Health Summary

| Field                  | Meaning                                | Required | Example                |
| ---------------------- | -------------------------------------- | -------- | ---------------------- |
| `scope_type`           | Type of monitored entity               | Required | `node`                 |
| `scope_id`             | Identifier of the monitored entity     | Required | `node-01`              |
| `agent_id`             | Related agent id if applicable         | Optional | `node-msi-8bc4df0d`    |
| `health_status`        | Current derived monitoring health      | Required | `critical`             |
| `highest_severity`     | Highest open severity on this scope    | Optional | `critical`             |
| `open_alert_count`     | Number of open alerts on the scope     | Required | `3`                    |
| `warning_alert_count`  | Number of warning alerts on the scope  | Required | `1`                    |
| `critical_alert_count` | Number of critical alerts on the scope | Required | `2`                    |
| `updated_at`           | Last recalculation time                | Required | `2026-06-26T09:05:00Z` |

Calculation rule:

- `critical` if at least one critical alert is open
- `warning` if no critical alert is open and at least one warning alert is open
- `healthy` if no open alerts exist and data is considered valid
- `unknown` is reserved for missing-data policy if stakeholder approves it for Phase 2

### 7.4 Monitoring Event

| Field             | Meaning                                  | Required | Example                   |
| ----------------- | ---------------------------------------- | -------- | ------------------------- |
| `event_id`        | Unique business event id                 | Required | `evt-01JZ...`             |
| `event_name`      | Event type name                          | Required | `monitoring.alert.opened` |
| `occurred_at`     | Time business change occurred            | Required | `2026-06-26T09:05:00Z`    |
| `alert_id`        | Related alert id if event is alert-based | Optional | `ALT-20260626-000231`     |
| `scope_type`      | Related scope type                       | Required | `node`                    |
| `scope_id`        | Related scope id                         | Required | `node-01`                 |
| `severity`        | Severity relevant to the event           | Optional | `critical`                |
| `payload_version` | Contract version                         | Required | `1`                       |

## 8. Decision Table

### 8.1 Threshold rule

| Condition                    | Input                         | Expected Result        |
| ---------------------------- | ----------------------------- | ---------------------- |
| Below threshold              | CPU = 70, rule `> 90`         | No alert opened        |
| Equal to exclusive threshold | CPU = 90, rule `> 90`         | No alert opened        |
| Equal to inclusive threshold | CPU = 90, rule `>= 90`        | Open or refresh alert  |
| Above threshold first time   | CPU = 95, no active alert     | Open alert             |
| Above threshold repeated     | CPU = 96, active alert exists | Refresh existing alert |
| Recovered                    | CPU = 40, active alert exists | Resolve alert          |

### 8.2 State rule

| Condition                  | Input                                             | Expected Result       |
| -------------------------- | ------------------------------------------------- | --------------------- |
| Expected state met         | `container.status = running`, rule `!= running`   | No alert              |
| Disallowed state           | `container.status = exited`, rule `!= running`    | Open or refresh alert |
| Returned to expected state | `container.status = running`, active alert exists | Resolve alert         |

### 8.3 Capacity-relative rule

| Condition                        | Input                                          | Expected Result                                |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| Baseline available and violation | used `95%`, baseline valid, threshold breached | Open or refresh alert                          |
| Baseline available and healthy   | used `60%`, baseline valid, no breach          | No alert or resolve existing alert             |
| Baseline missing                 | usage present, context missing                 | Decision Required; recommended skip evaluation |

### 8.4 Missing metric

| Condition                      | Input                          | Expected Result                                |
| ------------------------------ | ------------------------------ | ---------------------------------------------- |
| Metric missing for a rule      | snapshot lacks required metric | Decision Required; recommended skip evaluation |
| Metric null and non-comparable | snapshot value null            | Treat as non-evaluable, not as healthy         |

### 8.5 Missing context

| Condition                   | Input                                   | Expected Result                                                       |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Context not needed          | threshold rule with direct metric       | Rule still evaluates normally                                         |
| Context required but absent | capacity-relative rule with no baseline | Decision Required; recommended skip rule and emit internal gap signal |

### 8.6 Duplicate snapshot

| Condition                            | Input                                               | Expected Result                                                           |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Duplicate redelivery before recovery | same logical snapshot repeated                      | No duplicate active alert                                                 |
| Duplicate redelivery after open      | same violation repeated with same delivery identity | Decision Required for occurrence count; alert remains single active issue |

### 8.7 Multiple rule conflict

| Condition                          | Input                                      | Expected Result                             |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Two rules both match same node     | CPU critical and memory warning both match | Two alerts may exist independently          |
| One rule matches, one recovers     | CPU still high, memory back normal         | CPU alert stays open, memory alert resolves |
| Different severities on same scope | warning and critical open together         | Health summary becomes `critical`           |

## 9. Event Contract

### 9.1 Event: `monitoring.alert.opened`

- Trigger condition:
  - a matched rule creates a new alert
- Producer:
  - Monitoring Service
- Consumer:
  - Control-plane integrations, Notification Service, Incident Workflow Service, Audit Service
- Payload fields:
  - `event_id`
  - `event_name`
  - `occurred_at`
  - `alert_id`
  - `rule_id`
  - `scope_type`
  - `scope_id`
  - `severity`
  - `status`
  - `title`
  - `summary`
  - `metric_key`
  - `observed_value`
  - `threshold_value`
- Ordering requirement:
  - for the same `alert_id`, `opened` must be observed before `resolved`
- Duplicate handling:
  - consumers must be able to deduplicate by `event_id`

### 9.2 Event: `monitoring.alert.updated`

- Trigger condition:
  - an existing alert is refreshed and business policy says refresh is publishable
- Producer:
  - Monitoring Service
- Consumer:
  - same as above
- Payload fields:
  - `event_id`
  - `event_name`
  - `occurred_at`
  - `alert_id`
  - `last_seen_at`
  - `observed_value`
  - `occurrence_count` if exposed
- Ordering requirement:
  - for the same `alert_id`, events should preserve chronological order
- Duplicate handling:
  - consumer deduplicates by `event_id`

Decision Required:

- whether `alert.updated` is mandatory for every repeat match

### 9.3 Event: `monitoring.alert.resolved`

- Trigger condition:
  - an active alert transitions to resolved
- Producer:
  - Monitoring Service
- Consumer:
  - same as above
- Payload fields:
  - `event_id`
  - `event_name`
  - `occurred_at`
  - `alert_id`
  - `rule_id`
  - `scope_type`
  - `scope_id`
  - `severity`
  - `resolved_at`
- Ordering requirement:
  - must follow the corresponding `opened` for the same alert
- Duplicate handling:
  - consumer deduplicates by `event_id`

### 9.4 Event: `monitoring.health.changed`

- Trigger condition:
  - derived health summary changes status or severity rollup
- Producer:
  - Monitoring Service
- Consumer:
  - Control Plane API, dashboards, possible workflow and notification consumers
- Payload fields:
  - `event_id`
  - `event_name`
  - `occurred_at`
  - `scope_type`
  - `scope_id`
  - `previous_health_status`
  - `current_health_status`
  - `open_alert_count`
  - `warning_alert_count`
  - `critical_alert_count`
- Ordering requirement:
  - health events for the same scope should reflect committed health transitions in order
- Duplicate handling:
  - consumer deduplicates by `event_id`

## 10. Acceptance Criteria

### 10.1 Functional acceptance

Given:

- an active threshold rule for `node.cpu_usage_pct > 90`

When:

- a snapshot arrives with `node.cpu_usage_pct = 95`

Then:

- one alert is opened for that issue
- one occurrence is recorded according to occurrence policy
- node health becomes degraded according to configured severity

Given:

- the same alert is already open

When:

- another snapshot arrives with `node.cpu_usage_pct = 96`

Then:

- no duplicate alert is created
- the existing alert is refreshed

Given:

- an alert is open for `container.status != running`

When:

- a new snapshot shows `container.status = running`

Then:

- the alert is resolved

### 10.2 Error handling acceptance

Given:

- a malformed snapshot payload is received

When:

- validation fails

Then:

- no rule evaluation occurs
- no alert state changes

Given:

- a capacity-relative rule requires context that is not available

When:

- evaluation reaches that rule

Then:

- the rule is not evaluated using guessed data
- behavior follows the agreed missing-context policy

### 10.3 Data consistency acceptance

Given:

- an alert is opened successfully

When:

- the business transaction completes

Then:

- the persisted alert, occurrence policy result, and health summary are consistent with one another

Given:

- an alert is resolved

When:

- the transaction completes

Then:

- the alert status and the scope health summary no longer contradict each other

### 10.4 Idempotency acceptance

Given:

- the same logical snapshot is delivered more than once

When:

- the system processes the repeated delivery

Then:

- it does not create multiple active alerts for the same fingerprint

Given:

- a repeated violation is processed after an alert is already open

When:

- the system refreshes that issue

Then:

- alert identity remains stable

## 11. Open Questions and Decisions Needed

1. Decision Required:
   Should severity be defined statically by the rule, or can it be recalculated dynamically from observed value bands in Phase 2?

2. Decision Required:
   When a resolved issue appears again, should the service reopen the previous alert or create a brand-new alert?

3. Decision Required:
   If a metric required by a rule is missing in a snapshot, should the system:
   - skip evaluation
   - mark health unknown
   - resolve existing alert
   - create a data-quality alert

4. Decision Required:
   If a capacity-relative rule cannot load required context, should the system:
   - skip the rule
   - degrade health to unknown
   - emit a platform-quality event

5. Decision Required:
   When a rule is deactivated, should open alerts produced by that rule remain open until natural recovery, or resolve immediately?

6. Decision Required:
   Must every alert refresh publish `monitoring.alert.updated`, or only refreshes that materially change business-visible fields?

7. Decision Required:
   Are alert occurrence writes mandatory and atomic with alert updates, or may they be eventually consistent?

8. Decision Required:
   What is the official duplicate-delivery identity for idempotency:
   - upstream event id
   - batch sequence plus scope
   - deterministic snapshot fingerprint

9. Decision Required:
   Is `unknown` health part of Phase 2 business scope, or should health remain derived only from open alerts and ignore data completeness concerns for now?

10. Decision Required:
    Can one rule target multiple topology-selected entities in Phase 2, or must each stored rule be scoped to one `scope_type` and one metric target only?

11. Decision Required:
    Do rack-level health summaries in Phase 2 remain derived read models only, or can any Phase 2 rule directly target `rack`?

12. Decision Required:
    What minimum event ordering guarantee is required for downstream services:
    - per alert
    - per scope
    - best effort only

## 12. Recommended Stakeholder Review Focus

The following points should be explicitly reviewed before implementation starts:

- fingerprint composition
- recurrence policy after resolution
- missing-data behavior
- health status vocabulary
- event publication guarantees
- atomicity expectation between alert, occurrence, and health updates
- rule deactivation effect on already open alerts

These decisions have the highest impact on implementation complexity, QA coverage, and downstream contract stability.
