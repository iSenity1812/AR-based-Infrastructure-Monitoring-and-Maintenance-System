## 2. Problem Statement

### 2.1 Background

In a simulated data center environment, infrastructure monitoring and maintenance are not limited to observing system status. They also involve identifying operational issues, tracing their causes, recording handling history, and performing on-site inspection tasks. Multiple roles participate in this process, including system administrators, monitoring operators, and maintenance technicians.

Although each role has a different responsibility, they all need to work from the same operational context. Administrators need an overall view and control over access, monitoring operators need to respond to alerts and coordinate incidents, and maintenance technicians need the correct asset context to inspect and record results. For this reason, the project is not only about displaying information, but also about organizing the workflow so stakeholders can work from a shared operational view.

### 2.2 Current Situation

In the current operating process, information related to a single asset is often split across several groups of content: status, alerts, incident history, handling notes, inspection results, and asset identification details. When these pieces of information are not connected within one consistent workflow, users must search, compare, and manually combine data before making a decision.

Monitoring operators usually need to review infrastructure status, check the alert list, compare it with the latest history, and only then decide whether an incident should be opened. If the issue requires field handling, that information must then be passed to a maintenance technician for follow-up inspection. On the other side, when technicians arrive at an asset, they also need to know what problem is affecting it, whether any related incidents have already happened, and what instructions should be followed during the inspection.

This approach creates a workflow that depends heavily on manual coordination, disconnected communication, and repeated comparison across multiple sources. As a result, status tracking, responsibility transfer, and result recording become more time-consuming than necessary.

### 2.3 Business Problem

The main problem is that the infrastructure monitoring and maintenance process is fragmented, which makes it difficult for users to obtain complete context at the exact moment they need to make a decision.

The root causes of this problem include:

- Operational information for the same asset is split into multiple content groups.
- Alerts, incidents, and inspection results are not always linked into one clear workflow.
- Maintenance technicians must search for asset context instead of receiving it in a ready-to-use form.
- Monitoring operators must spend time gathering information before handing work over to the next step.

This problem creates impacts in several areas:

- More time is spent searching for and consolidating information.
- Important context can be missed when handling alerts or inspecting assets.
- It is difficult to track progress from alert to incident to ticket to inspection result.
- The risk of inconsistent records between roles increases.
- It becomes harder to trace and review how an issue was handled later.

If this problem is not addressed, the operating process will continue to rely on memory, manual communication, and individual experience. This makes it difficult to achieve the consistency and transparency needed in a simulated environment with many components that must be tracked together.

### 2.4 Business Opportunity

The problem creates a clear opportunity to build a platform that brings operational context together and organizes monitoring and maintenance into a more coherent workflow.

If the system can centralize asset status, alerts, incident history, and inspection results within one workflow, users will be able to:

- understand the current state of an asset faster
- reduce repeated lookup and comparison work
- transfer work more clearly between roles
- inspect and confirm maintenance results more easily
- follow the full handling process in a consistent way

From a business perspective, the opportunity is to turn a fragmented monitoring and maintenance process into a context-aware workflow that can be tracked, reviewed, and demonstrated clearly in a simulated environment.

### 2.5 Problem-to-Objective Mapping

| Business Problem | Business Objective | Related Features |
| --- | --- | --- |
| Operational information for an asset is split across different places | Centralize infrastructure monitoring information | View asset status, related alerts, and recent operational history |
| Users must compare multiple sources before taking action | Support role-based operational workflows | Role separation for administrators, monitoring operators, and maintenance technicians |
| Moving from alert handling to issue resolution still requires many manual steps | Reduce manual effort in issue handling | View alerts, open incidents, assign tickets, track handling status |
| Technicians need the correct context when inspecting an asset | Improve maintenance accuracy | Identify assets, review related information, record inspection results |
| The process must be suitable for demo and capstone evaluation | Provide a realistic proof-of-concept | End-to-end flow from monitoring to handling to field inspection |
| Traceability and reporting are needed after handling | Support basic operational reporting and traceability | Activity logs, inspection history, workflow status |

