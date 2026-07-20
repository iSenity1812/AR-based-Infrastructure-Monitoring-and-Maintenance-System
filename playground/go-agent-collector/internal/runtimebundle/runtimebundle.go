package runtimebundle

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

//go:embed assets/configs/*.yaml assets/registration/*
var embeddedAssets embed.FS

var defaultFiles = map[string]string{
	"configs/agent.yaml":                             "assets/configs/agent.yaml",
	"configs/assets.yaml":                            "assets/configs/assets.yaml",
	"configs/metrics.windows.yaml":                   "assets/configs/metrics.windows.yaml",
	"configs/metrics.linux.yaml":                     "assets/configs/metrics.linux.yaml",
	"configs/metrics.docker.yaml":                    "assets/configs/metrics.docker.yaml",
	"configs/metrics.lhm.yaml":                       "assets/configs/metrics.lhm.yaml",
	"data/registration/ca.crt":                       "assets/registration/ca.crt",
	"data/registration/ingestion-worker-config.yaml": "assets/registration/ingestion-worker-config.yaml",
}

// EnsureMaterialized writes the default runtime bundle next to the executable
// when files are missing, so the agent can run as a portable binary.
func EnsureMaterialized(baseDir string) error {
	for target, source := range defaultFiles {
		if err := writeIfMissing(baseDir, target, source); err != nil {
			return err
		}
	}

	if err := os.MkdirAll(filepath.Join(baseDir, "data", "buffer"), 0o755); err != nil {
		return fmt.Errorf("create buffer dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(baseDir, "data", "registration"), 0o755); err != nil {
		return fmt.Errorf("create registration dir: %w", err)
	}

	if err := materializeCACertOverride(baseDir); err != nil {
		return err
	}

	return nil
}

func writeIfMissing(baseDir, target, source string) error {
	targetPath := filepath.Join(baseDir, filepath.FromSlash(target))
	if _, err := os.Stat(targetPath); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("stat %s: %w", targetPath, err)
	}

	data, err := fs.ReadFile(embeddedAssets, source)
	if err != nil {
		return fmt.Errorf("read embedded asset %s: %w", source, err)
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return fmt.Errorf("create parent dir for %s: %w", targetPath, err)
	}
	if err := os.WriteFile(targetPath, data, defaultModeFor(targetPath)); err != nil {
		return fmt.Errorf("write %s: %w", targetPath, err)
	}
	return nil
}

func materializeCACertOverride(baseDir string) error {
	pem := strings.TrimSpace(os.Getenv("GO_AGENT_REGISTRATION_CA_CERT_PEM"))
	if pem == "" {
		return nil
	}

	if !strings.HasSuffix(pem, "\n") {
		pem += "\n"
	}

	targetPath := filepath.Join(baseDir, "data", "registration", "ca.crt")
	if err := os.WriteFile(targetPath, []byte(pem), 0o600); err != nil {
		return fmt.Errorf("write CA cert override %s: %w", targetPath, err)
	}
	return nil
}

func defaultModeFor(path string) fs.FileMode {
	switch filepath.Ext(path) {
	case ".crt":
		return 0o600
	default:
		return 0o644
	}
}
