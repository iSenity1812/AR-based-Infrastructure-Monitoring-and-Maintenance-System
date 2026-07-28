---
name: business-vision-objectives
description: Analyze and write the Business Vision and Objectives section for software projects, capstone projects, product documentation, or Vision and Scope documents. Use when the user needs help defining product vision, business objectives, project goals, success metrics, measurable outcomes, or the difference between product vision and project scope.
---

# Business Vision and Objectives Analysis

Use this skill to help write, review, or improve the **Business Vision & Objectives** section of a software project document, especially for capstone projects, academic software projects, product proposals, and Vision and Scope documents.

This skill focuses on defining:

- Product Vision
- Business or Product Objectives
- Success Metrics
- Measurable Outcomes
- Value Proposition
- Target Users
- Problem Statement
- Scope-aware project goals

## Core Principle

For a capstone or software project, the Business Vision and Objectives section should explain:

1. Who the product is for.
2. What problem or opportunity it addresses.
3. What the product is.
4. What value it provides.
5. How success will be measured.
6. What is realistic for the current project scope.

Avoid vague statements such as:

- Improve user experience.
- Optimize the whole process.
- Provide the best solution.
- Increase efficiency significantly.
- Make management easier.

Replace them with measurable, testable, or demo-able statements such as:

- Users can complete the booking process in under 5 minutes.
- The system supports at least 3 user roles with role-based permissions.
- The system prevents duplicate bookings for the same resource and time slot.
- Admin users can view at least 2 dashboard reports.
- Required fields and validation rules are applied to all main forms.

## Product Vision vs Project Scope

Always distinguish between **Product Vision** and **Project Scope**.

### Product Vision

Product Vision describes the long-term direction of the product.

It answers:

- What is the product intended to become?
- Who will benefit from it?
- What long-term problem does it solve?
- What value does it provide?

Example:

> The long-term vision of the system is to become a centralized and user-friendly platform that helps clinics manage appointments, patient records, and doctor schedules more efficiently.

### Project Scope

Project Scope describes what will be implemented in the current version of the project.

It answers:

- What features are included in this version?
- What features are excluded?
- What are the current boundaries of the project?
- What can be completed within the project timeline?

Example:

> In the current capstone version, the system focuses on appointment booking, user management, doctor schedule management, and basic reporting. Advanced features such as online payment, insurance integration, and AI-based diagnosis are out of scope.

## Vision Statement Template

Use the Geoffrey Moore-style template when writing a product vision statement.

```text
For [target users]
who [have a specific need or problem],
[product name] is a [product category]
that [core benefit or key capability].

Unlike [current solution or alternative],
our product [key difference or advantage].
```

## Capstone-Friendly Vision Statement Template

For capstone projects, use a simpler and more realistic version:

```text
For [target users] who need to [main need/problem],
[product name] is a [web/mobile/software system]
that helps users [main benefit].

Unlike [manual process/current tool/existing limitation],
the system provides [main differentiator],
such as [feature 1], [feature 2], and [feature 3].
```

## Business Objectives Guidelines

Business Objectives must be specific, measurable, and relevant to the project.

For real business projects, objectives may include:

- Increase revenue
- Reduce operational cost
- Improve customer retention
- Reduce support workload
- Increase conversion rate

For capstone software projects, objectives should be adjusted to project-level or product-level outcomes:

- Reduce manual work
- Centralize data management
- Improve process accuracy
- Support role-based workflows
- Provide search, filtering, and reporting
- Prevent common errors
- Improve task completion time
- Support core user journeys

## Recommended Objective Pattern

Use this pattern:

```text
To [action verb] [target process/data/user need] by [system capability].
```

Examples:

```text
To reduce manual appointment handling by allowing users to create, update, and cancel appointments through the system.
```

```text
To improve data accuracy by applying required fields, validation rules, and duplicate checks to key forms.
```

```text
To support different responsibilities by providing role-based access for admin, staff, and normal users.
```

## Success Metrics Guidelines

Every important objective should have a success metric.

A success metric should be:

- Observable
- Testable
- Measurable
- Relevant to the project demo or acceptance testing

For capstone projects, success metrics can be measured through:

- Functional testing
- User acceptance testing
- Demo scenarios
- Test cases
- Number of supported roles
- Number of completed workflows
- Time to complete a task
- Number of reports or dashboard views
- Validation and error prevention rules

## Success Metrics Examples

Use metrics like:

```text
Users can complete the main workflow in no more than [X] steps.
```

```text
The system supports at least [N] user roles with different access permissions.
```

```text
The system provides at least [N] reports or dashboard views.
```

```text
The system prevents duplicate records based on [specific rule].
```

```text
Users can search and filter [main data] by [criteria].
```

```text
All required fields are validated before data is submitted.
```

## Recommended Output Structure

When the user asks to write this section, produce the following structure:

```markdown
## 1. Business Vision & Objectives

### 1.1 Product Vision

[Vision statement and long-term product direction.]

### 1.2 Business Objectives

The main objectives of this project are:

1. [Objective 1]
2. [Objective 2]
3. [Objective 3]
4. [Objective 4]
5. [Objective 5]

### 1.3 Success Metrics

| Objective           | Success Metric              |
| ------------------- | --------------------------- |
| [Objective summary] | [Measurable success metric] |
| [Objective summary] | [Measurable success metric] |
| [Objective summary] | [Measurable success metric] |
```

## Writing Style

Use a formal but clear academic style.

For capstone projects:

- Do not exaggerate business impact.
- Do not invent unrealistic KPIs such as revenue growth unless the project has actual business data.
- Prefer measurable software outcomes.
- Keep the language practical and implementation-aware.
- Make objectives suitable for testing, demo, and evaluation.
- Use simple English unless the user requests Vietnamese.
- If the project is academic, avoid sounding like a startup pitch.

## Good Objective Examples for Software Capstone

```text
To provide a centralized platform for managing user, order, and transaction data.
```

```text
To reduce manual tracking by allowing users to create, update, and monitor requests through the system.
```

```text
To improve workflow transparency by showing real-time status updates for each request.
```

```text
To support secure access by implementing authentication and role-based authorization.
```

```text
To support decision-making by providing basic reports and dashboard summaries.
```

## Bad Objective Examples

Avoid:

```text
To become the best platform in the market.
```

```text
To improve everything for all users.
```

```text
To maximize customer satisfaction.
```

```text
To increase business performance significantly.
```

These are weak because they are too broad and cannot be tested within a capstone project.

## Review Checklist

When reviewing a Business Vision & Objectives section, check:

- Is the target user clearly identified?
- Is the problem or need specific?
- Is the product category clear?
- Is the product vision different from project scope?
- Are the objectives realistic for the current version?
- Are the objectives measurable?
- Are success metrics included?
- Can the metrics be tested during demo, QA, or acceptance testing?
- Are vague marketing words avoided?
- Are out-of-scope business claims avoided?

## Interaction Rules

When the user provides a project idea, first identify:

- Product name
- Target users
- Main problem
- Current/manual solution
- Core features
- Expected benefit
- Current project scope
- Possible measurable success metrics

If information is missing, make reasonable assumptions and clearly mark them as assumptions.

Do not block the user by asking too many questions. For capstone projects, provide a useful draft based on available information.

## Default Response Behavior

When asked to create the Business Vision & Objectives section:

1. Briefly summarize the assumed project context.
2. Write the section using the recommended structure.
3. Include measurable success metrics.
4. Keep the content realistic for a software capstone.
5. Optionally suggest improvements or missing information.

## Example Output

```markdown
## 1. Business Vision & Objectives

### 1.1 Product Vision

For students and academic supervisors who need to manage capstone project progress more effectively, Capstone Management System is a web-based project management platform that helps users manage project proposals, milestones, submissions, feedback, and evaluation in one centralized system.

Unlike manual tracking through spreadsheets, emails, or separate messaging tools, the system provides structured project tracking, role-based access, submission management, and progress monitoring.

The long-term vision of the product is to become a reliable academic project management platform that improves transparency, reduces manual administrative work, and supports better collaboration between students, supervisors, and administrators.

### 1.2 Business Objectives

The main objectives of this project are:

1. To centralize capstone project information, including student groups, supervisors, project topics, milestones, and submissions.
2. To reduce manual progress tracking by allowing students and supervisors to update and monitor project status through the system.
3. To improve submission management by providing structured milestone submission and feedback features.
4. To support different responsibilities through role-based access for students, supervisors, and administrators.
5. To provide basic reports or dashboards for monitoring project progress and submission status.

### 1.3 Success Metrics

| Objective                      | Success Metric                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Centralized project management | Users can create, view, update, and search project, group, supervisor, and milestone information in one system. |
| Progress tracking              | Students and supervisors can update and view project status for each milestone.                                 |
| Submission management          | Students can submit milestone deliverables, and supervisors can provide feedback through the system.            |
| Role-based access              | The system supports at least 3 roles: student, supervisor, and administrator.                                   |
| Reporting                      | The system provides at least 2 dashboard views or reports for project progress and submission status.           |
```
