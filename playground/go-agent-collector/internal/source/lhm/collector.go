package lhm

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

const sourceName = "lhm"

type Collector struct {
	cfg                 *config.Config
	client              *http.Client
	endpoint            string
	rules               []config.MetricRule
	fingerprintInterval time.Duration
	nowFn               func() time.Time

	mu                  sync.RWMutex
	sharedContext       sender.PayloadContext
	lastFingerprintSync time.Time
}

type treeNode struct {
	Text       string     `json:"Text"`
	Value      string     `json:"Value"`
	Type       string     `json:"Type"`
	HardwareID string     `json:"HardwareId"`
	SensorID   string     `json:"SensorId"`
	Children   []treeNode `json:"Children"`
}

type hardwareRef struct {
	ID   string
	Text string
}

// New returns a new LibreHardwareMonitor source collector.
func New(cfg *config.Config) *Collector {
	timeout := cfg.Runtime.LHMTimeout
	if timeout <= 0 {
		timeout = 3 * time.Second
	}
	interval := cfg.Runtime.LHMFingerprintInterval
	if interval <= 0 {
		interval = 120 * time.Second
	}
	return &Collector{
		cfg:                 cfg,
		client:              &http.Client{Timeout: timeout},
		endpoint:            cfg.LHM.Endpoint,
		rules:               append([]config.MetricRule(nil), cfg.LHMMetrics...),
		fingerprintInterval: interval,
		nowFn:               time.Now,
	}
}

func (c *Collector) Name() string {
	return sourceName
}

func (c *Collector) SharedContext() sender.PayloadContext {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.sharedContext
}

func (c *Collector) Collect() ([]domain.Metric, error) {
	root, err := c.fetchTree()
	if err != nil {
		return nil, err
	}

	samples, fingerprint := c.extract(root)
	c.maybeRefreshFingerprint(fingerprint)
	return c.applyRules(samples), nil
}

func (c *Collector) fetchTree() (treeNode, error) {
	ctx, cancel := context.WithTimeout(context.Background(), c.client.Timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.endpoint, nil)
	if err != nil {
		return treeNode{}, fmt.Errorf("build lhm request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return treeNode{}, fmt.Errorf("fetch lhm data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return treeNode{}, fmt.Errorf("fetch lhm data: unexpected status %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return treeNode{}, fmt.Errorf("read lhm response: %w", err)
	}

	var root treeNode
	if err := json.Unmarshal(body, &root); err != nil {
		return treeNode{}, fmt.Errorf("decode lhm response: %w", err)
	}
	return root, nil
}

func (c *Collector) maybeRefreshFingerprint(fingerprint sender.HardwareFingerprint) {
	now := c.nowFn().UTC()

	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.lastFingerprintSync.IsZero() && now.Sub(c.lastFingerprintSync) < c.fingerprintInterval {
		return
	}

	c.sharedContext = sender.PayloadContext{
		HardwareFingerprint: mergeHardwareFingerprint(c.sharedContext.HardwareFingerprint, fingerprint),
	}
	c.lastFingerprintSync = now
}

func (c *Collector) extract(root treeNode) ([]domain.Metric, sender.HardwareFingerprint) {
	var samples []domain.Metric
	fingerprint := sender.HardwareFingerprint{}
	c.walk(root, hardwareRef{}, &samples, &fingerprint)
	return samples, fingerprint
}

func (c *Collector) walk(node treeNode, current hardwareRef, samples *[]domain.Metric, fingerprint *sender.HardwareFingerprint) {
	next := current
	if node.HardwareID != "" {
		next = hardwareRef{ID: node.HardwareID, Text: node.Text}
		*fingerprint = c.captureFingerprint(*fingerprint, next)
	}
	if node.SensorID != "" && next.ID != "" {
		if sample, ok := toSample(next, node); ok {
			*samples = append(*samples, sample)
		}
	}
	for _, child := range node.Children {
		c.walk(child, next, samples, fingerprint)
	}
}

func (c *Collector) captureFingerprint(current sender.HardwareFingerprint, hw hardwareRef) sender.HardwareFingerprint {
	switch {
	case hw.ID == "/motherboard":
		current.MotherboardModel = firstNonEmpty(current.MotherboardModel, hw.Text)
	case strings.HasPrefix(hw.ID, "/amdcpu/"):
		current.CPUModel = firstNonEmpty(current.CPUModel, hw.Text)
	case strings.HasPrefix(hw.ID, "/gpu-"):
		current.GPUModelPrimary = firstNonEmpty(current.GPUModelPrimary, hw.Text)
	case strings.HasPrefix(hw.ID, "/nvme/"):
		current.SSDModelPrimary = firstNonEmpty(current.SSDModelPrimary, hw.Text)
	case strings.HasPrefix(hw.ID, "/battery/"):
		current.BatteryModel = firstNonEmpty(current.BatteryModel, hw.Text)
	}
	return current
}

func (c *Collector) applyRules(raw []domain.Metric) []domain.Metric {
	index := make(map[string][]domain.Metric)
	for _, sample := range raw {
		index[sample.Name] = append(index[sample.Name], sample)
	}

	out := make([]domain.Metric, 0, len(c.rules))
	for _, rule := range c.rules {
		if !rule.Enabled || len(rule.SourceMetric) == 0 || rule.Aggregation != "direct" {
			continue
		}
		for _, sample := range index[rule.SourceMetric[0]] {
			out = append(out, domain.Metric{
				Name:         rule.Key,
				Value:        sample.Value,
				Unit:         rule.Unit,
				Labels:       pickLabels(sample.Labels, rule.KeepLabels),
				SourceMetric: strings.Join([]string(rule.SourceMetric), ","),
				ScopeType:    rule.ScopeType,
				ScopeID:      c.cfg.Runtime.NodeID,
				Source:       sourceName,
			})
		}
	}
	return out
}

func toSample(hw hardwareRef, leaf treeNode) (domain.Metric, bool) {
	name := metricNameFor(hw.ID, leaf.Type, leaf.Text)
	if name == "" {
		return domain.Metric{}, false
	}
	value, ok := parseMetricValue(name, leaf.Value)
	if !ok {
		return domain.Metric{}, false
	}
	return domain.Metric{
		Name:   name,
		Value:  value,
		Labels: labelsForHardware(hw),
	}, true
}

func metricNameFor(hardwareID, sensorType, text string) string {
	switch {
	case strings.HasPrefix(hardwareID, "/amdcpu/") && sensorType == "Temperature" && text == "Core (Tctl/Tdie)":
		return "lhm.cpu.temperature"
	case strings.HasPrefix(hardwareID, "/amdcpu/") && sensorType == "Power" && text == "Package":
		return "lhm.cpu.package_power"
	case strings.HasPrefix(hardwareID, "/gpu-") && sensorType == "Load" && text == "GPU Core":
		return "lhm.gpu.core_load"
	case strings.HasPrefix(hardwareID, "/gpu-") && sensorType == "Clock" && text == "GPU Core":
		return "lhm.gpu.core_clock"
	case strings.HasPrefix(hardwareID, "/gpu-") && sensorType == "Clock" && text == "GPU Memory":
		return "lhm.gpu.memory_clock"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Temperature" && text == "Composite Temperature":
		return "lhm.nvme.temperature"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Level" && text == "Life":
		return "lhm.nvme.life"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Level" && text == "Percentage Used":
		return "lhm.nvme.percentage_used"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Level" && text == "Available Spare":
		return "lhm.nvme.available_spare"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Factor" && text == "Power On Hours":
		return "lhm.nvme.power_on_hours"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Factor" && text == "Power On Count":
		return "lhm.nvme.power_on_count"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Data" && text == "Data Read":
		return "lhm.nvme.data_read_gb"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Data" && text == "Data Written":
		return "lhm.nvme.data_written_gb"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Data" && text == "Free Space":
		return "lhm.nvme.free_space_gb"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Data" && text == "Total Space":
		return "lhm.nvme.total_space_gb"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Throughput" && text == "Read Rate":
		return "lhm.nvme.read_rate_kb_sec"
	case strings.HasPrefix(hardwareID, "/nvme/") && sensorType == "Throughput" && text == "Write Rate":
		return "lhm.nvme.write_rate_kb_sec"
	case strings.HasPrefix(hardwareID, "/battery/") && sensorType == "Level" && text == "Charge Level":
		return "lhm.battery.charge_pct"
	case strings.HasPrefix(hardwareID, "/battery/") && sensorType == "Level" && text == "Degradation Level":
		return "lhm.battery.degradation_pct"
	case strings.HasPrefix(hardwareID, "/battery/") && sensorType == "Energy" && text == "Designed Capacity":
		return "lhm.battery.design_capacity_mwh"
	case strings.HasPrefix(hardwareID, "/battery/") && sensorType == "Energy" && text == "Fully-Charged Capacity":
		return "lhm.battery.full_charge_capacity_mwh"
	case strings.HasPrefix(hardwareID, "/battery/") && sensorType == "Energy" && text == "Remaining Capacity":
		return "lhm.battery.remaining_capacity_mwh"
	default:
		return ""
	}
}

func parseMetricValue(metricName, raw string) (float64, bool) {
	switch metricName {
	case "lhm.cpu.temperature", "lhm.gpu.core_load", "lhm.nvme.temperature", "lhm.nvme.life", "lhm.nvme.percentage_used", "lhm.nvme.available_spare", "lhm.battery.charge_pct", "lhm.battery.degradation_pct":
		return parseValueWithUnit(raw, map[string]float64{"°C": 1, "%": 1})
	case "lhm.cpu.package_power":
		return parseValueWithUnit(raw, map[string]float64{"W": 1})
	case "lhm.gpu.core_clock", "lhm.gpu.memory_clock":
		return parseValueWithUnit(raw, map[string]float64{"MHz": 1})
	case "lhm.nvme.data_read_gb", "lhm.nvme.data_written_gb", "lhm.nvme.free_space_gb", "lhm.nvme.total_space_gb":
		return parseValueWithUnit(raw, map[string]float64{"GB": 1, "TB": 1024, "MB": 1 / 1024})
	case "lhm.nvme.read_rate_kb_sec", "lhm.nvme.write_rate_kb_sec":
		return parseValueWithUnit(raw, map[string]float64{"B/s": 1 / 1024, "KB/s": 1, "MB/s": 1024, "GB/s": 1024 * 1024})
	case "lhm.battery.design_capacity_mwh", "lhm.battery.full_charge_capacity_mwh", "lhm.battery.remaining_capacity_mwh":
		return parseValueWithUnit(raw, map[string]float64{"mWh": 1, "Wh": 1000})
	case "lhm.nvme.power_on_hours", "lhm.nvme.power_on_count":
		return parsePlainFloat(raw)
	default:
		return 0, false
	}
}

func parseValueWithUnit(raw string, scales map[string]float64) (float64, bool) {
	parts := strings.Fields(strings.TrimSpace(raw))
	if len(parts) == 0 {
		return 0, false
	}
	value, err := strconv.ParseFloat(strings.ReplaceAll(parts[0], ",", ""), 64)
	if err != nil {
		return 0, false
	}
	if len(parts) == 1 {
		return value, true
	}
	scale, ok := scales[parts[1]]
	if !ok {
		return 0, false
	}
	return value * scale, true
}

func parsePlainFloat(raw string) (float64, bool) {
	value, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func labelsForHardware(hw hardwareRef) map[string]string {
	switch {
	case strings.HasPrefix(hw.ID, "/nvme/"):
		return map[string]string{
			"drive":       hw.Text,
			"drive_index": trailingSegment(hw.ID),
		}
	case strings.HasPrefix(hw.ID, "/gpu-"):
		return map[string]string{
			"gpu":       hw.Text,
			"gpu_index": trailingSegment(hw.ID),
		}
	case strings.HasPrefix(hw.ID, "/battery/"):
		return map[string]string{
			"battery": hw.Text,
		}
	default:
		return nil
	}
}

func trailingSegment(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}

func pickLabels(labels map[string]string, keep []string) map[string]string {
	if len(keep) == 0 || len(labels) == 0 {
		return nil
	}
	out := make(map[string]string, len(keep))
	for _, key := range keep {
		if value, ok := labels[key]; ok && strings.TrimSpace(value) != "" {
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergeHardwareFingerprint(base, extra sender.HardwareFingerprint) sender.HardwareFingerprint {
	base.MotherboardModel = firstNonEmpty(extra.MotherboardModel, base.MotherboardModel)
	base.CPUModel = firstNonEmpty(extra.CPUModel, base.CPUModel)
	base.GPUModelPrimary = firstNonEmpty(extra.GPUModelPrimary, base.GPUModelPrimary)
	base.SSDModelPrimary = firstNonEmpty(extra.SSDModelPrimary, base.SSDModelPrimary)
	base.BatteryModel = firstNonEmpty(extra.BatteryModel, base.BatteryModel)
	return base
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
