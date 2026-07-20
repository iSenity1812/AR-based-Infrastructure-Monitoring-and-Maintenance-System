## 5. Constraints and Assumptions

### 5.1 Assumptions

| ID | Assumption | Category | Impact if False | Validation Method |
| --- | --- | --- | --- | --- |
| A01 | The initial release only needs to support a simulated data center environment with a bounded set of assets, alerts, incidents, and inspection scenarios. | Business / Scope | The project scope may expand beyond what can be completed and demonstrated within the capstone timeline. | Confirm the release scope with the supervisor and keep the scope document aligned with the approved project boundary. |
| A02 | Stakeholders can review the main requirements, scope, and workflow decisions during the project when feedback is needed. | Stakeholder | The team may continue based on assumptions and risk building a workflow that does not match stakeholder expectations. | Schedule periodic review checkpoints and collect written confirmation on key decisions. |
| A03 | The project team can prepare representative sample data for assets, alerts, incidents, tickets, and inspection records before testing and final demonstration. | Data | Testing and demo scenarios may not reflect realistic operational behavior, reducing the credibility of the final presentation. | Prepare sample scenarios early and validate them against the approved workflow. |
| A04 | The core operational workflow can be represented as a clear sequence from monitoring to alert handling to incident and inspection follow-up. | Process | The documentation and system scope may become ambiguous, making it harder to define features and acceptance criteria. | Review the workflow with the project supervisor and align the process description with the problem statement. |
| A05 | Users in the target roles can understand the system flow with minimal orientation because the workflow reflects a common operational pattern. | User | Additional explanation or support material may be needed, increasing preparation effort for the demo. | Validate the workflow with sample users or team members and adjust documentation and guidance as needed. |
| A06 | The project team can keep the first release focused on the core operational path rather than trying to cover every possible maintenance scenario. | Academic / Scope | Optional capabilities may crowd out the main workflow and weaken the final capstone outcome. | Freeze the initial release scope and classify optional items as future enhancements or exclusions. |

### 5.2 Constraints

| ID | Constraint | Category | Impact on Project |
| --- | --- | --- | --- |
| C01 | The project must be completed within the capstone semester and final submission schedule. | Schedule | The team must prioritize the core workflow and avoid late expansion of the scope. |
| C02 | The first release must remain focused on the core monitoring, alert handling, incident, ticket, and inspection workflow. | Academic / Scope | Non-core capabilities must be postponed if they do not support the main business objective. |
| C03 | The system must remain within a simulated data center context rather than attempting to cover a full enterprise operating environment. | Business / Scope | The project should avoid broad operational claims and keep the use cases bounded and demonstrable. |
| C04 | The documentation, demo flow, and evaluation evidence must be sufficient for academic review. | Academic | The team must allocate time for documentation quality, walkthrough clarity, and demo readiness. |
| C05 | The team size and available working time are fixed during the capstone period. | Staff | Tasks must be assigned realistically, and low-priority work may need to be deferred. |
| C06 | The project should keep external dependencies and non-essential integrations outside the initial release boundary. | Scope | The first version should avoid adding workflow complexity that is not needed for the main capstone objective. |
| C07 | The project must preserve operational traceability for key actions such as alert handling, incident updates, and inspection results. | Quality / Academic | The team must ensure that workflow history is understandable and reviewable in the final deliverables. |
| C08 | The initial release should provide a manageable reporting scope that supports the core workflow rather than broad analytical coverage. | Scope | Reporting must stay focused on what is needed for demonstration and acceptance. |

### 5.3 Project Priorities

| Project Dimension | Priority Category | Explanation |
| --- | --- | --- |
| Features | Degree of Freedom | Non-core features can be deferred if needed, as long as the main monitoring-to-inspection workflow remains complete. |
| Quality | Driver | The core workflow must be clear, traceable, and stable enough for review, testing, and final demonstration. |
| Schedule | Constraint | The capstone deadline is fixed, so the project must be planned around available submission milestones. |
| Cost | Constraint | The project should remain within the limits of an academic capstone and avoid unnecessary expense. |
| Staff | Constraint | The team size and availability are fixed, so the workload must be distributed around realistic capacity. |

### 5.4 Trade-Off Rules

- If schedule pressure increases, reduce the number of optional capabilities instead of expanding the timeline.
- If the team cannot complete every planned item, prioritize the end-to-end operational workflow over extended reporting or additional enhancements.
- If an assumption about stakeholder availability or sample data turns out to be false, use the confirmed scope and minimum demo scenario to keep the project moving.
- If documentation or demo preparation starts to fall behind, protect time for the core workflow, final review, and presentation readiness first.
- If a requested feature does not directly support the business problem or core capstone objective, move it to a future release or exclude it from the current scope.

