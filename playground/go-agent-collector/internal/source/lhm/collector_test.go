package lhm

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
)

func TestCollectorCollectsMetricsAndSharedFingerprint(t *testing.T) {
	body, err := os.ReadFile(filepath.Join("..", "..", "..", "docs", "hlm-data.json"))
	if err != nil {
		t.Fatalf("read sample lhm json: %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}))
	defer server.Close()

	cfg := &config.Config{}
	cfg.Runtime.NodeID = "node-1"
	cfg.LHM.Endpoint = server.URL
	cfg.Runtime.LHMTimeout = 2 * time.Second
	cfg.Runtime.LHMFingerprintInterval = 120 * time.Second
	cfg.LHMMetrics = []config.MetricRule{
		{Enabled: true, Key: "node.cpu_temperature_c", SourceMetric: config.StringList{"lhm.cpu.temperature"}, ScopeType: "node", Unit: "C", ValueType: "gauge", Aggregation: "direct"},
		{Enabled: true, Key: "node.gpu_core_load_pct", SourceMetric: config.StringList{"lhm.gpu.core_load"}, ScopeType: "node", Unit: "%", ValueType: "gauge", Aggregation: "direct", KeepLabels: []string{"gpu", "gpu_index"}},
		{Enabled: true, Key: "node.ssd_life_pct", SourceMetric: config.StringList{"lhm.nvme.life"}, ScopeType: "node", Unit: "%", ValueType: "gauge", Aggregation: "direct", KeepLabels: []string{"drive", "drive_index"}},
		{Enabled: true, Key: "node.battery_charge_pct", SourceMetric: config.StringList{"lhm.battery.charge_pct"}, ScopeType: "node", Unit: "%", ValueType: "gauge", Aggregation: "direct", KeepLabels: []string{"battery"}},
	}

	collector := New(cfg)
	collector.nowFn = func() time.Time { return time.Date(2026, 6, 12, 8, 0, 0, 0, time.UTC) }

	metrics, err := collector.Collect()
	if err != nil {
		t.Fatalf("collect metrics: %v", err)
	}
	if len(metrics) < 5 {
		t.Fatalf("expected lhm metrics to be collected, got %d", len(metrics))
	}

	ctx := collector.SharedContext()
	if ctx.HardwareFingerprint.MotherboardModel != "MSI MS-158L" {
		t.Fatalf("expected motherboard model in shared fingerprint, got %#v", ctx.HardwareFingerprint)
	}
	if ctx.HardwareFingerprint.CPUModel == "" || ctx.HardwareFingerprint.GPUModelPrimary == "" || ctx.HardwareFingerprint.SSDModelPrimary == "" || ctx.HardwareFingerprint.BatteryModel == "" {
		t.Fatalf("expected shared fingerprint fields to be populated, got %#v", ctx.HardwareFingerprint)
	}

	var sawGPU, sawDrive, sawBattery bool
	for _, metric := range metrics {
		switch metric.Name {
		case "node.gpu_core_load_pct":
			if metric.Labels["gpu"] != "" && metric.Labels["gpu_index"] != "" {
				sawGPU = true
			}
		case "node.ssd_life_pct":
			if metric.Labels["drive"] != "" && metric.Labels["drive_index"] != "" {
				sawDrive = true
			}
		case "node.battery_charge_pct":
			if metric.Labels["battery"] != "" {
				sawBattery = true
			}
		}
	}
	if !sawGPU || !sawDrive || !sawBattery {
		t.Fatalf("expected gpu/drive/battery labels to be preserved, got %#v", metrics)
	}
}

func TestCollectorKeepsFingerprintWhenLaterFetchFails(t *testing.T) {
	body, err := os.ReadFile(filepath.Join("..", "..", "..", "docs", "hlm-data.json"))
	if err != nil {
		t.Fatalf("read sample lhm json: %v", err)
	}

	responses := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		responses++
		if responses == 1 {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(body)
			return
		}
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer server.Close()

	cfg := &config.Config{}
	cfg.Runtime.NodeID = "node-1"
	cfg.LHM.Endpoint = server.URL
	cfg.Runtime.LHMTimeout = 2 * time.Second
	cfg.Runtime.LHMFingerprintInterval = 120 * time.Second
	cfg.LHMMetrics = []config.MetricRule{
		{Enabled: true, Key: "node.cpu_temperature_c", SourceMetric: config.StringList{"lhm.cpu.temperature"}, ScopeType: "node", Unit: "C", ValueType: "gauge", Aggregation: "direct"},
	}

	collector := New(cfg)
	collector.nowFn = func() time.Time { return time.Date(2026, 6, 12, 8, 0, 0, 0, time.UTC) }
	if _, err := collector.Collect(); err != nil {
		t.Fatalf("first collect: %v", err)
	}
	first := collector.SharedContext()

	collector.nowFn = func() time.Time { return time.Date(2026, 6, 12, 8, 0, 15, 0, time.UTC) }
	if _, err := collector.Collect(); err == nil {
		t.Fatalf("expected second collect to fail")
	}
	second := collector.SharedContext()
	if second.HardwareFingerprint.MotherboardModel != first.HardwareFingerprint.MotherboardModel {
		t.Fatalf("expected cached fingerprint to survive fetch failure, got first=%#v second=%#v", first.HardwareFingerprint, second.HardwareFingerprint)
	}
}
