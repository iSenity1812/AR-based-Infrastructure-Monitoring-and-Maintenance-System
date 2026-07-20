package usecases

import (
	"strings"

	"telemetry-shaping-service/internal/domain/entities"
)

type MetricClassifier interface {
	Classify(metric entities.NormalizedMetric) entities.MetricClassification
	ClassifyBatch(batch entities.NormalizedBatch) entities.ClassifiedBatch
}

type RuleBasedMetricClassifier struct {
	rules []classificationRule
}

type classificationRule struct {
	name           string
	source         string
	keys           map[string]struct{}
	classification entities.MetricClassification
}

func NewRuleBasedMetricClassifier() *RuleBasedMetricClassifier {
	return &RuleBasedMetricClassifier{
		rules: defaultClassificationRules(),
	}
}

func (c *RuleBasedMetricClassifier) Classify(metric entities.NormalizedMetric) entities.MetricClassification {
	for _, rule := range c.rules {
		if rule.matches(metric) {
			return rule.classification
		}
	}

	return entities.MetricClassification{
		Category:        entities.MetricCategoryUnknown,
		LaneMask:        entities.LaneSnapshot,
		FeatureEligible: false,
	}
}

func (c *RuleBasedMetricClassifier) ClassifyBatch(batch entities.NormalizedBatch) entities.ClassifiedBatch {
	classified := make([]entities.ClassifiedMetric, 0, len(batch.Metrics))
	for _, metric := range batch.Metrics {
		classified = append(classified, entities.ClassifiedMetric{
			Metric:         metric,
			Classification: c.Classify(metric),
		})
	}

	return entities.ClassifiedBatch{
		Batch:   batch,
		Metrics: classified,
	}
}

func (r classificationRule) matches(metric entities.NormalizedMetric) bool {
	if r.source != "" && !strings.EqualFold(metric.Source, r.source) {
		return false
	}

	if len(r.keys) == 0 {
		return true
	}

	_, ok := r.keys[metric.MetricKey]
	return ok
}

func defaultClassificationRules() []classificationRule {
	return []classificationRule{
		{
			name:   "windows_identity_and_inventory",
			source: "windows_exporter",
			keys:   keySet("node.hostname", "node.os_product", "node.primary_ipv4", "node.logical_cpu_count"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryIdentityAndInventory,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "docker_identity_and_inventory",
			source: "docker",
			keys:   keySet("container.name", "container.image", "container.image_tag", "container.runtime_id", "container.service_name", "container.node_id"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryIdentityAndInventory,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "windows_compute_derived",
			source: "windows_exporter",
			keys:   keySet("node.cpu_usage_pct"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryCompute,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("cpu_usage_from_idle"),
			},
		},
		{
			name:   "windows_compute_direct",
			source: "windows_exporter",
			keys:   keySet("node.cpu_queue_length", "node.cpu_core_frequency_mhz"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryCompute,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "windows_compute_rate",
			source: "windows_exporter",
			keys:   keySet("node.cpu_dpc_rate"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryCompute,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("sum_rate_by:core"),
			},
		},
		{
			name:   "windows_memory_direct",
			source: "windows_exporter",
			keys:   keySet("node.memory_available_mb"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryMemory,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("bytes_to_mb"),
			},
		},
		{
			name:   "windows_memory_static",
			source: "windows_exporter",
			keys:   keySet("node.memory_total_bytes"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryMemory,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "windows_memory_derived",
			source: "windows_exporter",
			keys:   keySet("node.memory_used_pct", "node.memory_commit_used_pct"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryMemory,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("derive_ratio_pct"),
			},
		},
		{
			name:   "windows_memory_rate",
			source: "windows_exporter",
			keys:   keySet("node.memory_page_faults_rate"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryMemory,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("rate"),
			},
		},
		{
			name:   "windows_storage_direct",
			source: "windows_exporter",
			keys:   keySet("node.disk_free_gb", "node.disk_queue_length"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryStorage,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("system_drive_direct"),
			},
		},
		{
			name:   "windows_storage_derived",
			source: "windows_exporter",
			keys:   keySet("node.disk_used_pct"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryStorage,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("system_drive_used_pct"),
			},
		},
		{
			name:   "windows_storage_rate",
			source: "windows_exporter",
			keys:   keySet("node.disk_read_bytes_sec", "node.disk_write_bytes_sec"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryStorage,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("system_drive_rate"),
			},
		},
		{
			name:   "windows_network_rate",
			source: "windows_exporter",
			keys:   keySet("node.network_rx_bytes_sec", "node.network_tx_bytes_sec"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryNetwork,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("select_primary_nic_rate"),
			},
		},
		{
			name:   "windows_network_utilization",
			source: "windows_exporter",
			keys:   keySet("node.network_utilization_pct"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryNetwork,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("derive_network_utilization_pct"),
			},
		},
		{
			name:   "windows_network_state",
			source: "windows_exporter",
			keys:   keySet("node.primary_nic_status"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryNetwork,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot | entities.LaneDashboard,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("primary_nic_status"),
			},
		},
		{
			name:   "windows_tcp_rate",
			source: "windows_exporter",
			keys:   keySet("node.tcp_connection_failures_rate", "node.tcp_segments_retransmitted_rate"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryTcpConnectionHealth,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("sum_rate_by:af"),
			},
		},
		{
			name:   "windows_tcp_derived",
			source: "windows_exporter",
			keys:   keySet("node.tcp_retransmit_pct"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryTcpConnectionHealth,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("derive_ratio_pct"),
			},
		},
		{
			name:   "windows_runtime_direct",
			source: "windows_exporter",
			keys:   keySet("node.process_count", "node.thread_count"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryRuntimeAndOS,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "windows_runtime_derived",
			source: "windows_exporter",
			keys:   keySet("node.uptime_seconds"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryRuntimeAndOS,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("derive_uptime"),
			},
		},
		{
			name:   "docker_resource_direct",
			source: "docker",
			keys:   keySet("container.memory_used_bytes", "container.pid_count"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryResourceRuntime,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "docker_resource_derived",
			source: "docker",
			keys:   keySet("container.cpu_usage_pct", "container.memory_used_pct"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryResourceRuntime,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "docker_runtime_state_text",
			source: "docker",
			keys:   keySet("container.status", "container.state", "container.health_status"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryRuntimeAndOS,
				LaneMask:        entities.LaneDashboard | entities.LaneSnapshot | entities.LaneContext,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "docker_resource_rate",
			source: "docker",
			keys:   keySet("container.network_rx_bytes_sec", "container.network_tx_bytes_sec", "container.block_read_bytes_sec", "container.block_write_bytes_sec"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryResourceRuntime,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("rate"),
			},
		},
		{
			name:   "docker_inventory_counts",
			source: "docker",
			keys:   keySet("container.port_binding_count", "container.mount_count", "container.network_count", "container.restart_count"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryInventoryCounts,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "docker_service_rollup",
			source: "docker",
			keys:   keySet("service.container_count", "service.running_container_count", "service.cpu_usage_pct_sum", "service.memory_used_bytes_sum"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryServiceRollup,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("sum"),
			},
		},
		{
			name:   "lhm_hardware_health_dynamic",
			source: "lhm",
			keys:   keySet("node.cpu_temperature_c", "node.cpu_package_power_w", "node.gpu_core_load_pct", "node.gpu_core_clock_mhz", "node.gpu_memory_clock_mhz", "node.ssd_temperature_c", "node.ssd_life_pct", "node.ssd_percentage_used_pct", "node.ssd_available_spare_pct", "node.battery_charge_pct", "node.battery_degradation_pct", "node.battery_remaining_capacity_mwh"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryHardwareHealth,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "lhm_storage_dynamic",
			source: "lhm",
			keys:   keySet("node.ssd_free_space_gb"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryStorage,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "lhm_storage_rate",
			source: "lhm",
			keys:   keySet("node.ssd_read_rate", "node.ssd_write_rate"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryStorage,
				LaneMask:        entities.LaneDashboard | entities.LaneWindow,
				FeatureEligible: true,
				AggregationHint: entities.AggregationHint("rate"),
			},
		},
		{
			name:   "lhm_storage_capacity_static",
			source: "lhm",
			keys:   keySet("node.ssd_total_space_gb"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryStorage,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "lhm_battery_capacity_static",
			source: "lhm",
			keys:   keySet("node.battery_design_capacity_mwh", "node.battery_full_charge_capacity_mwh"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryHardwareHealth,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "lhm_hardware_health_static",
			source: "lhm",
			keys:   keySet("node.ssd_power_on_hours", "node.ssd_power_on_count", "node.ssd_data_read_gb", "node.ssd_data_written_gb"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryHardwareHealth,
				LaneMask:        entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
		{
			name:   "docker_capacity_static",
			source: "docker",
			keys:   keySet("container.memory_limit_bytes"),
			classification: entities.MetricClassification{
				Category:        entities.MetricCategoryIdentityAndInventory,
				LaneMask:        entities.LaneContext | entities.LaneSnapshot,
				FeatureEligible: false,
				AggregationHint: entities.AggregationHint("direct"),
			},
		},
	}
}

func keySet(keys ...string) map[string]struct{} {
	set := make(map[string]struct{}, len(keys))
	for _, key := range keys {
		set[key] = struct{}{}
	}
	return set
}
