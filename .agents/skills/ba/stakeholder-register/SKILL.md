---
name: stakeholders-register
description: Analyze and write the Stakeholders Register section for software projects, capstone projects, product documentation, business analysis documents, or Vision and Scope documents. Use when the user needs help identifying stakeholders, customers, users, user classes, favored user classes, stakeholder influence, stakeholder concerns, personas, org-chart-based stakeholder discovery, or the voice of the user.
---

# Stakeholders Register Analysis

Use this skill to help write, review, or improve the **Stakeholders Register** section of a software project document, especially for capstone projects, academic software projects, product proposals, business analysis documents, and Vision and Scope documents.

This skill focuses on defining:

- Stakeholders
- Customers
- Users
- User Classes
- Favored User Class
- Stakeholder Influence
- Stakeholder Concerns
- Personas
- Voice of the User
- Direct and Indirect Stakeholders
- Org-Chart-Based Stakeholder Discovery

## Core Principle

The Stakeholders Register should identify all people, groups, departments, organizations, or systems that affect the project, use the system, receive value from it, approve it, maintain it, or are impacted by its data and operation.

Do not limit stakeholders to only direct system users.

A good stakeholder analysis should answer:

1. Who uses the system directly?
2. Who receives value from the system?
3. Who approves, funds, supervises, or evaluates the project?
4. Who maintains or supports the system?
5. Who depends on the data produced by the system?
6. Who may be affected by legal, privacy, security, accounting, or operational concerns?
7. Which user classes have different goals, permissions, skills, or usage frequency?
8. Which user class should be prioritized when requirements conflict?

## Stakeholder Discovery: Cast a Wide Net

Use the “cast a wide net” principle when identifying stakeholders.

Look beyond the obvious users and consider:

- Primary users
- Secondary users
- Customers or sponsors
- Administrators
- Managers
- Operators
- Support teams
- IT or system maintainers
- Legal and compliance roles
- Accounting or finance roles
- Tax or audit roles
- External partners
- Third-party systems
- Academic supervisors or evaluators for capstone projects

Missing a stakeholder can cause missing requirements later.

Examples:

| Project Type               | Often Missed Stakeholders                                |
| -------------------------- | -------------------------------------------------------- |
| Clinic booking system      | Legal/compliance, clinic manager, IT support, accounting |
| E-commerce system          | Warehouse, delivery staff, accounting, customer support  |
| Capstone management system | Academic admin, committee members, supervisors, students |
| Inventory system           | Warehouse staff, purchasing team, accounting, auditors   |
| Learning management system | Instructors, students, academic admin, content reviewers |

## Stakeholder Hierarchy

Distinguish between Stakeholder, Customer, User, and User Class.

### Stakeholder

A stakeholder is any person, group, department, organization, or system that is involved in, affected by, or has influence over the project.

Examples:

```text
Clinic owner, receptionist, doctor, patient, admin, IT support, legal/compliance, capstone supervisor
```

### Customer

A customer is the person or organization that requests, funds, owns, approves, or receives the main business value from the product.

Examples:

```text
Clinic owner, company manager, academic department, product owner, capstone supervisor
```

For capstone projects, the customer may be a real stakeholder, a simulated product owner, or the academic evaluator depending on the project context.

### User

A user is someone who directly interacts with the system.

Examples:

```text
Patient, receptionist, doctor, admin, student, supervisor, warehouse staff
```

### User Class

A user class is a group of users who share similar goals, permissions, workflows, skill levels, or usage patterns.

Examples:

```text
Receptionist user, doctor user, patient user, admin user, manager user
```

## User Class Classification Criteria

Classify users by:

- Permissions and access rights
- Frequency of use
- Technical skill level
- Business goals
- Workflow responsibility
- Data needs
- Decision-making authority
- Risk or compliance sensitivity
- Priority in the initial release

Example table:

| User Class   | Description                                      | Frequency of Use | Skill Level | Key Needs                                             |
| ------------ | ------------------------------------------------ | ---------------- | ----------- | ----------------------------------------------------- |
| Receptionist | Handles appointment booking and schedule updates | High             | Medium      | Fast booking, schedule checking, appointment updates  |
| Doctor       | Views own schedule and appointment details       | Medium           | Medium      | Accurate schedule and patient appointment information |
| Patient      | Books appointments and checks status             | Occasional       | Low-Medium  | Simple booking flow and clear appointment status      |
| Admin        | Manages users, configuration, and reports        | Medium           | Medium-High | Access control, data management, reports              |

## Favored User Class

The Favored User Class is the user class that receives priority when requirements conflict.

Choose the favored user class based on:

- The core workflow of the system
- The main business objective
- The highest operational impact
- The most frequent usage
- The main value proposition of the initial release
- The project’s evaluation focus

Examples:

| Project                     | Possible Favored User Class | Reason                                                |
| --------------------------- | --------------------------- | ----------------------------------------------------- |
| Clinic booking system       | Receptionist                | Handles the main booking workflow daily               |
| Patient self-booking system | Patient                     | Main value is convenient self-service booking         |
| Capstone management system  | Student or Supervisor       | Core workflow depends on submissions and feedback     |
| Inventory management system | Warehouse Staff             | Main process is stock movement and inventory updates  |
| Learning management system  | Student or Instructor       | Core value depends on learning and teaching workflows |

Template:

```markdown
### Favored User Class

The favored user class for the initial release is **[User Class]**, because [reason connected to core workflow, business objective, or usage frequency]. When requirements conflict, decisions should prioritize this user class while still considering the needs and constraints of other stakeholders.
```

## Stakeholder Register Table

Always create a Stakeholder Register table.

Recommended columns:

```markdown
| Stakeholder / Group | Category | Role in Project | Influence Level | Main Concerns |
| ------------------- | -------- | --------------- | --------------- | ------------- |
```

Use these categories:

- Customer
- Primary User
- Secondary User
- Administrator
- Manager
- Support Stakeholder
- Compliance Stakeholder
- External Partner
- Academic Stakeholder
- External System

Influence level:

- High
- Medium
- Low

Guidelines:

- Use **High** for decision makers, primary users, sponsors, evaluators, or roles critical to acceptance.
- Use **Medium** for supporting roles, indirect users, or stakeholders affected by the system.
- Use **Low** for peripheral stakeholders or systems with limited influence.

Example:

```markdown
| Stakeholder / Group    | Category               | Role in Project                                        | Influence Level | Main Concerns                                             |
| ---------------------- | ---------------------- | ------------------------------------------------------ | --------------- | --------------------------------------------------------- |
| Clinic Owner / Manager | Customer               | Decision maker and business owner                      | High            | Operational efficiency, appointment visibility, reporting |
| Receptionist           | Primary User           | Handles daily appointment booking and schedule updates | High            | Fast booking, schedule checking, appointment changes      |
| Doctor                 | Primary User           | Views personal schedule and appointment details        | High            | Accurate schedule and patient appointment information     |
| Patient                | Primary User           | Books appointments and views appointment status        | Medium          | Simple booking flow and clear appointment status          |
| Admin                  | Administrator          | Manages users, data, and access control                | High            | User management, permissions, data consistency            |
| IT Support             | Support Stakeholder    | Supports deployment and maintenance                    | Medium          | Reliability, backup, maintainability                      |
| Legal/Compliance       | Compliance Stakeholder | Reviews privacy and data access concerns               | Medium          | Patient data privacy and access control                   |
| Capstone Supervisor    | Academic Stakeholder   | Reviews and evaluates the project                      | High            | Feasibility, documentation quality, requirement clarity   |
```

## Personas

A persona is a representative fictional profile for a user class. Use personas to make user needs, goals, and pain points easier to understand.

For capstone projects, personas should be short and practical.

Recommended persona fields:

```markdown
#### Persona: [Name] — [User Class]

- Role:
- Technical Skill:
- Frequency of Use:
- Goals:
- Pain Points:
- Key System Needs:
```

Example:

```markdown
#### Persona: Ms. Lan — Receptionist

- Role: Handles daily appointment booking and schedule coordination.
- Technical Skill: Medium.
- Frequency of Use: Daily.
- Goals:
  - Create appointments quickly.
  - Check doctor availability before confirming bookings.
  - Update or cancel appointments when patients request changes.
- Pain Points:
  - Current booking records are scattered across paper notes or spreadsheets.
  - It is difficult to check schedule conflicts quickly.
  - Appointment updates may not be visible to doctors immediately.
- Key System Needs:
  - Fast appointment creation.
  - Schedule availability checking.
  - Search and filter appointment records.
```

## Org-Chart-Based Discovery

When an organization chart is available, use it to identify both direct and indirect stakeholders.

Look for departments or roles related to:

- Operations
- Management
- Sales
- Customer support
- Accounting
- Finance
- Tax
- Legal
- Compliance
- IT
- Security
- Data governance
- External vendors
- Internal administrators

If no org chart is available, infer likely stakeholders based on the project domain and clearly mark assumptions.

Example:

```text
Assumption: Since no formal organization chart is provided, stakeholder groups are inferred from a typical small clinic environment.
```

## Recommended Output Structure

When the user asks to write this section, use the following structure:

```markdown
## 3. Stakeholders Register

### 3.1 Stakeholder Overview

[Summarize direct and indirect stakeholder groups.]

### 3.2 Stakeholder Register

| Stakeholder / Group | Category   | Role in Project | Influence Level   | Main Concerns |
| ------------------- | ---------- | --------------- | ----------------- | ------------- |
| [Stakeholder]       | [Category] | [Role]          | [High/Medium/Low] | [Concerns]    |

### 3.3 Stakeholder Hierarchy

| Level       | Description  | Examples in This Project |
| ----------- | ------------ | ------------------------ |
| Stakeholder | [Definition] | [Examples]               |
| Customer    | [Definition] | [Examples]               |
| User        | [Definition] | [Examples]               |
| User Class  | [Definition] | [Examples]               |

### 3.4 User Classes

| User Class   | Description   | Frequency of Use             | Skill Level       | Key Needs |
| ------------ | ------------- | ---------------------------- | ----------------- | --------- |
| [User Class] | [Description] | [High/Medium/Low/Occasional] | [Low/Medium/High] | [Needs]   |

### 3.5 Favored User Class

[Identify the favored user class and explain why.]

### 3.6 Personas

#### Persona 1: [Name] — [User Class]

- Role:
- Technical Skill:
- Frequency of Use:
- Goals:
- Pain Points:
- Key System Needs:
```

## Writing Guidelines

Write in a clear, formal, and practical academic style.

For capstone projects:

- Do not list only “Admin” and “User”.
- Include both direct and indirect stakeholders.
- Include academic stakeholders when relevant.
- Clearly distinguish stakeholders from users.
- Classify user classes by behavior and needs, not only by login role.
- Choose a favored user class based on the initial release’s core workflow.
- Keep personas short, realistic, and connected to requirements.
- Avoid overcomplicating personas with unnecessary personal details.
- Make sure stakeholder concerns can lead to requirements later.
- Do not invent overly specific company departments unless the domain supports them.

## Good Stakeholder Statements

```text
The system involves both direct users, such as receptionists, doctors, patients, and administrators, and indirect stakeholders, such as clinic managers, IT support, and compliance-related roles.
```

```text
The receptionist is selected as the favored user class for the initial release because this role handles the most frequent and operationally critical appointment booking tasks.
```

```text
Legal and compliance stakeholders are included because the system stores patient-related information and must consider access control and data privacy.
```

## Bad Stakeholder Statements

Avoid:

```text
The stakeholders are Admin and User.
```

```text
Only customers are stakeholders.
```

```text
The system has one type of user.
```

```text
All users have the same needs.
```

```text
The favored user class is everyone.
```

These are weak because they ignore stakeholder diversity and make requirements less precise.

## Review Checklist

When reviewing a Stakeholders Register section, check:

- Are direct users identified?
- Are indirect stakeholders identified?
- Are customers or decision makers identified?
- Are support, legal, compliance, accounting, or IT roles considered where relevant?
- Are academic stakeholders included for capstone projects?
- Is the difference between stakeholder, customer, user, and user class clear?
- Are user classes based on meaningful differences?
- Are influence levels assigned?
- Are main concerns documented?
- Is a favored user class selected?
- Is the favored user class justified?
- Are personas included for important user classes?
- Are personas connected to real goals, pain points, and system needs?
- Is the section more specific than simply “Admin and User”?

## Interaction Rules

When the user provides a project idea, identify:

- Product name
- Domain
- Organization or context
- Direct users
- Indirect stakeholders
- Customer or sponsor
- Academic evaluator, if capstone
- User classes
- Favored user class
- Stakeholder concerns
- Persona candidates

If information is missing, make reasonable assumptions and clearly mark them as assumptions.

Do not ask too many questions before drafting. For capstone projects, produce a useful first draft based on the available information.

## Default Response Behavior

When asked to create the Stakeholders Register section:

1. Briefly summarize the assumed project context.
2. Identify direct and indirect stakeholders.
3. Create a Stakeholder Register table.
4. Distinguish Stakeholder, Customer, User, and User Class.
5. Create a User Classes table.
6. Select and justify a Favored User Class.
7. Provide short personas for the most important user classes.
8. Keep the content realistic for capstone evaluation.
9. Mention assumptions if stakeholder information is incomplete.

## Example Output

```markdown
## 3. Stakeholders Register

### 3.1 Stakeholder Overview

The Clinic Booking System involves several stakeholder groups, including direct users who interact with the system daily and indirect stakeholders who are affected by system data, operations, or compliance requirements. The main direct users are receptionists, doctors, patients, and administrators. Indirect stakeholders include clinic managers, IT support, and compliance-related roles.

### 3.2 Stakeholder Register

| Stakeholder / Group    | Category               | Role in Project                                        | Influence Level | Main Concerns                                             |
| ---------------------- | ---------------------- | ------------------------------------------------------ | --------------- | --------------------------------------------------------- |
| Clinic Owner / Manager | Customer               | Decision maker and business owner                      | High            | Operational efficiency, appointment visibility, reporting |
| Receptionist           | Primary User           | Handles daily appointment booking and schedule updates | High            | Fast booking, schedule checking, appointment changes      |
| Doctor                 | Primary User           | Views personal schedule and appointment details        | High            | Accurate schedule and patient appointment information     |
| Patient                | Primary User           | Books appointments and views appointment status        | Medium          | Simple booking flow and clear appointment status          |
| Admin                  | Administrator          | Manages users, data, and access control                | High            | User management, permissions, data consistency            |
| IT Support             | Support Stakeholder    | Supports deployment and maintenance                    | Medium          | Reliability, backup, maintainability                      |
| Legal/Compliance       | Compliance Stakeholder | Reviews privacy and data access concerns               | Medium          | Patient data privacy and access control                   |
| Capstone Supervisor    | Academic Stakeholder   | Reviews and evaluates the project                      | High            | Feasibility, documentation quality, requirement clarity   |

### 3.3 Stakeholder Hierarchy

| Level       | Description                                                         | Examples in This Project                                            |
| ----------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Stakeholder | Any group affected by or influencing the project                    | Clinic owner, receptionist, doctor, patient, IT support, supervisor |
| Customer    | Person or organization that owns, requests, or approves the product | Clinic owner / manager                                              |
| User        | Person who directly interacts with the system                       | Receptionist, doctor, patient, admin                                |
| User Class  | Group of users with similar goals, permissions, or usage patterns   | Receptionist user, doctor user, patient user, admin user            |

### 3.4 User Classes

| User Class   | Description                                      | Frequency of Use | Skill Level | Key Needs                                               |
| ------------ | ------------------------------------------------ | ---------------- | ----------- | ------------------------------------------------------- |
| Receptionist | Handles appointment booking and schedule updates | High             | Medium      | Create, update, cancel, and search appointments quickly |
| Doctor       | Views own schedule and appointment details       | Medium           | Medium      | View accurate appointment schedule                      |
| Patient      | Books appointments and checks status             | Occasional       | Low-Medium  | Simple booking flow and clear appointment status        |
| Admin        | Manages users, doctors, schedules, and reports   | Medium           | Medium-High | Access control and data management                      |
| Manager      | Reviews clinic operation summaries               | Low-Medium       | Medium      | Dashboard and basic reports                             |

### 3.5 Favored User Class

The favored user class for the initial release is **Receptionist**, because receptionists are responsible for the main operational workflow of appointment booking, schedule checking, appointment updates, and conflict handling. Prioritizing this user class helps ensure that the system addresses the most frequent and operationally critical tasks in the clinic.

### 3.6 Personas

#### Persona 1: Ms. Lan — Receptionist

- Role: Handles daily appointment booking and schedule coordination.
- Technical Skill: Medium.
- Frequency of Use: Daily.
- Goals:
  - Create appointments quickly.
  - Check doctor availability.
  - Update or cancel appointments when patients request changes.
- Pain Points:
  - Current booking records are scattered across paper notes or spreadsheets.
  - It is difficult to check schedule conflicts quickly.
  - Appointment updates may not be visible to doctors immediately.
- Key System Needs:
  - Fast appointment creation.
  - Schedule availability checking.
  - Appointment search and filtering.

#### Persona 2: Dr. Minh — Doctor

- Role: Reviews daily appointment schedule and patient booking details.
- Technical Skill: Medium.
- Frequency of Use: Several times per week.
- Goals:
  - View personal appointment schedule.
  - Know upcoming patients and appointment times.
  - Receive accurate schedule updates.
- Pain Points:
  - Needs to ask receptionists for updated schedules.
  - Schedule changes may not be communicated immediately.
- Key System Needs:
  - Personal schedule view.
  - Appointment detail view.
  - Updated booking information.

#### Persona 3: Ms. Hoa — Patient

- Role: Books appointments and checks appointment status.
- Technical Skill: Low to Medium.
- Frequency of Use: Occasional.
- Goals:
  - Book an appointment easily.
  - Know appointment date, time, and doctor.
  - Cancel or update appointment when needed.
- Pain Points:
  - Booking by phone may take time.
  - Appointment confirmation may not be clearly tracked.
- Key System Needs:
  - Simple appointment booking flow.
  - Clear appointment status.
  - Appointment history.
```
