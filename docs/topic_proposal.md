## Design and Development of an Intelligent Augmented Reality-Based Infrastructure Monitoring and Maintenance Platform with AI-Assisted Analytics for Simulated Data Center Environments

---

## Group Information

Semester: SU26
Class: SE1823
Subject: WDP301
Group: 09
Contributors: Phan Vo Duc Huy, Nguyen Khanh Ngan, Le Tran Anh Duy

---

## 1. Proposed Title

Design and Development of an Intelligent Augmented Reality-Based Infrastructure Monitoring and Maintenance Platform with AI-Assisted Analytics for Simulated Data Center Environments

## 2. Application Domain

The proposed system belongs to the fields of:

- Augmented Reality for Infrastructure Monitoring and Maintenance
- Realtime Infrastructure Monitoring
- Artificial Intelligence for IT Operations (AIOps)
- Streaming Data Analytics
- Distributed Systems and Observability
- Machine Learning for Time-Series Analysis
- Human-AI Interaction for Technical Field Support

The project is positioned as a proof-of-concept (PoC) for simulated data center environments rather than a production-ready enterprise platform. Instead of operating on real industrial infrastructure, the system uses Docker-based containerized services to emulate server nodes, workloads, and infrastructure events. This simulated environment allows the study to investigate whether Augmented Reality can serve as an effective operational interface for infrastructure monitoring and maintenance, while Artificial Intelligence can act as an optional analytical extension for anomaly interpretation and predictive support.

## 3. Problem Statement

Data center monitoring and maintenance involve both digital observability and physical operational awareness. In practical settings, infrastructure operators need to inspect resource usage, detect abnormal behavior, identify the affected node, and perform maintenance actions based on system context. However, conventional monitoring approaches are typically centered on dashboards, logs, and static alert interfaces, which separate virtual infrastructure information from the physical maintenance space.

This separation creates several limitations:

- Operators must mentally map virtual metrics to physical infrastructure components
- Alert dashboards provide limited spatial context for onsite maintenance tasks
- Rule-based alerts may produce high false-positive rates and weak decision support
- Traditional interfaces are effective for centralized monitoring but less intuitive for physical inspection and maintenance workflows
- Existing enterprise-grade solutions are often too complex, costly, or operationally constrained to be realistically reproduced in an academic project

Therefore, this project does not aim to replicate a real enterprise data center management system. Instead, it proposes a proof-of-concept platform to validate the feasibility of combining Augmented Reality and AI-assisted analytics in a simulated data center setting. The core objective is to demonstrate that AR can bridge the gap between physical maintenance activities and virtual infrastructure telemetry, while AI can enhance the system by providing anomaly detection and predictive insights.

## 4. Target Users

- IT Administrators: Responsible for centralized monitoring, reviewing telemetry, supervising alerts, and managing infrastructure status from the web dashboard.
- NOC Engineers: Responsible for realtime observation of infrastructure behavior, validation of abnormal events, and operational triage.
- Maintenance Technicians: Responsible for onsite or simulated field inspection using the AR interface to identify nodes, inspect status, view logs, and follow contextual maintenance guidance.

## 5. Research Motivation for AI Integration

The research is primarily motivated by the need to explore more intuitive and context-aware approaches to infrastructure monitoring and maintenance. In this project, Augmented Reality is the core interaction layer, while Artificial Intelligence is introduced as an extension to strengthen analytical capability and research value.

##### 5.1 Complexity of Infrastructure Telemetry:

Even in a simulated data center environment, infrastructure nodes and containerized services continuously generate multivariate telemetry such as CPU utilization, memory consumption, network activity, storage usage, and container status changes. These signals evolve over time and can form patterns that are difficult to interpret solely through fixed threshold rules or manual observation.

##### 5.2 Augmented Reality as an Operational Interface

Traditional dashboards are effective for centralized monitoring, but they do not naturally connect infrastructure data to the physical maintenance context. Augmented Reality can reduce this gap by overlaying operational information directly onto simulated server racks or node representations through marker-based spatial anchoring. This enables a more intuitive maintenance workflow in which users can inspect infrastructure state in situ rather than switching repeatedly between physical assets and remote dashboards.

##### 5.3 Intelligent Realtime Anomaly Detection

Once telemetry is continuously collected from the simulated environment, AI models can be used to learn normal operational patterns and identify abnormal behaviors beyond simple threshold violations. This introduces research value by allowing the system to move from visualization-only monitoring to intelligent assistance.

##### 5.4 Predictive Support for Maintenance Decision-Making:

In addition to anomaly detection, selected AI models may be used to estimate risk trends or potential degradation patterns from telemetry sequences. In this project, such predictive capability is considered an advanced extension rather than a mandatory core feature. Its purpose is to demonstrate how AI can further support maintenance planning when integrated with AR-based operational workflows.

## 6. Proposed AI Models

##### 6.1 Anomaly Detection

- Isolation Forest: Proposed as the primary lightweight baseline for unsupervised anomaly detection on multivariate telemetry. It is computationally efficient and suitable for proof-of-concept experimentation with container-level and node-level metrics.

- LSTM Autoencoder: Proposed as a temporal anomaly detection model for learning sequential telemetry behavior and reconstructing normal operational patterns. It is appropriate when the study requires comparison between conventional unsupervised detection and temporal deep learning approaches.

- Transformer-Based Time-Series Model: Considered as an advanced exploratory option for modeling longer temporal dependencies. This model is included as a research extension and is not required for the minimum viable proof-of-concept.

##### 6.2 Predictive Maintenance

- LSTM Forecasting Model: Proposed for forecasting short-term infrastructure health trends such as CPU, memory, or storage evolution over time in the simulated environment.

- Remaining Useful Life (RUL) Estimation Model: Considered as a conceptual extension for estimating degradation tendency or failure likelihood. In the context of this project, it may be adapted to simulated service or node health rather than literal hardware lifetime prediction.

- Temporal Fusion Transformer (TFT): Considered for advanced predictive analytics on multivariate telemetry streams. Similar to the Transformer-based anomaly model, this option is exploratory and intended for extended research scope rather than the mandatory baseline implementation.

##### 6.3 Augmented Reality & Spatial Computing

- ID-Based Spatial Anchoring (WebAR + ArUco/QR Markers): The AR subsystem uses lightweight marker-based spatial anchoring to associate simulated racks, nodes, or server representations with their corresponding telemetry data. This approach is intentionally chosen over computationally expensive object recognition in order to keep the proof-of-concept technically feasible and academically well-scoped.

- Matrix Transformation (Relative Offset): Spatial transformation is used to calculate the relative position and orientation between the camera and each marker so that 2D information overlays can be rendered stably on top of the corresponding infrastructure element.

## 7. Core System

##### 7.1 Web Application Dashboard Scope (Centralized Command Center):

- Real-time Telemetry Visualization: A centralized dashboard presents node-level and container-level telemetry from the simulated data center environment, including CPU, memory, network activity, and service status.

- Infrastructure Status and Alert Management: The dashboard allows administrators and operators to review health conditions, inspect detected anomalies, and monitor infrastructure events generated from the simulation.

- Cluster or Rack Mapping View: A visual mapping module represents the relationship between simulated racks, nodes, containers, and their marker identifiers so that the AR interface can retrieve the correct contextual data.

- Incident and Maintenance Coordination: The dashboard provides a simple incident workflow for tracking abnormal nodes, assigning inspection status, and synchronizing maintenance-related information with the AR frontend.

##### 7.2 AR scope:

- Device Recognition & Registration via Spatial Anchors

- Virtual-Physical Mapping: Marker-based AR overlays display node identity, service status, active workloads, and health summaries directly on simulated racks or server representations.

- Contextual Maintenance Visualization: The AR interface highlights abnormal nodes and presents warning indicators, status summaries, and operational notes in a context-aware manner.

- In-situ Log and Status Inspection: Users can trigger lightweight actions such as viewing recent logs, checking service health, or reading maintenance notes directly from the AR scene.

- Guided Maintenance Support: The AR application provides simple contextual instructions for inspection or remediation, such as checking overheating simulation, restarting a failed service, or verifying container deployment status.

- Ticket system integrateion: The AR frontend can interact with limited maintenance workflow actions such as acknowledge, in progress, escalated, and resolved.

##### 7.3 AI & Backend Scope:

- Simulated Data Center Emulation & Telemetry Collection: The backend environment emulates racks, nodes, and services using Docker containers. A custom telemetry collector continuously gathers system and container metadata and streams them to the backend for visualization and analysis.

- Realtime Monitoring Pipeline: Incoming telemetry is processed for visualization, logging, and anomaly scoring. This pipeline supports both basic threshold logic and optional AI-assisted detection.

- AI-Assisted Analytical Extension: Selected anomaly detection or predictive models are integrated as an analytical layer that enriches the dashboard and AR interface with abnormality scores, warning indicators, or simplified risk insights.

## 8. Expected Result

The expected research contributions include:

- A proof-of-concept architecture for AR-based infrastructure monitoring and maintenance in simulated data center environments.

- A practical demonstration of how marker-based Augmented Reality can connect infrastructure telemetry with physical maintenance context.

- An evaluation of AI-assisted anomaly detection or predictive analytics as an extension to AR-centered monitoring workflows.

- An integrated human-system interaction workflow combining dashboard monitoring, AR-based inspection, and optional AI-supported decision assistance.

- A feasibility study showing the potential of combining AR and AI for future infrastructure maintenance and observability research, without claiming direct enterprise deployment readiness.
