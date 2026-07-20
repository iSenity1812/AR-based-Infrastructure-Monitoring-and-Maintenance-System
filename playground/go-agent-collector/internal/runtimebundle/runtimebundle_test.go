package runtimebundle

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureMaterializedCreatesDefaults(t *testing.T) {
	root := t.TempDir()

	if err := EnsureMaterialized(root); err != nil {
		t.Fatalf("materialize runtime bundle: %v", err)
	}

	requiredPaths := []string{
		filepath.Join(root, "configs", "agent.yaml"),
		filepath.Join(root, "configs", "assets.yaml"),
		filepath.Join(root, "configs", "metrics.windows.yaml"),
		filepath.Join(root, "data", "registration", "ca.crt"),
		filepath.Join(root, "data", "registration", "ingestion-worker-config.yaml"),
		filepath.Join(root, "data", "buffer"),
	}

	for _, requiredPath := range requiredPaths {
		if _, err := os.Stat(requiredPath); err != nil {
			t.Fatalf("expected %s to exist: %v", requiredPath, err)
		}
	}
}

func TestEnsureMaterializedHonorsCACertOverride(t *testing.T) {
	root := t.TempDir()
	t.Setenv("GO_AGENT_REGISTRATION_CA_CERT_PEM", "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----")

	if err := EnsureMaterialized(root); err != nil {
		t.Fatalf("materialize runtime bundle: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(root, "data", "registration", "ca.crt"))
	if err != nil {
		t.Fatalf("read ca cert: %v", err)
	}

	if !strings.Contains(string(data), "TEST") {
		t.Fatalf("expected CA cert override to be written, got %q", string(data))
	}
}
