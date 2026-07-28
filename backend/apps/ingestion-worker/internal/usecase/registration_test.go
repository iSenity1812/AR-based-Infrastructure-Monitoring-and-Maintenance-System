package usecase

import (
	"context"
	"testing"

	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
)

type mockPKI struct {
	creds *domain.Credentials
}

func (m *mockPKI) GenerateCredentials(_ context.Context, agentID string) (*domain.Credentials, error) {
	_ = agentID
	return m.creds, nil
}

type mockNodeRepo struct {
	saved *domain.Node
	node  *domain.Node
}

func (m *mockNodeRepo) SaveNode(_ context.Context, node *domain.Node) error {
	m.saved = node
	return nil
}

func (m *mockNodeRepo) FindNodeByAgentID(_ context.Context, agentID string) (*domain.Node, error) {
	_ = agentID
	return m.node, nil
}

var _ port.PKIPort = (*mockPKI)(nil)
var _ port.NodeRepositoryPort = (*mockNodeRepo)(nil)

func TestRegisterPersistsDiscoverySourceAndHardwareMetadata(t *testing.T) {
	uc := NewRegistrationUseCase("bootstrap-token", &mockPKI{
		creds: &domain.Credentials{
			AgentID:     "agent-123",
			Certificate: []byte("cert"),
			PrivateKey:  []byte("key"),
		},
	}, &mockNodeRepo{})

	repo := uc.nodeRepoPort.(*mockNodeRepo)
	_, err := uc.Register(context.Background(), &domain.RegisterRequest{
		BootstrapToken:  "bootstrap-token",
		Hostname:        "node-01",
		DeviceType:      "WORKSTATION",
		DiscoverySource: "windows_exporter",
		HardwareInfo: domain.HardwareInfo{
			PrimaryIPv4:     "10.0.0.10",
			MacAddress:      "AA:BB:CC:DD:EE:FF",
			HardwareSerial:  "SER-123",
			Vendor:          "Dell Inc.",
			Model:           "PowerEdge R740",
			OSProduct:       "Windows 11",
			LogicalCPUCount: 16,
			CPUArchitecture: "amd64",
		},
	})
	if err != nil {
		t.Fatalf("expected register to succeed, got error: %v", err)
	}

	if repo.saved == nil {
		t.Fatal("expected node to be saved")
	}
	if repo.saved.Source != "windows_exporter" {
		t.Fatalf("expected saved node source to be discovery source, got %q", repo.saved.Source)
	}
	if repo.saved.Hardware.Vendor != "Dell Inc." {
		t.Fatalf("expected saved vendor to be preserved, got %q", repo.saved.Hardware.Vendor)
	}
	if repo.saved.Hardware.Model != "PowerEdge R740" {
		t.Fatalf("expected saved model to be preserved, got %q", repo.saved.Hardware.Model)
	}
}
