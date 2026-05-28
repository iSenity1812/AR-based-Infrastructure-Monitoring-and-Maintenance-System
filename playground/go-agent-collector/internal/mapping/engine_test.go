package mapping

import (
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

func TestEngineMapsDerivedAndRateMetrics(t *testing.T) {
	cfg := &config.Config{
		Metrics: []config.MetricRule{
			{
				Key:          "node.memory_used_pct",
				Enabled:      true,
				SourceMetric: config.StringList{"windows_memory_available_bytes", "windows_memory_physical_total_bytes"},
				ScopeType:    "node",
				Unit:         "%",
				Aggregation:  "derive_used_pct",
			},
			{
				Key:          "node.network_rx_bytes_sec",
				Enabled:      true,
				SourceMetric: config.StringList{"windows_net_bytes_received_total"},
				ScopeType:    "node",
				Unit:         "bytes/sec",
				Aggregation:  "select_primary_nic_rate",
				KeepLabels:   []string{"nic"},
			},
		},
		Network: config.NetworkConfig{
			ExcludeNICPatterns: []string{"Loopback"},
		},
	}

	engine := New(cfg)
	base := time.Date(2026, 5, 28, 5, 0, 0, 0, time.UTC)
	engine.clock = func() time.Time { return base }
	first, err := engine.Map([]domain.Metric{
		{Name: "windows_memory_available_bytes", Value: 4, Labels: nil},
		{Name: "windows_memory_physical_total_bytes", Value: 16, Labels: nil},
		{Name: "windows_net_nic_address_info", Value: 1, Labels: map[string]string{"nic": "Wi-Fi", "family": "ipv4", "address": "192.168.1.2"}},
		{Name: "windows_net_bytes_received_total", Value: 100, Labels: map[string]string{"nic": "Wi-Fi"}},
	})
	if err != nil {
		t.Fatalf("map first snapshot: %v", err)
	}
	if len(first) != 1 || first[0].Name != "node.memory_used_pct" || first[0].Value != 75 {
		t.Fatalf("expected first pass to emit only derived memory metric, got %#v", first)
	}

	engine.clock = func() time.Time { return base.Add(5 * time.Second) }
	second, err := engine.Map([]domain.Metric{
		{Name: "windows_memory_available_bytes", Value: 6, Labels: nil},
		{Name: "windows_memory_physical_total_bytes", Value: 16, Labels: nil},
		{Name: "windows_net_nic_address_info", Value: 1, Labels: map[string]string{"nic": "Wi-Fi", "family": "ipv4", "address": "192.168.1.2"}},
		{Name: "windows_net_bytes_received_total", Value: 160, Labels: map[string]string{"nic": "Wi-Fi"}},
	})
	if err != nil {
		t.Fatalf("map second snapshot: %v", err)
	}
	if len(second) != 2 {
		t.Fatalf("expected derived + rate metric, got %#v", second)
	}
	if second[0].Name != "node.memory_used_pct" || second[0].Value != 62.5 {
		t.Fatalf("unexpected memory metric %#v", second[0])
	}
	if second[1].Name != "node.network_rx_bytes_sec" || second[1].Value != 12 {
		t.Fatalf("unexpected rate metric %#v", second[1])
	}
}
