---
name: problem-statement
description: Analyze and write the Problem Statement section for software projects, capstone projects, product documentation, business analysis documents, or Vision and Scope documents. Use when the user needs help defining background, current situation, business problem, business opportunity, as-is process, to-be direction, problem impact, or problem-to-objective-feature mapping.
---

# Problem Statement Analysis

Use this skill to help write, review, or improve the **Problem Statement** section of a software project document, especially for capstone projects, academic software projects, product proposals, business analysis documents, and Vision and Scope documents.

This skill focuses on defining:

- Background
- Current Situation
- Business Problem
- Business Opportunity
- As-Is Process
- To-Be Direction
- Problem Impact
- Root Cause
- Problem-to-Objective-Feature Mapping

## Core Principle

A software project should start from a real **problem** or **business opportunity**, not from a technical wish.

The Problem Statement should explain why the project is necessary before describing what the system will build.

It should answer:

1. What is the current context?
2. Who is affected by the problem?
3. What is happening in the current process?
4. What is inefficient, risky, costly, slow, duplicated, or difficult?
5. What impact does the problem create?
6. What opportunity exists if the problem is solved?
7. How do the problems connect to business objectives and product features?

Avoid starting with technical solutions such as:

- We need to build a website.
- We need to create a mobile app.
- We need to use React, Node.js, or MongoDB.
- We need to combine two systems into one.
- We need to apply AI to the process.

Instead, start from the user or business pain:

- Users spend too much time completing the current process manually.
- Data is scattered across different tools, making it difficult to search and update.
- Staff members repeatedly enter the same information in multiple places.
- Managers do not have real-time visibility into operation status.
- Customers cannot easily track the status of their requests.
- Manual handling increases the risk of errors, delays, and missing information.

## Technical Wish vs Business Problem

A technical idea is not a strong problem statement by itself.

Always identify the business or user value behind the technical idea.

| Weak Technical Statement    | Strong Problem-Oriented Statement                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Build a web application.    | Users need a centralized platform to manage the process more efficiently.                                     |
| Create a mobile app.        | Users need to access and complete the workflow anytime without relying on phone calls or physical forms.      |
| Merge two systems into one. | Staff members currently enter duplicate data across two systems, causing extra work and inconsistent records. |
| Add a dashboard.            | Managers need better visibility into key metrics without manually compiling reports.                          |
| Use AI chatbot.             | Support staff spend too much time answering repeated questions that could be handled automatically.           |
| Digitalize the process.     | Manual records are difficult to search, update, audit, and share across stakeholders.                         |

## Business Objectives Model

Use the Business Objectives Model to connect the project logic clearly:

```text id="e71dwy"
Business Problem
→ Business Objective
→ Product Feature
```

This means:

```text id="gjtn90"
What pain exists?
→ What improvement should happen?
→ What system feature supports that improvement?
```

Example:

| Business Problem                                                    | Business Objective                                              | Product Feature                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Appointment data is recorded manually in notebooks or spreadsheets. | Reduce manual appointment handling and centralize booking data. | Appointment management, booking list, search and filter         |
| Staff cannot check resource availability accurately.                | Reduce scheduling conflicts and improve booking accuracy.       | Availability checking, schedule management, conflict validation |
| Managers manually summarize operational data.                       | Improve monitoring and reporting.                               | Dashboard, report generation                                    |
| Users cannot track request status easily.                           | Improve process transparency.                                   | Status tracking, notification, request history                  |

## As-Is and To-Be Thinking

Use **As-Is** to describe the current situation before the new system.

Use **To-Be** to describe the improved direction after the new system exists.

### As-Is

The As-Is section should describe:

- Current workflow
- Current tools
- Current users or roles
- Manual steps
- Pain points
- Bottlenecks
- Risks and limitations

Example:

```text id="6r1pl0"
Currently, appointment requests are handled through phone calls and recorded manually in spreadsheets. Receptionists need to check doctor availability by reviewing separate records, which makes the process slow and prone to scheduling conflicts.
```

### To-Be

The To-Be direction should describe the desired improvement, not every detailed feature.

Example:

```text id="vsaafc"
The proposed system should centralize appointment data, provide better visibility into doctor schedules, and reduce manual coordination during the booking process.
```

Do not make the To-Be section too technical. Detailed features should be mapped later.

## Recommended Output Structure

When the user asks to write a Problem Statement section, use the following structure:

```markdown id="evkxfz"
## 2. Problem Statement

### 2.1 Background

[Describe the domain, organization, users, and general context.]

### 2.2 Current Situation

[Describe the current As-Is process, tools, roles, and workflow.]

### 2.3 Business Problem

[Describe the core problem, root causes, and negative impacts.]

### 2.4 Business Opportunity

[Describe the opportunity for improvement and the value of solving the problem.]

### 2.5 Problem-to-Objective Mapping

| Business Problem | Business Objective | Related Features       |
| ---------------- | ------------------ | ---------------------- |
| [Problem 1]      | [Objective 1]      | [Feature 1, Feature 2] |
| [Problem 2]      | [Objective 2]      | [Feature 3, Feature 4] |
| [Problem 3]      | [Objective 3]      | [Feature 5, Feature 6] |
```

## Writing Guidelines

Write the Problem Statement in a clear, formal, and practical style.

For capstone projects:

- Keep the problem realistic.
- Do not exaggerate market impact.
- Do not invent unsupported financial claims.
- Do not overclaim business transformation.
- Focus on operational pain, user pain, workflow inefficiency, data issues, and measurable impact.
- Use language suitable for academic software documentation.
- Explain why the system is needed before explaining what it will do.
- Make sure every major feature can be traced back to a real problem or objective.

## Recommended Paragraph Pattern

Use this pattern for each paragraph:

```text id="f3a3rr"
Currently, [target users/organization] manage [main process] using [current methods/tools].
This creates difficulties because [specific pain points].
As a result, [negative impact on users/business/process].
Therefore, there is a need/opportunity to [improvement direction].
```

Example:

```text id="c4k3yo"
Currently, small clinics manage appointments using phone calls, paper notes, and spreadsheets. This creates difficulties because appointment information is scattered and doctor availability is not always updated in real time. As a result, receptionists may create duplicate bookings, doctors may not have immediate access to their schedules, and managers must summarize appointment data manually. Therefore, there is an opportunity to introduce a centralized booking system that improves schedule visibility, reduces manual coordination, and supports more accurate appointment management.
```

## Problem Impact Types

When identifying problem impact, consider these categories:

### Time Impact

- Users spend too much time completing manual tasks.
- Staff members repeat the same work across different tools.
- Managers need extra time to collect or summarize data.

### Cost Impact

- Manual work increases operational workload.
- Errors require rework or additional support.
- Staff time is used inefficiently.

### Data Impact

- Data is scattered across multiple files or tools.
- Records are duplicated or inconsistent.
- Information is missing, outdated, or difficult to search.

### Process Impact

- Workflows are unclear or difficult to track.
- Approval or review processes are delayed.
- Responsibilities between roles are not clearly supported.

### User Experience Impact

- Users cannot complete tasks conveniently.
- Users cannot track the status of their requests.
- Users depend heavily on staff communication.

### Management Impact

- Managers lack real-time visibility.
- Reports are prepared manually.
- Decisions are made without reliable summary data.

## Good Problem Statement Examples

```text id="kqzy7m"
Currently, project progress is tracked through separate spreadsheets, emails, and messaging tools. This makes it difficult for students, supervisors, and administrators to maintain a shared view of project status, milestone submissions, and feedback history.
```

```text id="7lmb2l"
The main problem is that request handling is fragmented and heavily dependent on manual coordination. As the number of requests increases, staff members spend more time tracking status updates, searching for related information, and responding to repeated inquiries.
```

```text id="pv2xh8"
If this issue is not addressed, the organization may continue to experience delayed processing, inconsistent records, and limited visibility into operational performance.
```

## Bad Problem Statement Examples

Avoid:

```text id="2lk0oi"
This project is needed because we want to build a modern website.
```

```text id="h4iw59"
The current system is bad and inconvenient.
```

```text id="0300vi"
The project will use React and Node.js to improve performance.
```

```text id="c60u15"
The system will solve all problems in the organization.
```

```text id="x4i9fo"
The purpose is to combine all features into one platform.
```

These are weak because they are vague, solution-first, technical-first, or unrealistic.

## Review Checklist

When reviewing a Problem Statement section, check:

- Does it describe the current context clearly?
- Does it identify the affected users or stakeholders?
- Does it describe the current As-Is process?
- Does it explain the actual pain point?
- Does it avoid starting from technology?
- Does it explain the impact of the problem?
- Does it mention the opportunity for improvement?
- Are business problems connected to objectives?
- Are objectives connected to product features?
- Are claims realistic for a capstone or software project?
- Are vague statements replaced with specific examples?
- Can the reader understand why the software should exist?

## Interaction Rules

When the user provides a project idea, identify:

- Product name
- Target users
- Domain or business context
- Current process
- Current tools or manual methods
- Main pain points
- Affected stakeholders
- Negative impact
- Desired improvement
- Possible objectives
- Related features

If information is missing, make reasonable assumptions and clearly mark them as assumptions.

Do not ask too many questions before drafting. For capstone projects, produce a useful first draft based on the available information.

## Default Response Behavior

When asked to create the Problem Statement section:

1. Briefly summarize the assumed project context.
2. Write the Problem Statement using the recommended structure.
3. Include current situation, business problem, and business opportunity.
4. Add a Problem-to-Objective-Feature mapping table.
5. Keep the content realistic for software capstone evaluation.
6. Optionally suggest what information should be customized later.

## Example Output

```markdown id="jaty0p"
## 2. Problem Statement

### 2.1 Background

Capstone project management involves multiple stakeholders, including students, supervisors, and academic administrators. These stakeholders need to coordinate project topics, group information, milestone submissions, feedback, and evaluation throughout the project lifecycle.

In many academic environments, these activities are still managed through separate spreadsheets, emails, shared folders, and messaging tools. While these tools may work for simple communication, they become inefficient when many student groups, supervisors, and deadlines need to be managed at the same time.

### 2.2 Current Situation

In the current process, students submit project documents through different channels, supervisors provide feedback through emails or messages, and administrators track group information and milestone status manually. Project progress may be updated in spreadsheets, while submission files are stored in separate folders or communication platforms.

This fragmented process makes it difficult for stakeholders to maintain a single source of truth for project status, submission history, supervisor feedback, and evaluation progress.

### 2.3 Business Problem

The main problem is that capstone project tracking is fragmented and heavily dependent on manual coordination. Information about groups, supervisors, milestones, submissions, and feedback may be scattered across multiple tools, making it difficult to search, update, and verify.

As a result, students may miss important updates, supervisors may spend additional time checking submission status, and administrators may need to manually compile progress reports. If this issue is not addressed, the capstone management process may continue to experience delays, inconsistent records, and limited visibility into project progress.

### 2.4 Business Opportunity

There is an opportunity to improve the capstone management process by introducing a centralized software system that supports project registration, milestone tracking, submission management, supervisor feedback, and progress monitoring.

The proposed system can help students, supervisors, and administrators manage capstone-related information more efficiently, reduce manual coordination, and provide better visibility into project progress and submission status.

### 2.5 Problem-to-Objective Mapping

| Business Problem                                                                  | Business Objective                                               | Related Features                                             |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Project information is scattered across spreadsheets, emails, and shared folders. | Centralize capstone project data in one system.                  | Project management, group management, supervisor assignment  |
| Milestone submissions are handled through different communication channels.       | Improve submission tracking and reduce missing deliverables.     | Milestone management, file submission, submission history    |
| Supervisors need to check progress and provide feedback manually.                 | Improve feedback management and project progress visibility.     | Feedback module, progress tracking, supervisor dashboard     |
| Administrators manually compile project status reports.                           | Improve monitoring and reporting for academic administrators.    | Admin dashboard, progress reports, submission status summary |
| Students may not have a clear view of deadlines and feedback status.              | Improve transparency for students during the capstone lifecycle. | Deadline tracking, notification, student dashboard           |
```
