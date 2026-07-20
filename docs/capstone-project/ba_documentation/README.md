# Business Analysis Documentation

**Project:** AR-Based Infrastructure Monitoring and Maintenance System

**Document Type:** Capstone Business Analysis

**Last Updated:** 2026-06-21

---

## Overview

This directory contains the complete business analysis documentation for the AR-Based Infrastructure Monitoring and Maintenance System capstone project. The documentation follows a structured approach covering business vision, problem statement, stakeholder analysis, scope definition, constraints, assumptions, and risk management.

The system is designed as a centralized monitoring and maintenance platform for a simulated data center environment. It connects infrastructure status monitoring, alert handling, incident management, and AR-assisted maintenance inspection into a single coherent workflow.

---

## Document Index

### 1. Business Requirements

| #   | Document             | Description                                                                   | Path                                                                                               |
| --- | -------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1.1 | Vision & Objectives  | Product vision, business objectives, and success metrics                      | [01_business_requirements/vision_objectives.md](./01_business_requirements/vision_objectives.md)   |
| 1.2 | Problem Statement    | Background, current situation, business problem, and opportunity              | [01_business_requirements/problem_statement.md](./01_business_requirements/problem_statement.md)   |
| 1.3 | Scope & Capabilities | System scope, context diagram, feature tree, release roadmap, and limitations | [01_business_requirements/scope_capabilities.md](./01_business_requirements/scope_capabilities.md) |

### 2. Stakeholders

| #   | Document             | Description                                               | Path                                                                                 |
| --- | -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2.1 | Stakeholder Register | Stakeholder groups, user classes, personas, and hierarchy | [02_stakeholders/stakeholder_register.md](./02_stakeholders/stakeholder_register.md) |

### 3. Context, Constraints & Risks

| #   | Document                  | Description                                                       | Path                                                                                                                         |
| --- | ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Constraints & Assumptions | Project constraints, assumptions, priorities, and trade-off rules | [03_context_constraints_risks/constraints_and_assumptions.md](./03_context_constraints_risks/constraints_and_assumptions.md) |
| 3.2 | Risks & Issues            | Risk register with assessment methodology and issue log           | [03_context_constraints_risks/risks_and_issues.md](./03_context_constraints_risks/risks_and_issues.md)                       |

---

## Quick Reference

### Key Stakeholders

| Stakeholder            | Role                         | Influence |
| ---------------------- | ---------------------------- | --------- |
| Project Team           | Builder / Deliverer          | High      |
| Capstone Supervisor    | Academic Reviewer            | High      |
| System Administrator   | Primary User                 | High      |
| Monitoring Operator    | Primary User (Favored Class) | High      |
| Maintenance Technician | Primary User                 | High      |

### Core User Personas

| Persona | Role                   | Key Need                                               |
| ------- | ---------------------- | ------------------------------------------------------ |
| Minh    | Monitoring Operator    | Fast alert review, clear incident status, easy handoff |
| Lan     | Maintenance Technician | Correct asset identification, contextual information   |
| Huy     | System Administrator   | Role-based access control, audit and traceability      |

### Release Scope Summary

| Capability                       | Initial Release |
| -------------------------------- | :-------------: |
| Authentication & Role Management |       Yes       |
| Asset Registry & Details         |       Yes       |
| Marker-to-Asset Mapping          |       Yes       |
| Status & History View            |       Yes       |
| Alert Review & Tracking          |       Yes       |
| Incident Creation & Review       |       Yes       |
| Ticket Assignment & Tracking     |       Yes       |
| Inspection Result Submission     |       Yes       |
| Operational Activity Logs        |       Yes       |
| Basic Operational Summary        |       Yes       |
| Scenario Execution               |       Yes       |
| Fault Injection                  |       Yes       |
| Extended Reporting Dashboard     |     Future      |
| Advanced Filtering & Analytics   |     Future      |
| Multi-Site Support               |     Future      |

### Top Risks

| ID  | Risk                                                    | Level  | Exposure |
| --- | ------------------------------------------------------- | ------ | -------- |
| R01 | Delayed stakeholder review causing requirement mismatch | Medium | 4.2      |
| R02 | Scope creep preventing core workflow completion         | Medium | 4.5      |
| R03 | Unclear roles causing inconsistent access logic         | Medium | 4.0      |
| R04 | Insufficient sample data for demonstration              | Medium | 3.6      |
| R05 | Schedule overrun compressing testing & documentation    | Medium | 4.0      |
| R06 | Late defect detection due to missing test cases         | Medium | 4.2      |
| R07 | Demo environment instability during presentation        | Medium | 3.2      |

---

## Document Relationships

```
Vision & Objectives ──defines──> Problem Statement ──drives──> Scope & Capabilities
                                            │
                                            ▼
                               Stakeholder Register
                                            │
                                            ▼
                            Constraints & Assumptions
                                            │
                                            ▼
                                Risks & Issues
```

---

## How to Use This Documentation

1. **Start with** [Vision & Objectives](./01_business_requirements/vision_objectives.md) to understand the product direction and success criteria.
2. **Read** [Problem Statement](./01_business_requirements/problem_statement.md) to understand the business problem being solved.
3. **Review** [Scope & Capabilities](./01_business_requirements/scope_capabilities.md) for the feature tree, context diagram, and release roadmap.
4. **Consult** [Stakeholder Register](./02_stakeholders/stakeholder_register.md) for user classes, personas, and stakeholder concerns.
5. **Check** [Constraints & Assumptions](./03_context_constraints_risks/constraints_and_assumptions.md) for project boundaries and trade-off rules.
6. **Monitor** [Risks & Issues](./03_context_constraints_risks/risks_and_issues.md) throughout the project lifecycle.
