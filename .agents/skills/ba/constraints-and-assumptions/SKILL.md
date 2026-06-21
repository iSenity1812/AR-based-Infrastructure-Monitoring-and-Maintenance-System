---
name: constraints-and-assumptions
description: Analyze and write the Constraints and Assumptions section for software projects, capstone projects, product documentation, business analysis documents, Vision and Scope documents, or project management documents. Use when the user needs help identifying assumptions, business assumptions, technical constraints, design constraints, implementation constraints, project limitations, validation methods, impact if assumptions are false, or project priorities using the Wiegers project priority matrix.
---

# Constraints and Assumptions Analysis

Use this skill to help write, review, or improve the **Constraints and Assumptions** section of a software project document, especially for capstone projects, academic software projects, business analysis documents, software requirement documents, Vision and Scope documents, and project management documents.

This skill focuses on defining:

- Assumptions
- Business Assumptions
- Technical Assumptions
- Constraints
- Business Constraints
- Technical Constraints
- Design Constraints
- Implementation Constraints
- Legal or Compliance Constraints
- Security Constraints
- Validation Methods
- Impact if Assumptions Are False
- Project Priorities
- Wiegers Project Priority Matrix

## Core Principle

The Constraints and Assumptions section should make project planning conditions explicit.

It should explain what the team currently believes to be true, what limits the team must work within, and how project trade-offs should be handled when changes or problems occur.

A good Constraints and Assumptions section should answer:

1. What assumptions is the project based on?
2. What may happen if an assumption is wrong?
3. How can each assumption be validated?
4. What constraints limit the project team’s choices?
5. Which constraints are related to schedule, cost, technology, security, legal, staffing, or deployment?
6. Which project dimensions are fixed?
7. Which project dimensions drive success?
8. Which project dimensions can be adjusted if needed?

## Assumptions

An assumption is something believed to be true at the time of planning, even though it may not yet be fully verified.

Assumptions are not guaranteed facts. If an assumption turns out to be false, the project scope, design, schedule, or objectives may be affected.

Examples:

```text
Users have basic computer skills.
The organization can provide sample data for testing.
The system only needs to support one branch in the initial release.
The selected third-party API provides a stable sandbox environment.
Stakeholders will be available for requirement review at least once per week.
```

## Constraints

A constraint is a limitation or mandatory condition that restricts the choices available to the project team.

Constraints are usually imposed by the customer, organization, academic environment, budget, technology stack, legal requirements, security standards, or real-world project conditions.

Examples:

```text
The project must be completed within the capstone semester.
The system must be implemented as a web-based application.
The backend must use RESTful APIs.
The database must use PostgreSQL.
The system must support authentication and role-based authorization.
The project must use free-tier or open-source tools.
The system must follow basic OWASP security practices.
```

## Assumptions vs Constraints

Always distinguish assumptions from constraints.

| Aspect              | Assumption                                | Constraint                                |
| ------------------- | ----------------------------------------- | ----------------------------------------- |
| Meaning             | Something believed to be true             | A mandatory limitation or fixed condition |
| Certainty           | May be unverified                         | Usually already decided or imposed        |
| Risk                | If false, the project may need adjustment | The team must work within it              |
| Example             | Users have basic computer skills          | The system must be web-based              |
| Management Approach | Validate and monitor                      | Design and plan around it                 |

Examples:

| Statement                                                        | Type       |
| ---------------------------------------------------------------- | ---------- |
| Users will use modern browsers such as Chrome or Edge.           | Assumption |
| The system only supports Chrome and Edge in the initial release. | Constraint |
| The clinic can provide sample appointment data.                  | Assumption |
| The project must be completed before the final capstone demo.    | Constraint |
| The payment provider has a working sandbox environment.          | Assumption |
| The system must integrate with a specific payment provider.      | Constraint |

## Assumption Register

Always create an Assumption Register table.

Recommended columns:

```markdown
| ID  | Assumption | Category | Impact if False | Validation Method |
| --- | ---------- | -------- | --------------- | ----------------- |
```

Use IDs such as `A01`, `A02`, `A03`.

Recommended categories:

- Business
- User
- Process
- Data
- Technical
- Integration
- Deployment
- Stakeholder
- Academic

Example:

```markdown
| ID  | Assumption                                                                             | Category         | Impact if False                                                             | Validation Method                                        |
| --- | -------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| A01 | Receptionists, doctors, and admins have basic computer skills.                         | User             | The system may require additional onboarding, simpler UI, or user guidance. | Validate through stakeholder interview or user feedback. |
| A02 | The clinic can provide sample data for doctors, patients, schedules, and appointments. | Data             | Testing and demo scenarios may not reflect realistic workflows.             | Request sample data before the testing phase.            |
| A03 | The initial release only needs to support one clinic branch.                           | Business / Scope | Multi-branch data structure, permissions, and reports may need redesign.    | Confirm scope with product owner or supervisor.          |
```

## Constraint Register

Always create a Constraint Register table.

Recommended columns:

```markdown
| ID  | Constraint | Category | Impact on Project |
| --- | ---------- | -------- | ----------------- |
```

Use IDs such as `C01`, `C02`, `C03`.

Recommended categories:

- Schedule
- Cost
- Staff
- Technology
- Security
- Legal / Compliance
- Design
- Implementation
- Deployment
- Academic
- Integration

Example:

```markdown
| ID  | Constraint                                                           | Category   | Impact on Project                                                       |
| --- | -------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| C01 | The project must be completed within the capstone timeline.          | Schedule   | The team must prioritize core features and defer non-essential modules. |
| C02 | The system must be implemented as a web-based application.           | Technology | Mobile-native features are not included in the initial release.         |
| C03 | The system must support authentication and role-based authorization. | Security   | User access must be designed according to defined roles.                |
| C04 | The project should use free-tier or open-source tools.               | Cost       | Paid services such as SMS gateways or premium hosting may be excluded.  |
```

## Common Assumptions for Capstone Software Projects

Consider these assumptions when writing for capstone projects.

### Business or Process Assumptions

```text
The current workflow can be represented as a standard sequence of steps.
Stakeholders agree on the main workflow for the initial release.
The initial release only needs to support the core business process.
```

### User Assumptions

```text
Target users have basic computer or smartphone skills.
Users can access the system through a modern web browser.
Users are willing to use digital forms instead of manual records.
```

### Data Assumptions

```text
Sample data can be provided or generated for testing.
Required data fields can be identified during requirements analysis.
Data volume in the initial release is small enough for standard database design.
```

### Technical Assumptions

```text
The selected technology stack is suitable for the project scope.
The development team can learn and apply the selected framework within the project timeline.
The deployment environment supports the chosen backend, frontend, and database.
```

### Stakeholder Assumptions

```text
Stakeholders or academic supervisors are available for periodic review.
Requirement feedback can be collected before major development milestones.
Product assumptions can be validated through prototype review or demo sessions.
```

## Common Constraints for Capstone Software Projects

Consider these constraints when writing for capstone projects.

### Schedule Constraints

```text
The project must be completed within the capstone semester.
The final demo date cannot be changed.
Major features must be completed before the testing phase.
```

### Cost Constraints

```text
The project should avoid paid third-party services.
The system should use free-tier hosting or open-source tools where possible.
```

### Staff Constraints

```text
The project team size is fixed.
Team members have limited availability due to academic workload.
```

### Technology Constraints

```text
The system must use the approved technology stack.
The backend must expose APIs for frontend integration.
The system must run on a web browser.
```

### Security Constraints

```text
The system must implement authentication and authorization.
Passwords must be stored securely using hashing.
User input must be validated to reduce common web security risks.
```

### Deployment Constraints

```text
The demo must run on a stable local or cloud environment.
Environment variables and deployment steps must be documented.
```

### Academic Constraints

```text
The project must include documentation, demo, testing evidence, and final report.
The implemented features must match the approved capstone scope.
```

## Project Priorities Matrix

Use the Wiegers-style Project Priorities Matrix to classify project dimensions into:

- Constraint
- Driver
- Degree of Freedom

### Constraint

A constraint is a project dimension that is fixed or very difficult to change.

Example:

```text
Schedule is a constraint because the final capstone deadline cannot be changed.
```

### Driver

A driver is a project dimension that is important for project success and should be optimized.

Example:

```text
Quality is a driver because the core workflows must be stable for testing and final demonstration.
```

### Degree of Freedom

A degree of freedom is a project dimension that can be adjusted to handle trade-offs.

Example:

```text
Features are a degree of freedom because non-core features can be deferred to subsequent releases if time is limited.
```

## Project Priority Dimensions

Classify these five dimensions:

- Features
- Quality
- Schedule
- Cost
- Staff

Recommended table:

```markdown
| Project Dimension | Priority Category                       | Explanation   |
| ----------------- | --------------------------------------- | ------------- |
| Features          | Constraint / Driver / Degree of Freedom | [Explanation] |
| Quality           | Constraint / Driver / Degree of Freedom | [Explanation] |
| Schedule          | Constraint / Driver / Degree of Freedom | [Explanation] |
| Cost              | Constraint / Driver / Degree of Freedom | [Explanation] |
| Staff             | Constraint / Driver / Degree of Freedom | [Explanation] |
```

Example for capstone projects:

```markdown
| Project Dimension | Priority Category | Explanation                                                                                               |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| Features          | Degree of Freedom | Non-core features can be deferred to subsequent releases if time is limited.                              |
| Quality           | Driver            | Core workflows must be stable enough for testing, evaluation, and final demonstration.                    |
| Schedule          | Constraint        | The project must be completed before the final capstone deadline.                                         |
| Cost              | Constraint        | The project should avoid paid third-party services and use free-tier or open-source tools where possible. |
| Staff             | Constraint        | The project team size is fixed during the capstone period.                                                |
```

## Trade-Off Rules

Use the Project Priorities Matrix to define decision rules.

Examples:

```text
If schedule pressure increases, reduce or defer non-core features instead of moving the final deadline.
```

```text
If development time is limited, prioritize stability of core workflows over advanced features.
```

```text
If paid services are required for a feature, move that feature to a future release or replace it with a free alternative.
```

```text
If team capacity is reduced, focus on authentication, core workflow, and basic reporting before optional modules.
```

## Recommended Output Structure

When the user asks to write this section, use the following structure:

```markdown
## 5. Constraints and Assumptions

### 5.1 Assumptions

| ID  | Assumption   | Category   | Impact if False | Validation Method   |
| --- | ------------ | ---------- | --------------- | ------------------- |
| A01 | [Assumption] | [Category] | [Impact]        | [Validation method] |

### 5.2 Constraints

| ID  | Constraint   | Category   | Impact on Project |
| --- | ------------ | ---------- | ----------------- |
| C01 | [Constraint] | [Category] | [Impact]          |

### 5.3 Project Priorities

| Project Dimension | Priority Category                     | Explanation   |
| ----------------- | ------------------------------------- | ------------- |
| Features          | [Constraint/Driver/Degree of Freedom] | [Explanation] |
| Quality           | [Constraint/Driver/Degree of Freedom] | [Explanation] |
| Schedule          | [Constraint/Driver/Degree of Freedom] | [Explanation] |
| Cost              | [Constraint/Driver/Degree of Freedom] | [Explanation] |
| Staff             | [Constraint/Driver/Degree of Freedom] | [Explanation] |

### 5.4 Trade-Off Rules

- [Rule 1]
- [Rule 2]
- [Rule 3]
```

## Writing Guidelines

Write in a clear, formal, and practical academic style.

For capstone projects:

- Keep assumptions realistic and verifiable.
- Do not treat assumptions as guaranteed facts.
- Include the impact if each assumption is false.
- Include a validation method for each assumption.
- Keep constraints specific and project-relevant.
- Include constraints related to schedule, cost, staff, technology, security, deployment, and academic requirements.
- Use the project priorities matrix to support trade-off decisions.
- Mark schedule, cost, and staff as constraints when they are fixed.
- Mark features as a degree of freedom if optional features can be deferred.
- Mark quality as a driver when stable core workflows are important for demo and evaluation.
- Avoid vague assumptions such as “everything will work well”.
- Avoid vague constraints such as “the project has limited resources” without explaining the impact.

## Good Assumption Examples

```text
The initial release only needs to support one clinic branch.
```

```text
Stakeholders can review requirements and prototype updates at least once per week.
```

```text
Sample data for users, schedules, and transactions can be provided or generated before testing.
```

```text
Target users have basic computer skills and can use a modern web browser.
```

## Bad Assumption Examples

Avoid:

```text
The system will be successful.
```

```text
Users will like the system.
```

```text
There will be no technical problems.
```

```text
All features will be completed on time.
```

These are weak because they are vague, optimistic, and not useful for planning.

## Good Constraint Examples

```text
The project must be completed within the capstone semester.
```

```text
The system must be implemented as a web-based application.
```

```text
The project must use free-tier or open-source tools where possible.
```

```text
The system must implement authentication and role-based authorization.
```

```text
The final demo must run in a stable local or cloud environment.
```

## Bad Constraint Examples

Avoid:

```text
The project has constraints.
```

```text
The system should be good.
```

```text
The team has limited time.
```

```text
The application should be modern.
```

These are weak because they are too vague and do not explain what is actually limited or required.

## Review Checklist

When reviewing a Constraints and Assumptions section, check:

- Are assumptions separated from constraints?
- Are assumptions written as unverified but believed conditions?
- Does each assumption include the impact if false?
- Does each assumption include a validation method?
- Are constraints specific and actionable?
- Are schedule, cost, staff, technology, security, deployment, and academic constraints considered?
- Is the project priorities matrix included?
- Are Features, Quality, Schedule, Cost, and Staff classified?
- Do the priority categories support practical trade-off decisions?
- Are vague optimistic statements avoided?
- Are assumptions and constraints realistic for the project scope?
- Are assumptions connected to risks where appropriate?
- Are constraints consistent with the Business Scope and Release Roadmap?

## Interaction Rules

When the user provides a project idea, identify:

- Product name
- Domain
- Initial release scope
- Target users
- Current workflow assumptions
- Data assumptions
- Stakeholder assumptions
- Technology constraints
- Schedule constraints
- Cost constraints
- Staff constraints
- Security constraints
- Deployment constraints
- Academic constraints
- Project priority trade-offs

If information is missing, make reasonable assumptions and clearly mark them as assumptions.

Do not ask too many questions before drafting. For capstone projects, produce a useful first draft based on the available information.

## Default Response Behavior

When asked to create the Constraints and Assumptions section:

1. Briefly summarize the assumed project context.
2. Create an Assumption Register with impact if false and validation method.
3. Create a Constraint Register with category and project impact.
4. Create a Project Priorities Matrix.
5. Add trade-off rules based on the priority matrix.
6. Keep the content realistic for capstone evaluation.
7. Mark assumptions clearly when project information is incomplete.

## Example Output

```markdown
## 5. Constraints and Assumptions

### 5.1 Assumptions

| ID  | Assumption                                                                                                         | Category         | Impact if False                                                               | Validation Method                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A01 | The clinic has a stable internet connection during working hours.                                                  | Deployment       | Users may not be able to access the system reliably.                          | Confirm with clinic representative or test deployment environment. |
| A02 | Receptionists, doctors, and admins have basic computer skills.                                                     | User             | The system may require additional onboarding, simpler UI, or user guidance.   | Validate through stakeholder interview or user feedback.           |
| A03 | The clinic can provide sample data for doctors, patients, schedules, and appointments.                             | Data             | Testing and demo scenarios may not reflect realistic workflows.               | Request sample data before the testing phase.                      |
| A04 | The initial release only needs to support a single clinic branch.                                                  | Business / Scope | Multi-branch data structure, role permissions, and reports may need redesign. | Confirm scope with product owner or supervisor.                    |
| A05 | Appointment booking follows a standard workflow: request, check availability, confirm, update or cancel if needed. | Process          | Workflow design may not match real clinic operations.                         | Review workflow with receptionist or clinic representative.        |

### 5.2 Constraints

| ID  | Constraint                                                                                                   | Category   | Impact on Project                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| C01 | The project must be completed within the capstone timeline.                                                  | Schedule   | The team must prioritize core features and defer non-essential modules.                           |
| C02 | The system must be implemented as a web-based application.                                                   | Technology | Mobile-native features are not included in the initial release.                                   |
| C03 | The system must support authentication and role-based authorization.                                         | Security   | User access must be designed according to roles such as admin, doctor, receptionist, and patient. |
| C04 | The project should use free-tier or open-source tools.                                                       | Cost       | Paid services such as SMS gateways or premium hosting may be excluded.                            |
| C05 | The system must follow basic web security practices, including input validation and secure password storage. | Security   | Development must include security-related validation and authentication controls.                 |
| C06 | The final demo must run on a stable local or cloud environment.                                              | Deployment | Deployment configuration and demo data must be prepared before final evaluation.                  |

### 5.3 Project Priorities

| Project Dimension | Priority Category | Explanation                                                                                                                           |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Features          | Degree of Freedom | Non-core features such as online payment, SMS notification, and advanced analytics can be deferred to subsequent releases.            |
| Quality           | Driver            | Core workflows such as login, appointment booking, schedule checking, and appointment management must be stable for demo and testing. |
| Schedule          | Constraint        | The project must be completed before the final capstone deadline.                                                                     |
| Cost              | Constraint        | The project should avoid paid third-party services and use free-tier or open-source tools where possible.                             |
| Staff             | Constraint        | The project team size is fixed during the capstone period.                                                                            |

### 5.4 Trade-Off Rules

- If schedule pressure increases, non-core features should be deferred instead of extending the final deadline.
- If development time is limited, the team should prioritize stability of core workflows over advanced features.
- If a feature requires paid third-party services, it should be moved to a future release or replaced with a free alternative.
- If team capacity is reduced, the team should focus on authentication, core workflow, and basic reporting before optional modules.
```
