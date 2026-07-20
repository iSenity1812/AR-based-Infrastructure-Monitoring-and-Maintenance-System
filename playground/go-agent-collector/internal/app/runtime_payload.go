package app

import (
	"fmt"
	"strconv"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/hostmeta"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

type batchCounter struct {
	sequence  int64
	startedAt time.Time
}

func newBatchCounter() *batchCounter {
	return &batchCounter{startedAt: time.Now().UTC()}
}

func buildPayload(cfg *config.Config, records []queueRecord, droppedCount int, counter *batchCounter, sentAt time.Time, sharedContext sender.PayloadContext) sender.Payload {
	counter.sequence++
	collectedAt := latestCollectedAt(records, sentAt)

	metrics := make([]sender.MetricRecord, 0, len(records))
	for _, record := range records {
		metrics = append(metrics, sender.MetricRecord{
			MetricKey:    record.metric.Name,
			ScopeType:    firstNonEmpty(record.metric.ScopeType, "node"),
			ScopeID:      resolveScopeID(cfg, record.metric),
			Value:        metricValue(record.metric),
			Unit:         record.metric.Unit,
			Timestamp:    formatCollectorTime(record.collectedAt),
			Source:       firstNonEmpty(record.metric.Source, cfg.Agent.SourceType),
			SourceMetric: record.metric.SourceMetric,
			Tags:         buildTags(cfg, record.metric),
		})
	}

	return sender.Payload{
		SchemaVersion: cfg.Agent.SchemaVersion,
		Agent: sender.AgentMeta{
			AgentID:      cfg.Runtime.AgentID,
			AgentName:    cfg.Runtime.AgentName,
			SourceType:   firstNonEmpty(cfg.Runtime.AgentSourceType, cfg.Agent.SourceType),
			AgentVersion: cfg.Agent.AgentVersion,
			Hostname:     cfg.Runtime.Hostname,
			StartedAt:    formatCollectorTime(counter.startedAt),
		},
		Batch: sender.BatchMeta{
			BatchID:      fmt.Sprintf("%s-%d", cfg.Runtime.AgentID, counter.sequence),
			Sequence:     counter.sequence,
			CollectedAt:  formatCollectorTime(collectedAt),
			SentAt:       formatCollectorTime(sentAt),
			RecordCount:  len(metrics),
			DroppedCount: droppedCount,
		},
		Context: buildPayloadContext(cfg, records, sharedContext),
		Metrics: metrics,
	}
}

func latestCollectedAt(records []queueRecord, fallback time.Time) time.Time {
	if len(records) == 0 {
		return fallback
	}

	latest := records[0].collectedAt
	for _, record := range records[1:] {
		if record.collectedAt.After(latest) {
			latest = record.collectedAt
		}
	}
	return latest
}

func buildPayloadContext(cfg *config.Config, records []queueRecord, sharedContext sender.PayloadContext) sender.PayloadContext {
	primaryNIC, primaryIPv4 := resolvePrimaryNICContext(records)
	networkMeta := hostmeta.ResolveNetwork(firstNonEmpty(primaryNIC, cfg.Runtime.PrimaryNICHint), primaryIPv4)
	if primaryIPv4 == "" {
		primaryIPv4 = networkMeta.PrimaryIPv4
	}

	logicalCPUCount := cfg.Runtime.LogicalCPUCount
	if logicalCPUCount == 0 {
		logicalCPUCount = resolveLogicalCPUCount(records)
	}
	osProduct := firstNonEmpty(cfg.Runtime.OSProduct, resolveMetricText(records, "node.os_product"))

	base := sender.PayloadContext{
		Identity: sender.ContextIdentity{
			Hostname:   cfg.Runtime.Hostname,
			NodeID:     cfg.Runtime.NodeID,
			Source:     firstNonEmpty(cfg.Runtime.AgentSourceType, cfg.Agent.SourceType),
			DeviceType: cfg.Node.DeviceType,
		},
		HardwareFingerprint: sender.HardwareFingerprint{
			PrimaryIPv4:     primaryIPv4,
			MACAddress:      networkMeta.MACAddress,
			HardwareSerial:  cfg.Runtime.HardwareSerial,
			OSProduct:       osProduct,
			LogicalCPUCount: intToString(logicalCPUCount),
			CPUArchitecture: cfg.Runtime.CPUArchitecture,
		},
	}
	return mergePayloadContexts(base, sharedContext)
}

func mergePayloadContexts(base, extra sender.PayloadContext) sender.PayloadContext {
	base.Identity.Hostname = firstNonEmpty(extra.Identity.Hostname, base.Identity.Hostname)
	base.Identity.NodeID = firstNonEmpty(extra.Identity.NodeID, base.Identity.NodeID)
	base.Identity.Source = firstNonEmpty(extra.Identity.Source, base.Identity.Source)
	base.Identity.DeviceType = firstNonEmpty(extra.Identity.DeviceType, base.Identity.DeviceType)

	base.HardwareFingerprint.PrimaryIPv4 = firstNonEmpty(extra.HardwareFingerprint.PrimaryIPv4, base.HardwareFingerprint.PrimaryIPv4)
	base.HardwareFingerprint.MACAddress = firstNonEmpty(extra.HardwareFingerprint.MACAddress, base.HardwareFingerprint.MACAddress)
	base.HardwareFingerprint.HardwareSerial = firstNonEmpty(extra.HardwareFingerprint.HardwareSerial, base.HardwareFingerprint.HardwareSerial)
	base.HardwareFingerprint.OSProduct = firstNonEmpty(extra.HardwareFingerprint.OSProduct, base.HardwareFingerprint.OSProduct)
	base.HardwareFingerprint.LogicalCPUCount = firstNonEmpty(extra.HardwareFingerprint.LogicalCPUCount, base.HardwareFingerprint.LogicalCPUCount)
	base.HardwareFingerprint.CPUArchitecture = firstNonEmpty(extra.HardwareFingerprint.CPUArchitecture, base.HardwareFingerprint.CPUArchitecture)
	base.HardwareFingerprint.MotherboardModel = firstNonEmpty(extra.HardwareFingerprint.MotherboardModel, base.HardwareFingerprint.MotherboardModel)
	base.HardwareFingerprint.CPUModel = firstNonEmpty(extra.HardwareFingerprint.CPUModel, base.HardwareFingerprint.CPUModel)
	base.HardwareFingerprint.GPUModelPrimary = firstNonEmpty(extra.HardwareFingerprint.GPUModelPrimary, base.HardwareFingerprint.GPUModelPrimary)
	base.HardwareFingerprint.SSDModelPrimary = firstNonEmpty(extra.HardwareFingerprint.SSDModelPrimary, base.HardwareFingerprint.SSDModelPrimary)
	base.HardwareFingerprint.BatteryModel = firstNonEmpty(extra.HardwareFingerprint.BatteryModel, base.HardwareFingerprint.BatteryModel)

	return base
}

func buildTags(_ *config.Config, metric domain.Metric) map[string]string {
	tags := make(map[string]string, len(metric.Labels))
	for key, value := range metric.Labels {
		if shouldOmitMetricTag(key, value) {
			continue
		}
		tags[key] = value
	}
	if len(tags) == 0 {
		return nil
	}
	return tags
}

func resolveScopeID(cfg *config.Config, metric domain.Metric) string {
	if metric.ScopeID != "" {
		return metric.ScopeID
	}
	return cfg.Runtime.NodeID
}

func metricValue(metric domain.Metric) any {
	if metric.TextValue != "" {
		return metric.TextValue
	}
	return metric.Value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func resolvePrimaryNICContext(records []queueRecord) (string, string) {
	for _, record := range records {
		if record.metric.Name != "node.primary_ipv4" {
			continue
		}
		return record.metric.Labels["nic"], firstNonEmpty(record.metric.TextValue, record.metric.Labels["address"])
	}
	return "", ""
}

func resolveMetricText(records []queueRecord, metricKey string) string {
	for _, record := range records {
		if record.metric.Name == metricKey {
			return record.metric.TextValue
		}
	}
	return ""
}

func resolveLogicalCPUCount(records []queueRecord) int {
	for _, record := range records {
		if record.metric.Name == "node.logical_cpu_count" && record.metric.Value > 0 {
			return int(record.metric.Value)
		}
	}
	return 0
}

func intToString(value int) string {
	if value <= 0 {
		return ""
	}
	return strconv.Itoa(value)
}

func shouldOmitMetricTag(key, value string) bool {
	if value == "" {
		return true
	}
	switch key {
	case "nodeId", "node_id", "hostname", "deviceType", "environment", "rackId", "site", "switchId", "primaryNic", "source", "source_type", "configured_primary_nic", "nic_exclusion_rules", "address", "product":
		return true
	default:
		return false
	}
}
