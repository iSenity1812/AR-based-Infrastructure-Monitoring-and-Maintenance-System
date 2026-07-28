---
name: risks-and-issues
description: Analyze and write the Risks and Issues section for software projects, capstone projects, product documentation, business analysis documents, or project management documents. Use when the user needs help identifying risks, issues, risk statements, risk exposure, probability, impact, mitigation plans, contingency plans, issue logs, corrective actions, or project risk management during requirements analysis.
---

# Risks and Issues Analysis

Use this skill to help write, review, or improve the **Risks and Issues** section of a software project document, especially for capstone projects, academic software projects, business analysis documents, software requirement documents, and project management documents.

This skill focuses on defining:

- Risks
- Issues
- Risk Statements
- Condition-Consequence Format
- Risk Probability
- Risk Impact
- Risk Exposure
- Risk Level
- Mitigation Plans
- Contingency Plans
- Issue Logs
- Corrective Actions
- Risk Owners
- Issue Owners

## Core Principle

The Risks and Issues section should show that the project team understands possible threats to project success and has a plan to prevent, reduce, or respond to them.

For software capstone projects, this section should focus on realistic risks such as unclear requirements, scope creep, technical complexity, schedule delay, lack of test data, team availability, integration difficulty, and deployment problems.

A good Risks and Issues section should answer:

1. What uncertain events may negatively affect the project?
2. What problems are already happening?
3. How likely is each risk?
4. How severe would the impact be?
5. Which risks should be prioritized?
6. How can each risk be reduced before it happens?
7. What should the team do if the risk becomes real?
8. Who is responsible for monitoring or handling each risk or issue?

## Risk vs Issue

Always distinguish between **Risk** and **Issue**.

### Risk

A risk is an uncertain event that has not happened yet but may negatively affect the project if it occurs.

Risk statements should be written in Condition-Consequence format:

```text
If [condition happens], then [negative consequence may occur].
```

Example:

```text
If stakeholders cannot review requirements on time, then the team may continue development based on assumptions and increase the risk of requirement mismatch.
```

### Issue

An issue is a problem that has already happened or is currently happening and requires corrective action.

Issue statements should describe the current problem directly:

```text
Currently, [problem is happening], causing [impact]. The corrective action is [action].
```

Example:

```text
Currently, the login API is unstable, causing frontend testing to be blocked. The backend team will fix token validation and update the API documentation.
```

## Condition-Consequence Risk Statement

Write each risk using the following pattern:

```text
If [condition], then [consequence].
```

The condition should describe what may happen.

The consequence should describe the negative impact on scope, schedule, cost, quality, requirements, testing, deployment, or user acceptance.

Good examples:

```text
If the initial release scope includes too many advanced features, then the team may not complete the core workflow before the demo deadline.
```

```text
If authentication and role-based access take longer than expected, then dependent modules may be delayed.
```

```text
If the team does not prepare enough test data, then main workflows may not be tested properly before the final demo.
```

Bad examples:

```text
There is a deadline risk.
```

```text
The system may have bugs.
```

```text
The team may fail.
```

These are weak because they are vague and do not clearly describe the condition and consequence.

## Risk Assessment Method

Use quantitative scoring to prioritize risks.

Formula:

```text
Risk Exposure = Probability × Impact
```

Where:

- Probability is rated from `0.1` to `1.0`.
- Impact is rated from `1` to `10`.
- Risk Exposure is the calculated risk score.

Recommended risk level classification:

```text
Low: 0.1 - 2.9
Medium: 3.0 - 5.9
High: 6.0 - 10.0
```

Example:

```text
Probability = 0.6
Impact = 8
Risk Exposure = 0.6 × 8 = 4.8
Risk Level = Medium
```

## Mitigation vs Contingency

Always distinguish between **Mitigation** and **Contingency**.

### Mitigation

Mitigation is the action taken before the risk happens to reduce the probability or reduce the expected impact.

Examples:

```text
Schedule regular requirement review sessions.
Define the initial release scope before development starts.
Prepare sample data early.
Implement authentication and role-based access before dependent modules.
Use a release roadmap to move non-core features to future releases.
```

### Contingency

Contingency is the fallback plan used if the risk actually occurs and becomes an issue.

Examples:

```text
Use documented assumptions if stakeholder feedback is delayed.
Defer low-priority modules and focus on the core workflow.
Use a simplified role model for the initial release.
Manually prepare minimum demo data before testing.
Reassign critical tasks to another team member.
```

## Common Risk Categories for Capstone Software Projects

Consider the following categories when identifying risks.

### Requirement Risks

Examples:

```text
If requirements are not reviewed by stakeholders on time, then the team may implement features based on incorrect assumptions.
```

```text
If user roles and permissions are not clearly defined, then access control may be inconsistent across modules.
```

### Scope Risks

Examples:

```text
If too many advanced features are added to the initial release, then the project may exceed the available timeline.
```

```text
If future-release features are not separated from initial-release features, then the team may experience scope creep.
```

### Schedule Risks

Examples:

```text
If core modules take longer than estimated, then testing and documentation may be compressed near the deadline.
```

```text
If task dependencies are not managed clearly, then frontend and backend integration may be delayed.
```

### Technical Risks

Examples:

```text
If the team is unfamiliar with the selected framework, then development speed and code quality may be affected.
```

```text
If third-party integration is more complex than expected, then related features may be delayed or removed from the initial release.
```

### Data Risks

Examples:

```text
If sample data is incomplete or unrealistic, then the team may not properly test important user workflows.
```

```text
If data validation rules are not defined early, then forms may accept invalid or inconsistent data.
```

### Testing Risks

Examples:

```text
If test cases are not prepared before the final phase, then defects may remain undetected before the demo.
```

```text
If user acceptance testing is skipped, then the system may not match user expectations.
```

### Team Risks

Examples:

```text
If a key team member becomes unavailable near the deadline, then assigned tasks may be delayed.
```

```text
If task ownership is unclear, then important requirements may be missed or duplicated.
```

### Deployment Risks

Examples:

```text
If the deployment environment is not prepared early, then final demo setup may fail or become unstable.
```

```text
If environment variables and database configuration are not documented, then other team members may not be able to run the system.
```

## Risk Register

Always create a Risk Register table.

Recommended columns:

```markdown
| ID  | Risk Statement | Category | Probability | Impact | Exposure | Level | Mitigation | Contingency | Owner |
| --- | -------------- | -------- | ----------: | -----: | -------: | ----- | ---------- | ----------- | ----- |
```

Guidelines:

- Use IDs such as `R01`, `R02`, `R03`.
- Write the risk statement in Condition-Consequence format.
- Assign a category such as Requirement, Scope, Schedule, Technical, Data, Testing, Team, or Deployment.
- Calculate Exposure using Probability × Impact.
- Assign Low, Medium, or High level.
- Provide both mitigation and contingency.
- Assign an owner such as BA, Project Manager, Team Lead, Backend Lead, Frontend Lead, QA, or DevOps.

Example:

```markdown
| ID  | Risk Statement                                                                                                                                                 | Category    | Probability | Impact | Exposure | Level  | Mitigation                                                                 | Contingency                                                                                | Owner           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------: | -----: | -------: | ------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------- |
| R01 | If stakeholders cannot review requirements on time, then the team may continue development based on assumptions and increase the risk of requirement mismatch. | Requirement |         0.6 |      7 |      4.2 | Medium | Schedule regular review sessions and keep requirement documents concise.   | Use documented assumptions and mark uncertain requirements for later confirmation.         | BA / Team Lead  |
| R02 | If the initial release scope includes too many advanced features, then the team may not complete the core workflow before the demo deadline.                   | Scope       |         0.5 |      9 |      4.5 | Medium | Use release roadmap and move non-core features to future releases.         | Prioritize authentication, core workflow, and basic reporting; defer low-priority modules. | Project Manager |
| R03 | If authentication and role-based access take longer than expected, then dependent modules may be delayed.                                                      | Technical   |         0.6 |      8 |      4.8 | Medium | Design user roles early and implement authentication before other modules. | Use a simplified role model for the initial release if necessary.                          | Backend Lead    |
```

## Issue Log

Always include an Issue Log.

If no issue exists yet, state that no active issue has been identified and keep the table ready for future updates.

Recommended columns:

```markdown
| ID  | Issue | Impact | Corrective Action | Owner | Due Date | Status |
| --- | ----- | ------ | ----------------- | ----- | -------- | ------ |
```

Status examples:

- Open
- In Progress
- Resolved
- Closed
- Monitoring

Example when there is an active issue:

```markdown
| ID  | Issue                                                                                                           | Impact                                                      | Corrective Action                                                                  | Owner        | Due Date | Status |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ | -------- | ------ |
| I01 | The login API is currently unstable and prevents the frontend team from completing authentication flow testing. | Frontend testing is blocked for login and role-based pages. | Fix token validation, update API documentation, and provide a stable test account. | Backend Lead | Week 6   | Open   |
```

Example when there is no active issue:

```markdown
| ID  | Issue                                              | Impact             | Corrective Action                                   | Owner           | Due Date | Status     |
| --- | -------------------------------------------------- | ------------------ | --------------------------------------------------- | --------------- | -------- | ---------- |
| I01 | No active issue has been identified at this stage. | No current impact. | Continue monitoring during development and testing. | Project Manager | N/A      | Monitoring |
```

## Recommended Output Structure

When the user asks to write this section, use the following structure:

```markdown
## 6. Risks and Issues

### 6.1 Risk and Issue Definition

[Explain the difference between risk and issue.]

### 6.2 Risk Assessment Method

Risk Exposure = Probability × Impact

- Probability: 0.1 to 1.0
- Impact: 1 to 10
- Exposure Level:
  - Low: 0.1 - 2.9
  - Medium: 3.0 - 5.9
  - High: 6.0 - 10.0

### 6.3 Risk Register

| ID  | Risk Statement | Category | Probability | Impact | Exposure | Level | Mitigation | Contingency | Owner |
| --- | -------------- | -------- | ----------: | -----: | -------: | ----- | ---------- | ----------- | ----- |

### 6.4 Issue Log

| ID  | Issue | Impact | Corrective Action | Owner | Due Date | Status |
| --- | ----- | ------ | ----------------- | ----- | -------- | ------ |
```

## Writing Guidelines

Write in a clear, formal, and practical academic style.

For capstone projects:

- Keep risks realistic and project-specific.
- Do not write only generic risks such as “lack of time” or “bugs may occur”.
- Write risks using the Condition-Consequence format.
- Include both mitigation and contingency for each risk.
- Use quantitative scoring for probability, impact, and exposure.
- Prioritize risks that affect requirements, scope, schedule, testing, demo readiness, and core workflows.
- Separate risks from issues clearly.
- If no active issues exist, still include an issue log with a monitoring entry.
- Assign owners to risks and issues.
- Avoid overcomplicating the table with too many low-value risks.
- Prefer 5 to 8 important risks for a capstone document.

## Good Risk Statements

```text
If stakeholders cannot review requirements on time, then the team may implement features based on incorrect assumptions.
```

```text
If user roles and permissions are not clearly defined early, then access control may become inconsistent across modules.
```

```text
If core modules take longer than estimated, then testing and documentation may be compressed near the deadline.
```

```text
If the deployment environment is not prepared early, then the final demo setup may fail or become unstable.
```

## Bad Risk Statements

Avoid:

```text
Deadline risk.
```

```text
Technical risk.
```

```text
The system may have errors.
```

```text
The project is hard.
```

```text
The team may not finish.
```

These are weak because they are vague, not measurable, and do not clearly describe a condition and consequence.

## Review Checklist

When reviewing a Risks and Issues section, check:

- Are risks and issues clearly separated?
- Are risks written in Condition-Consequence format?
- Are issues written as current problems?
- Does each risk have a probability score?
- Does each risk have an impact score?
- Is Risk Exposure calculated correctly?
- Is the risk level assigned based on exposure?
- Does each risk have a mitigation plan?
- Does each risk have a contingency plan?
- Does each risk have an owner?
- Does the Issue Log include corrective actions and owners?
- Are the risks realistic for a software capstone project?
- Are requirement, scope, technical, testing, schedule, data, team, and deployment risks considered?
- Are vague risks replaced with specific project threats?
- Are high-exposure risks prioritized?

## Interaction Rules

When the user provides a project idea, identify:

- Product name
- Domain
- Initial release scope
- Core workflows
- Key stakeholders
- Requirement risks
- Scope risks
- Technical risks
- Schedule risks
- Data risks
- Testing risks
- Team risks
- Deployment risks
- Current issues, if any
- Risk owners

If information is missing, make reasonable assumptions and clearly mark them as assumptions.

Do not ask too many questions before drafting. For capstone projects, produce a useful first draft based on the available information.

## Default Response Behavior

When asked to create the Risks and Issues section:

1. Briefly summarize the assumed project context.
2. Explain the risk and issue distinction.
3. Define the risk assessment method.
4. Create a Risk Register with 5 to 8 realistic risks.
5. Calculate probability, impact, exposure, and level.
6. Provide mitigation and contingency for each risk.
7. Create an Issue Log.
8. If no active issue is provided, include a monitoring entry.
9. Keep the content realistic for capstone evaluation.

## Example Output

```markdown
## 6. Risks and Issues

### 6.1 Risk and Issue Definition

A risk is an uncertain event that has not happened yet but may negatively affect the project if it occurs. An issue is a problem that has already happened or is currently happening and requires corrective action.

Risks are managed through mitigation and contingency plans, while issues are managed through immediate corrective actions.

### 6.2 Risk Assessment Method

Risk exposure is calculated using the following formula:

Risk Exposure = Probability × Impact

- Probability is rated from 0.1 to 1.0.
- Impact is rated from 1 to 10.
- Risk level is classified as:
  - Low: 0.1 - 2.9
  - Medium: 3.0 - 5.9
  - High: 6.0 - 10.0.

### 6.3 Risk Register

| ID  | Risk Statement                                                                                                                                                 | Category       | Probability | Impact | Exposure | Level  | Mitigation                                                                         | Contingency                                                                                | Owner              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------: | -----: | -------: | ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ |
| R01 | If stakeholders cannot review requirements on time, then the team may continue development based on assumptions and increase the risk of requirement mismatch. | Requirement    |         0.6 |      7 |      4.2 | Medium | Schedule regular review sessions and keep requirement documents concise.           | Use documented assumptions and mark uncertain requirements for later confirmation.         | BA / Team Lead     |
| R02 | If the initial release scope includes too many advanced features, then the team may not complete the core workflow before the demo deadline.                   | Scope          |         0.5 |      9 |      4.5 | Medium | Use release roadmap and move non-core features to future releases.                 | Prioritize authentication, core workflow, and basic reporting; defer low-priority modules. | Project Manager    |
| R03 | If authentication and role-based access take longer than expected, then dependent modules may be delayed.                                                      | Technical      |         0.6 |      8 |      4.8 | Medium | Design user roles early and implement authentication before other modules.         | Use a simplified role model for the initial release if necessary.                          | Backend Lead       |
| R04 | If the team does not prepare enough test data, then main workflows may not be tested properly before the final demo.                                           | Data / Testing |         0.5 |      6 |      3.0 | Medium | Prepare sample data for users, roles, and core transactions during development.    | Manually create minimum demo data before testing and presentation.                         | QA / Developer     |
| R05 | If a key team member becomes unavailable near the deadline, then assigned tasks may be delayed.                                                                | Team           |         0.3 |      8 |      2.4 | Low    | Share task knowledge and maintain updated documentation.                           | Reassign critical tasks to another member and reduce non-essential scope.                  | Team Lead          |
| R06 | If the deployment environment is not prepared early, then the final demo setup may fail or become unstable.                                                    | Deployment     |         0.4 |      8 |      3.2 | Medium | Prepare deployment configuration and environment variables before the final phase. | Use a local demo environment or backup deployment if production deployment fails.          | DevOps / Developer |

### 6.4 Issue Log

| ID  | Issue                                              | Impact             | Corrective Action                                   | Owner           | Due Date | Status     |
| --- | -------------------------------------------------- | ------------------ | --------------------------------------------------- | --------------- | -------- | ---------- |
| I01 | No active issue has been identified at this stage. | No current impact. | Continue monitoring during development and testing. | Project Manager | N/A      | Monitoring |
```
