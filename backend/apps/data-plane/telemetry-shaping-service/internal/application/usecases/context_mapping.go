package usecases

type contextSection string

const (
	contextSectionIdentity   contextSection = "identity"
	contextSectionRelations  contextSection = "relations"
	contextSectionCapacity   contextSection = "capacity"
	contextSectionInventory  contextSection = "inventory"
	contextSectionAttributes contextSection = "attributes"
)

type ContextFieldRule struct {
	MetricKey string
	ScopeType string
	Section   contextSection
	Field     string
}

var contextFieldRules = []ContextFieldRule{
	{MetricKey: "node.hostname", ScopeType: "node", Section: contextSectionIdentity, Field: "hostname"},
	{MetricKey: "node.os_product", ScopeType: "node", Section: contextSectionIdentity, Field: "os_product"},
	{MetricKey: "node.primary_ipv4", ScopeType: "node", Section: contextSectionIdentity, Field: "primary_ipv4"},
	{MetricKey: "node.logical_cpu_count", ScopeType: "node", Section: contextSectionCapacity, Field: "logical_cpu_count"},
	{MetricKey: "node.memory_total_bytes", ScopeType: "node", Section: contextSectionCapacity, Field: "memory_total_bytes"},
	{MetricKey: "node.ssd_total_space_gb", ScopeType: "node", Section: contextSectionCapacity, Field: "ssd_total_space_gb"},
	{MetricKey: "node.battery_design_capacity_mwh", ScopeType: "node", Section: contextSectionCapacity, Field: "battery_design_capacity_mwh"},
	{MetricKey: "node.battery_full_charge_capacity_mwh", ScopeType: "node", Section: contextSectionCapacity, Field: "battery_full_charge_capacity_mwh"},
	{MetricKey: "container.name", ScopeType: "container", Section: contextSectionIdentity, Field: "name"},
	{MetricKey: "container.image", ScopeType: "container", Section: contextSectionIdentity, Field: "image"},
	{MetricKey: "container.image_tag", ScopeType: "container", Section: contextSectionIdentity, Field: "image_tag"},
	{MetricKey: "container.runtime_id", ScopeType: "container", Section: contextSectionIdentity, Field: "runtime_id"},
	{MetricKey: "container.service_name", ScopeType: "container", Section: contextSectionRelations, Field: "service_name"},
	{MetricKey: "container.node_id", ScopeType: "container", Section: contextSectionRelations, Field: "node_id"},
	{MetricKey: "container.memory_limit_bytes", ScopeType: "container", Section: contextSectionCapacity, Field: "memory_limit_bytes"},
	{MetricKey: "container.restart_count", ScopeType: "container", Section: contextSectionInventory, Field: "restart_count"},
	{MetricKey: "container.port_binding_count", ScopeType: "container", Section: contextSectionInventory, Field: "port_binding_count"},
	{MetricKey: "container.mount_count", ScopeType: "container", Section: contextSectionInventory, Field: "mount_count"},
	{MetricKey: "container.network_count", ScopeType: "container", Section: contextSectionInventory, Field: "network_count"},
}

func buildContextRuleIndex() map[string]ContextFieldRule {
	index := make(map[string]ContextFieldRule, len(contextFieldRules))
	for _, rule := range contextFieldRules {
		index[contextRuleKey(rule.ScopeType, rule.MetricKey)] = rule
	}
	return index
}

func contextRuleKey(scopeType, metricKey string) string {
	return scopeType + "|" + metricKey
}
