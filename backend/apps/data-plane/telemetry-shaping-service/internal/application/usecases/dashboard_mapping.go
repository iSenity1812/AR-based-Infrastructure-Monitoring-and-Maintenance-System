package usecases

type dashboardSection string

const (
	dashboardSectionStatus    dashboardSection = "status"
	dashboardSectionResources dashboardSection = "resources"
	dashboardSectionStorage   dashboardSection = "storage"
	dashboardSectionNetwork   dashboardSection = "network"
	dashboardSectionHealth    dashboardSection = "health"
	dashboardSectionCounts    dashboardSection = "counts"
)

type DashboardFieldRule struct {
	MetricKey string
	ScopeType string
	Section   dashboardSection
	Field     string
}

var dashboardFieldRules = []DashboardFieldRule{
	{MetricKey: "node.cpu_usage_pct", ScopeType: "node", Section: dashboardSectionResources, Field: "cpu_usage_pct"},
	{MetricKey: "node.memory_used_pct", ScopeType: "node", Section: dashboardSectionResources, Field: "memory_used_pct"},
	{MetricKey: "node.memory_commit_used_pct", ScopeType: "node", Section: dashboardSectionResources, Field: "memory_commit_used_pct"},
	{MetricKey: "node.cpu_queue_length", ScopeType: "node", Section: dashboardSectionResources, Field: "cpu_queue_length"},
	{MetricKey: "node.process_count", ScopeType: "node", Section: dashboardSectionCounts, Field: "process_count"},
	{MetricKey: "node.thread_count", ScopeType: "node", Section: dashboardSectionCounts, Field: "thread_count"},
	{MetricKey: "node.ssd_free_space_gb", ScopeType: "node", Section: dashboardSectionStorage, Field: "ssd_free_space_gb"},
	{MetricKey: "node.disk_read_bytes_sec", ScopeType: "node", Section: dashboardSectionStorage, Field: "disk_read_bytes_sec"},
	{MetricKey: "node.disk_write_bytes_sec", ScopeType: "node", Section: dashboardSectionStorage, Field: "disk_write_bytes_sec"},
	{MetricKey: "node.disk_queue_length", ScopeType: "node", Section: dashboardSectionStorage, Field: "disk_queue_length"},
	{MetricKey: "node.network_rx_bytes_sec", ScopeType: "node", Section: dashboardSectionNetwork, Field: "rx_bytes_sec"},
	{MetricKey: "node.network_tx_bytes_sec", ScopeType: "node", Section: dashboardSectionNetwork, Field: "tx_bytes_sec"},
	{MetricKey: "node.tcp_retransmit_pct", ScopeType: "node", Section: dashboardSectionNetwork, Field: "tcp_retransmit_pct"},
	{MetricKey: "node.primary_nic_status", ScopeType: "node", Section: dashboardSectionStatus, Field: "primary_nic_status"},
	{MetricKey: "node.cpu_temperature_c", ScopeType: "node", Section: dashboardSectionHealth, Field: "cpu_temperature_c"},
	{MetricKey: "node.gpu_core_load_pct", ScopeType: "node", Section: dashboardSectionHealth, Field: "gpu_core_load_pct"},
	{MetricKey: "node.battery_charge_pct", ScopeType: "node", Section: dashboardSectionHealth, Field: "battery_charge_pct"},
	{MetricKey: "container.status", ScopeType: "container", Section: dashboardSectionStatus, Field: "status"},
	{MetricKey: "container.health_status", ScopeType: "container", Section: dashboardSectionStatus, Field: "health_status"},
	{MetricKey: "container.cpu_usage_pct", ScopeType: "container", Section: dashboardSectionResources, Field: "cpu_usage_pct"},
	{MetricKey: "container.memory_used_pct", ScopeType: "container", Section: dashboardSectionResources, Field: "memory_used_pct"},
	{MetricKey: "container.network_rx_bytes_sec", ScopeType: "container", Section: dashboardSectionNetwork, Field: "rx_bytes_sec"},
	{MetricKey: "container.network_tx_bytes_sec", ScopeType: "container", Section: dashboardSectionNetwork, Field: "tx_bytes_sec"},
	{MetricKey: "container.restart_count", ScopeType: "container", Section: dashboardSectionCounts, Field: "restart_count"},
	{MetricKey: "service.cpu_usage_pct_sum", ScopeType: "service", Section: dashboardSectionResources, Field: "cpu_usage_pct_sum"},
	{MetricKey: "service.memory_used_bytes_sum", ScopeType: "service", Section: dashboardSectionResources, Field: "memory_used_bytes_sum"},
	{MetricKey: "service.running_container_count", ScopeType: "service", Section: dashboardSectionCounts, Field: "running_container_count"},
	{MetricKey: "service.container_count", ScopeType: "service", Section: dashboardSectionCounts, Field: "container_count"},
}

func buildDashboardRuleIndex() map[string]DashboardFieldRule {
	index := make(map[string]DashboardFieldRule, len(dashboardFieldRules))
	for _, rule := range dashboardFieldRules {
		index[dashboardRuleKey(rule.ScopeType, rule.MetricKey)] = rule
	}
	return index
}

func dashboardRuleKey(scopeType, metricKey string) string {
	return scopeType + "|" + metricKey
}
