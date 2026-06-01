# Go Agent Collector Docs

## Muc tieu

Thu muc nay chua bo tai lieu thiet ke cho `go-agent-collector`, la mini local agent co nhiem vu:

- scrape raw metrics tu local exporter
- map raw metrics sang `domain metrics` thong nhat cua he thong
- enrich metadata can thiet
- batch va gui ve server chinh

Agent nay duoc thiet ke de:

- chay truoc tren `Windows` voi `windows_exporter`
- mo rong sau sang `Linux` voi `node_exporter`
- giu output schema on dinh de backend, dashboard, AR va AI su dung chung

## Doc dau tien

- [01_agent_overview.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/01_agent_overview.md)
- [02_runtime_flow.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/02_runtime_flow.md)
- [03_config_design.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/03_config_design.md)
- [04_metric_mapping_spec.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/04_metric_mapping_spec.md)
- [05_payload_schema.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/05_payload_schema.md)
- [06_state_and_buffering.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/06_state_and_buffering.md)
- [07_windows_source_adapter.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/07_windows_source_adapter.md)
- [architecture.d2](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/architecture.d2)
- [09_package_structure.md](/D:/Study/FPTU/WDP301/projects/AR-based-Infrastructure-Monitoring-and-Maintenance-System/playground/go-agent-collector/docs/09_package_structure.md)

## Lo trinh docs de viet tiep

- `02_runtime_flow.md`
- `architecture.d2`
- `03_config_design.md`
- `04_metric_mapping_spec.md`
- `05_payload_schema.md`
- `06_state_and_buffering.md`
- `07_windows_source_adapter.md`
- `08_linux_source_adapter.md`
- `09_package_structure.md`
- `10_mvp_plan.md`

## Thu tu nen viet

Nen viet theo thu tu:

1. overview va ranh gioi trach nhiem
2. runtime flow collect -> map -> batch -> send
3. architecture diagram de chot ranh gioi component
4. config va metric mapping
5. payload schema va local state
6. source adapter cho Windows, roi toi Linux
7. package structure va MVP implementation plan
