# 01 — Implement source-facts incident detail contract

**What to build:** Implement `GET /incidents/:id` as a source-of-truth incident detail response that gives technicians a complete factual operational record without adding recommendations, inferred diagnosis, or unproven cause interpretation. The response should expose incident identity, state, factual summary, source facts, captured evidence, contributing alerts, linked tickets, links, source references, and related incident summaries. Every field in the default response should be traceable to incident fields, monitoring alert metadata, captured snapshot context, metric evidence, asset context, ticket links, or source references.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `GET /incidents/:id` returns a dedicated detail DTO rather than the raw full incident entity shape.
- [ ] The detail response includes incident identity, state, factual summary, source facts, evidence, alerts, tickets, links, source references, and related incidents.
- [ ] The response keeps the existing API envelope behavior with `data` and `meta`.
- [ ] The response does not include `recommendedActions`.
- [ ] The response does not include inferred diagnosis fields or unproven explanation text.
- [ ] Summary text is derived only from existing alert summary, alert description, incident description, scope, or captured snapshot facts.
- [ ] Evidence identifies whether metric values come from a creation snapshot, current state, or historical evidence; existing captured snapshots map to `creation_snapshot`.
- [ ] Metric evidence preserves metric key, label, value, unit, and observed timestamp when available.
- [ ] Alerts are represented as an array, even when only one primary alert exists today.
- [ ] Related incidents remain compact summaries and are not expanded into nested full detail records.
- [ ] Raw labels, raw annotations, and full captured snapshots are not returned in the default detail contract.
- [ ] Controller-level tests verify the externally observable detail response shape.
- [ ] Tests verify source-derived alert, trigger, asset, impact, evidence, ticket, link, source reference, and related incident facts.
- [ ] Tests verify `recommendedActions`, raw debug fields, and interpretation-only fields are absent from the default response.
- [ ] TypeScript build passes for the incident workflow service.
