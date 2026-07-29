## Problem Statement

Technicians need the incident detail API to show a complete operational record without mixing source facts with interpretation or advice. The current incident response can expose useful monitoring, asset, metric, and impact context, but the design discussion identified a risk: response fields such as recommended actions or diagnosis explanations can imply causes that are not guaranteed by the raw data. For incident detail, the API should tell the truth by returning facts derived from known sources only.

## Solution

Define `GET /incidents/:id` as a source-facts incident detail contract. The response should show incident identity, current state, factual summary, source facts, captured evidence, contributing alerts, linked tickets, links, source references, and related incidents. It should not return `recommendedActions` by default, and it should not invent explanations that are not directly supported by alert metadata, captured snapshots, metric evidence, asset context, or workflow state.

The response remains human-readable, but every field must be traceable to one of the available source records: incident fields, monitoring alert metadata, captured snapshot context, metric evidence, asset lookup context, ticket links, or source references.

Recommended public response shape:

```json
{
  "data": {
    "id": "6a63caa30e85275d27f5c13c",
    "incidentCode": "MON-ALERT-0D9858DF1B92383B5EB9AF99DADB4F1C",
    "title": "[rack] RackCritical: Rack 6a5792c1ea8de69105cf48dd severity code 3 is critical",
    "state": {
      "status": "OPEN",
      "severity": "CRITICAL",
      "createdAt": "2026-07-24T20:27:15.171Z",
      "updatedAt": "2026-07-24T20:27:15.202Z",
      "resolvedAt": null,
      "closedAt": null
    },
    "summary": {
      "whatHappened": "Rack 6a5792c1ea8de69105cf48dd is in a critical rack state. Severity code=3, bad nodes=1/1, critical nodes=1, silent dead nodes=0.",
      "scope": {
        "type": "rack",
        "id": "6a5792c1ea8de69105cf48dd"
      },
      "urgency": "wake_now"
    },
    "sourceFacts": {
      "alert": {
        "fingerprint": "4f5dbb3e878fdc1a",
        "name": "RackCritical",
        "severity": "critical",
        "category": "availability",
        "environment": "lab",
        "team": "infra",
        "startedAt": "2026-07-24T20:27:00Z",
        "lastReceivedAt": "2026-07-24T20:27:15.073Z"
      },
      "trigger": {
        "metricKey": "rack_severity_code",
        "currentValue": 3,
        "threshold": 3,
        "unit": "severity-code",
        "observedWindow": "current-snapshot"
      },
      "asset": {
        "rackId": "6a5792c1ea8de69105cf48dd",
        "rackCode": "rack-rack-test-01",
        "displayName": "RACk-TEST-01",
        "siteCode": "MY-HOME",
        "roomCode": "ROOM-01",
        "vendor": "MY-HOME"
      },
      "impact": {
        "affectedNodeCount": 1,
        "totalNodeCount": 1,
        "affectedRatio": 1
      }
    },
    "evidence": {
      "type": "creation_snapshot",
      "capturedAt": "2026-07-24T20:27:15.083Z",
      "window": {
        "from": "2026-07-24T20:27:00.000Z",
        "to": "2026-07-24T20:27:15.083Z",
        "interval": "1m"
      },
      "completeness": "complete",
      "metrics": [
        {
          "metricKey": "rack_severity_code",
          "label": "Rack Severity Code",
          "value": 3,
          "unit": "severity-code"
        },
        {
          "metricKey": "bad_nodes",
          "label": "Bad Nodes",
          "value": 1,
          "unit": "count"
        }
      ],
      "unavailableSources": []
    },
    "alerts": [
      {
        "fingerprint": "4f5dbb3e878fdc1a",
        "name": "RackCritical",
        "severity": "critical",
        "status": "firing",
        "role": "primary",
        "startedAt": "2026-07-24T20:27:00Z",
        "lastReceivedAt": "2026-07-24T20:27:15.073Z"
      }
    ],
    "tickets": [
      {
        "id": "6a63caa30e85275d27f5c13d"
      }
    ],
    "links": {
      "dashboardUrl": "/d/monitoring-overview",
      "runbookUrl": "/docs/runbooks/alerting/rack-critical"
    },
    "sourceRefs": [
      {
        "system": "asset-service",
        "dataset": "racks",
        "observedAt": "2026-07-24T20:27:15.083Z"
      },
      {
        "system": "clickhouse",
        "dataset": "rack_current_summary",
        "observedAt": "2026-07-24 20:27:12"
      },
      {
        "system": "clickhouse",
        "dataset": "v_rack_summary_history",
        "observedAt": "2026-07-24 20:27:12"
      }
    ],
    "relatedIncidents": []
  },
  "meta": {
    "version": "v1",
    "correlationId": "req-123"
  }
}
```

## User Stories

1. As a technician, I want incident detail to show only source-derived facts, so that I can trust the response during operations.
2. As a technician, I want to see what the monitoring source observed, so that I understand why the incident record exists.
3. As a technician, I want to see the alert fingerprint and alert name, so that I can correlate the incident with monitoring systems.
4. As a technician, I want to see alert severity separately from incident severity, so that I know which facts came from monitoring and which state belongs to the incident.
5. As a technician, I want to see the metric key, value, threshold, unit, and observed window, so that I can verify the trigger condition.
6. As a technician, I want to see the affected asset context, so that I know which rack, node, workload, service, site, or room is involved.
7. As a technician, I want to see impact counts, so that I can understand the known blast radius without reading raw labels.
8. As a technician, I want to see the captured evidence timestamp and window, so that I know whether values are creation-time facts or current facts.
9. As a technician, I want unavailable sources listed, so that I know when a detail page is incomplete.
10. As a technician, I want linked tickets visible, so that I can move from incident context into workflow.
11. As a technician, I want dashboard and runbook links visible, so that I can open source systems and documentation myself.
12. As a technician, I want related incidents visible, so that repeated or neighboring incidents are discoverable.
13. As a backend engineer, I want the API to avoid recommended actions by default, so that the contract does not present policy advice as source truth.
14. As a backend engineer, I want the API to avoid inferred diagnosis explanations, so that it does not claim unproven causes.
15. As a backend engineer, I want source references preserved, so that each detail field can be traced back to the source system.
16. As an API consumer, I want a stable detail DTO, so that UI code does not depend on raw metadata bags.
17. As an auditor, I want timestamps for alert, snapshot, and source observations, so that incident history can be reconstructed later.
18. As a product owner, I want source facts separated from future recommendations, so that future advisory features can be added deliberately and labeled clearly.

## Implementation Decisions

- `GET /incidents/:id` should return a source-facts detail DTO instead of exposing the current raw incident entity shape.
- The response should keep the existing global `data` and `meta` envelope behavior.
- The response should include incident identity, state, factual summary, source facts, evidence, alerts, tickets, links, source references, and related incidents.
- The response should not include `recommendedActions`.
- The response should not include `diagnosis.explanation` or any field that turns raw monitoring facts into an unproven cause.
- Human-readable summary fields are allowed only when derived directly from existing alert summary, description, scope, or snapshot facts.
- `evidence.type` should identify whether values are from `creation_snapshot`, current state, or historical evidence. For this slice, the existing captured snapshot maps to `creation_snapshot`.
- Each metric evidence item should preserve metric key, label, value, unit, and observed timestamp when available.
- Alerts should be represented as an array, even if the current implementation only has one primary alert, so the contract can later support correlated incidents without a breaking shape change.
- Related incidents should remain summaries, not full nested detail records.
- Raw labels, raw annotations, and full captured snapshot may be added later behind explicit debug behavior, but should not be part of the default detail contract.

## Testing Decisions

- The highest useful test seam is incident controller detail behavior.
- Tests should verify the externally observable response shape of `GET /incidents/:id`.
- Tests should assert that source-derived facts are present for alert, trigger, asset, impact, evidence, tickets, links, source references, and related incidents.
- Tests should assert that `recommendedActions` is not returned.
- Tests should assert that interpretation-only fields are not returned unless backed by source facts.
- Tests should preserve current create and list behavior while changing detail response behavior.
- A TypeScript build should pass after DTO and presenter changes.

## Out of Scope

- Implementing recommended action generation.
- Returning runbook-derived instructions in the default detail response.
- Building root-cause analysis.
- Adding AI interpretation.
- Adding multi-alert persistence or correlation logic.
- Changing incident creation deduplication.
- Changing the incident lifecycle enum to exactly three states.
- Adding postmortem timeline storage.
- Adding debug mode for raw labels, raw annotations, or full captured snapshots.
- Changing `GET /incidents` list behavior already covered by the compact list summary spec.

## Further Notes

The guiding rule is: if the API cannot point to a source, it should not present the value as a fact. Future advisory or diagnosis features can still exist, but they should be separate from the source-of-truth incident detail contract and clearly labeled as policy, operator note, or inferred analysis.
