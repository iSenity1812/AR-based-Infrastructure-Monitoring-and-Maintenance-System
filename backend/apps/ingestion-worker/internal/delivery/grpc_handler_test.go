package delivery

import (
	"context"
	"testing"

	"ingestion-worker/internal/domain"

	pb "github.com/iSenity1812/ingestion-worker-contract/api/registration/v1"
)

type mockRegistrationUseCase struct {
	req *domain.RegisterRequest
}

func (m *mockRegistrationUseCase) Register(_ context.Context, req *domain.RegisterRequest) (*domain.Credentials, error) {
	m.req = req
	return &domain.Credentials{
		AgentID:     "agent-123",
		Certificate: []byte("cert"),
		PrivateKey:  []byte("key"),
	}, nil
}

func TestRegisterNodeMapsDiscoverySourceAndHardwareMetadata(t *testing.T) {
	mock := &mockRegistrationUseCase{}
	handler := NewRegistrationHandler(mock)

	resp, err := handler.RegisterNode(context.Background(), &pb.RegisterNodeRequest{
		BootstrapToken:  "bootstrap-token",
		Hostname:        "node-01",
		DeviceType:      "WORKSTATION",
		DiscoverySource: "windows_exporter",
		HardwareInfo: &pb.HardwareInfo{
			PrimaryIpv4:     "10.0.0.10",
			MacAddress:      "AA:BB:CC:DD:EE:FF",
			HardwareSerial:  "SER-123",
			Vendor:          "Dell Inc.",
			Model:           "PowerEdge R740",
			OsProduct:       "Windows 11",
			LogicalCpuCount: 16,
			CpuArchitecture: "amd64",
		},
	})
	if err != nil {
		t.Fatalf("expected request to succeed, got error: %v", err)
	}

	if resp.GetAgentId() != "agent-123" {
		t.Fatalf("expected agent id to be preserved, got %q", resp.GetAgentId())
	}
	if mock.req == nil {
		t.Fatal("expected registration request to reach the use case")
	}
	if mock.req.DiscoverySource != "windows_exporter" {
		t.Fatalf("expected discovery source to be mapped, got %q", mock.req.DiscoverySource)
	}
	if mock.req.HardwareInfo.Vendor != "Dell Inc." {
		t.Fatalf("expected vendor to be mapped, got %q", mock.req.HardwareInfo.Vendor)
	}
	if mock.req.HardwareInfo.Model != "PowerEdge R740" {
		t.Fatalf("expected model to be mapped, got %q", mock.req.HardwareInfo.Model)
	}
}
