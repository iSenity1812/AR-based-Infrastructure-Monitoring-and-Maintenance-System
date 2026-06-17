package app

import (
	"testing"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/hostmeta"
)

func TestBuildRegisterNodeRequestUsesDiscoverySourceAndHardwareVendorModel(t *testing.T) {
	cfg := &config.Config{
		Agent: config.AgentConfig{
			SourceType: "windows_exporter",
		},
		Node: config.NodeConfig{
			Hostname: "node-01",
		},
		Runtime: config.RuntimeConfig{
			AgentSourceType:        "multi_source",
			RegistrationDeviceType: "WORKSTATION",
			HardwareSerial:         "SER-123",
			Vendor:                 "Dell Inc.",
			Model:                  "PowerEdge R740",
			OSProduct:              "Windows 11",
			LogicalCPUCount:        16,
			CPUArchitecture:        "amd64",
		},
	}

	req := buildRegisterNodeRequest(cfg, "bootstrap-token", hostmeta.NetworkMetadata{
		PrimaryIPv4: "10.0.0.10",
		MACAddress:  "AA:BB:CC:DD:EE:FF",
	})

	if req.GetDiscoverySource() != "windows_exporter" {
		t.Fatalf("expected discovery source to stay on the configured source type, got %q", req.GetDiscoverySource())
	}

	hardware := req.GetHardwareInfo()
	if hardware.GetVendor() != "Dell Inc." {
		t.Fatalf("expected vendor to be %q, got %q", "Dell Inc.", hardware.GetVendor())
	}
	if hardware.GetModel() != "PowerEdge R740" {
		t.Fatalf("expected model to be %q, got %q", "PowerEdge R740", hardware.GetModel())
	}
	if hardware.GetHardwareSerial() != "SER-123" {
		t.Fatalf("expected hardware serial to be preserved, got %q", hardware.GetHardwareSerial())
	}
}
