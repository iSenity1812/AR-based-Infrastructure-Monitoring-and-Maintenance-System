## 3. Stakeholders Register

### 3.1 Stakeholder Overview

Assumption: Since no formal organization chart is provided, stakeholder groups are inferred from the documented capstone scope and a typical simulated infrastructure operations environment.

The AR-Based Infrastructure Monitoring and Maintenance System involves both direct users and indirect stakeholders. The direct users are the people who interact with the system to monitor infrastructure, handle alerts, manage incidents, and perform maintenance inspection. The indirect stakeholders are the people who define, review, support, or are affected by the system’s workflow, traceability, and operational outputs.

The most important stakeholder groups in this project are the system administrator, monitoring operator, maintenance technician, capstone supervisor, and academic evaluator. External data-producing systems and notification recipients are also relevant because they influence how the platform receives operational context and how workflow updates are delivered.

### 3.2 Stakeholder Register

| Stakeholder / Group                               | Category             | Role in Project                                                                   | Influence Level | Main Concerns                                                                      |
| ------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| Project Team                                      | Customer             | Builds and delivers the capstone project within the academic timeline.            | High            | Feasible scope, clear requirements, and successful demonstration.                  |
| Capstone Supervisor                               | Academic Stakeholder | Reviews scope, progress, documentation, and final output.                         | High            | Requirement clarity, realism, completeness, and academic quality.                  |
| Academic Evaluator                                | Academic Stakeholder | Assesses the project outcome, presentation, and documentation.                    | High            | Whether the project demonstrates a coherent business problem, scope, and solution. |
| System Administrator                              | Primary User         | Manages access, asset context, workflow oversight, and operational configuration. | High            | Control, consistency, traceability, and manageable administration.                 |
| Monitoring Operator                               | Primary User         | Reviews alerts, opens incidents, assigns tickets, and follows workflow progress.  | High            | Fast triage, clear status visibility, and low manual effort.                       |
| Maintenance Technician                            | Primary User         | Reviews asset context, performs inspection, and submits results.                  | High            | Accurate asset identification, clear instructions, and easy result submission.     |
| Data Center Operations Lead (Not now merge to MO) | Manager              | Represents the operational viewpoint and cares about process visibility.          | Medium          | Monitoring quality, handling progress, and operational accountability.             |
| Future Field Support Staff (not now)              | Secondary User       | May use the system later for expanded maintenance-related tasks.                  | Low             | Simple inspection flow and easy access to relevant context.                        |
| Operational Notification Recipients               | Support Stakeholder  | Receive workflow updates and handling notifications.                              | Medium          | Timely and understandable updates about incidents or inspection outcomes.          |
| Telemetry Collector                               | External System      | Provides operational status information for the monitoring workflow.              | Medium          | Reliable data intake and clear handling of sent information.                       |
| Simulation Producer                               | External System      | Generates simulated events for scenario testing and demonstration.                | Medium          | Controlled scenario execution and predictable workflow response.                   |
| Operational Notification Channels                 | External System      | Deliver operational messages to relevant stakeholders.                            | Low             | Clear delivery, timely updates, and consistent notification content.               |

### 3.3 Stakeholder Hierarchy

| Level       | Description                                                                               | Examples in This Project                                                                    |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Stakeholder | Any person, group, or system that affects, uses, supports, or is impacted by the project. | Project team, supervisor, evaluator, users, external data sources, notification recipients. |
| Customer    | The group that owns, requests, funds, or receives the main value of the project.          | Project team and capstone supervisor acting as the delivery and approval context.           |
| User        | A person who directly interacts with the system.                                          | System administrator, monitoring operator, maintenance technician.                          |
| User Class  | A group of users with similar goals, responsibilities, or usage patterns.                 | Administrator user, monitoring operator user, maintenance technician user.                  |

### 3.4 User Classes

| User Class                      | Description                                                                              | Frequency of Use | Skill Level | Key Needs                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- | ----------- | --------------------------------------------------------------------------------------- |
| System Administrator            | Oversees access, operational setup, and workflow control.                                | Medium           | Medium-High | Access control, configuration oversight, traceability, and system-wide visibility.      |
| Monitoring Operator             | Handles daily alert review, incident opening, ticket assignment, and workflow follow-up. | High             | Medium      | Fast status review, clear alert handling, and easy workflow coordination.               |
| Maintenance Technician          | Performs inspection tasks and submits results after reviewing asset context.             | High             | Medium      | Correct asset identification, contextual information, and simple inspection submission. |
| Data Center Operations Lead     | Reviews operational progress and handling visibility.                                    | Low-Medium       | Medium      | Summary views, progress visibility, and accountability information.                     |
| Capstone Supervisor / Evaluator | Reviews project scope, completeness, and presentation quality.                           | Low              | High        | Clear documentation, realistic scope, and consistent workflow coverage.                 |

### 3.5 Favored User Class

The favored user class for the initial release is **Monitoring Operator**, because this role is most closely tied to the core operational workflow of the system: reviewing alerts, opening incidents, assigning tickets, and coordinating the handoff to maintenance. Prioritizing this user class helps ensure that the first release solves the most frequent and business-critical operational need in the project.

### 3.6 Personas

#### Persona 1: Minh — Monitoring Operator

- Role: Reviews alerts, coordinates incident handling, and assigns tickets.
- Technical Skill: Medium.
- Frequency of Use: High.
- Goals:
  - Identify urgent issues quickly.
  - Open and track incidents without losing context.
  - Hand work over to maintenance with clear instructions.
- Pain Points:
  - Alert and incident information is often fragmented.
  - It is difficult to follow handling status consistently.
  - Manual coordination takes time when multiple issues happen at once.
- Key System Needs:
  - Fast alert review.
  - Clear incident and ticket status.
  - Easy workflow handoff to maintenance.

#### Persona 2: Lan — Maintenance Technician

- Role: Inspects the affected asset and submits follow-up results.
- Technical Skill: Medium.
- Frequency of Use: High.
- Goals:
  - Confirm the correct asset before inspection.
  - Understand the current operational context.
  - Submit inspection results quickly and accurately.
- Pain Points:
  - Asset context may be incomplete when received.
  - Inspection instructions may not be easy to follow.
  - Results can be difficult to trace after submission.
- Key System Needs:
  - Correct asset identification.
  - Related operational information in one place.
  - Simple inspection result submission.

#### Persona 3: Huy — System Administrator

- Role: Manages access, oversight, and operational setup.
- Technical Skill: Medium-High.
- Frequency of Use: Medium.
- Goals:
  - Keep user access under control.
  - Maintain consistent asset context.
  - Review workflow traceability when needed.
- Pain Points:
  - Operational information may be difficult to audit if it is scattered.
  - Manual coordination can make oversight harder.
  - Misalignment between roles can create confusion.
- Key System Needs:
  - Role-based access control.
  - Structured management views.
  - Audit and traceability support.
