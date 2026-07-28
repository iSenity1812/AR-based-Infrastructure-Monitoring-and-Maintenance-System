## 6. Risks and Issues

### 6.1 Risk and Issue Definition

A risk is an uncertain event that has not happened yet but may negatively affect the project if it occurs. An issue is a problem that has already happened or is currently happening and requires corrective action.

Risks are managed through mitigation and contingency plans. Issues are managed through immediate corrective actions and follow-up monitoring.

### 6.2 Risk Assessment Method

Risk exposure is calculated using the following formula:

Risk Exposure = Probability × Impact

- Probability is rated from 0.1 to 1.0.
- Impact is rated from 1 to 10.
- Risk level is classified as:
  - Low: 0.1 - 2.9
  - Medium: 3.0 - 5.9
  - High: 6.0 - 10.0

### 6.3 Risk Register

| ID  | Risk Statement                                                                                                                                                                              | Category    | Probability | Impact | Exposure | Level  | Mitigation                                                                                            | Contingency                                                                                          | Owner                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------: | -----: | -------: | ------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ |
| R01 | If stakeholders do not review and confirm the remaining requirements on time, then the team may continue implementation based on assumptions and increase the risk of requirement mismatch. | Requirement |         0.6 |      7 |      4.2 | Medium | Hold regular review checkpoints and keep the scope documents concise and traceable.                   | Use documented assumptions, freeze the confirmed scope, and defer unclear items to later releases.   | BA / Team Lead           |
| R02 | If too many advanced capabilities are kept in the initial release, then the team may not complete the core workflow before the capstone deadline.                                           | Scope       |         0.5 |      9 |      4.5 | Medium | Keep the initial release focused on the core monitoring, alert handling, and inspection workflow.     | Move non-core capabilities to a later release and prioritize the end-to-end demo flow.               | Project Lead             |
| R03 | If user roles and workflow responsibilities are not clarified early, then access rules and handoff logic may become inconsistent across the project.                                        | Requirement |         0.5 |      8 |      4.0 | Medium | Define role responsibilities, usage patterns, and favored user class before detailed design.          | Simplify the role structure for the first release and align the workflow around the core users.      | BA / Team Lead           |
| R04 | If the team does not prepare enough realistic sample data for assets, alerts, incidents, and inspection records, then the main workflows may not be demonstrated properly.                  | Data        |         0.6 |      6 |      3.6 | Medium | Prepare sample records early for each core workflow and validate them against the business scenarios. | Create minimum demo data manually and limit the demo to the prepared scenarios.                      | QA / Developer           |
| R05 | If the core workflows take longer than expected to complete, then testing and documentation may be compressed near the final submission date.                                               | Schedule    |         0.5 |      8 |      4.0 | Medium | Track progress against the release roadmap and protect time for testing and documentation.            | Defer low-priority features and reduce the scope of optional enhancements.                           | Project Lead             |
| R06 | If test cases are not prepared alongside the requirements, then defects may remain undetected before the final demo.                                                                        | Testing     |         0.6 |      7 |      4.2 | Medium | Derive test cases from the confirmed business requirements and update them as the scope changes.      | Perform focused manual verification of the core workflow and remove unstable features from the demo. | QA                       |
| R07 | If the project environment is not prepared early enough for the final presentation, then the demo may become unstable or fail during execution.                                             | Deployment  |         0.4 |      8 |      3.2 | Medium | Prepare the presentation setup and execution checklist before the final review stage.                 | Use a backup demo plan with prevalidated data and a simplified presentation flow.                    | Project Lead / Presenter |

### 6.4 Issue Log

At the time of writing, no active issue has been identified. The project team should continue monitoring the scope, requirements, data preparation, and demo readiness during development and testing.

| ID  | Issue                                              | Impact             | Corrective Action                                                                        | Owner        | Due Date | Status     |
| --- | -------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- | ------------ | -------- | ---------- |
| I01 | No active issue has been identified at this stage. | No current impact. | Continue monitoring during development, testing, and preparation for final presentation. | Project Lead | N/A      | Monitoring |
