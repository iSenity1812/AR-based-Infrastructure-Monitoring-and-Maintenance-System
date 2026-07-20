package localca

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type LocalCA struct {
	caCertPath string
	caKeyPath  string
	workDir    string
}

func NewLocalCA(caCertPath, caKeyPath, workDir string) *LocalCA {
	return &LocalCA{
		caCertPath: caCertPath,
		caKeyPath:  caKeyPath,
		workDir:    workDir,
	}
}

func (ca *LocalCA) GenerateCredentials(
	ctx context.Context,
	nodeID string,
) (certPEM, keyPEM []byte, err error) {
	if err := ca.ensureCAAssets(ctx); err != nil {
		return nil, nil, err
	}

	nodeDir := filepath.Join(ca.workDir, "issued", sanitizeFilename(nodeID))
	if err := os.MkdirAll(nodeDir, 0o755); err != nil {
		return nil, nil, fmt.Errorf("failed to create node cert directory: %w", err)
	}

	keyPath := filepath.Join(nodeDir, "client.key")
	csrPath := filepath.Join(nodeDir, "client.csr")
	certPath := filepath.Join(nodeDir, "client.crt")
	extPath := filepath.Join(nodeDir, "client.ext")

	ext := strings.Join([]string{
		"basicConstraints=CA:FALSE",
		"keyUsage=digitalSignature,keyEncipherment",
		"extendedKeyUsage=clientAuth",
		fmt.Sprintf("subjectAltName=DNS:%s", sanitizeDNSName(nodeID)),
		"",
	}, "\n")
	if err := os.WriteFile(extPath, []byte(ext), 0o644); err != nil {
		return nil, nil, fmt.Errorf("failed to write client certificate extensions: %w", err)
	}

	if err := runOpenSSL(ctx, "genrsa", "-out", keyPath, "2048"); err != nil {
		return nil, nil, err
	}
	if err := runOpenSSL(ctx, "req", "-new", "-key", keyPath, "-out", csrPath, "-subj", "/CN="+nodeID); err != nil {
		return nil, nil, err
	}
	if err := runOpenSSL(
		ctx,
		"x509",
		"-req",
		"-in", csrPath,
		"-CA", ca.caCertPath,
		"-CAkey", ca.caKeyPath,
		"-CAcreateserial",
		"-out", certPath,
		"-days", "365",
		"-sha256",
		"-extfile", extPath,
	); err != nil {
		return nil, nil, err
	}

	certPEM, err = os.ReadFile(certPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read generated client certificate: %w", err)
	}
	keyPEM, err = os.ReadFile(keyPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read generated client private key: %w", err)
	}
	return certPEM, keyPEM, nil
}

func (ca *LocalCA) ensureCAAssets(ctx context.Context) error {
	if err := os.MkdirAll(ca.workDir, 0o755); err != nil {
		return fmt.Errorf("failed to create pki work dir: %w", err)
	}
	if fileExists(ca.caCertPath) && fileExists(ca.caKeyPath) {
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(ca.caCertPath), 0o755); err != nil {
		return fmt.Errorf("failed to create ca cert directory: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(ca.caKeyPath), 0o755); err != nil {
		return fmt.Errorf("failed to create ca key directory: %w", err)
	}

	return runOpenSSL(
		ctx,
		"req",
		"-x509",
		"-newkey", "rsa:4096",
		"-nodes",
		"-keyout", ca.caKeyPath,
		"-out", ca.caCertPath,
		"-days", "3650",
		"-sha256",
		"-subj", "/CN=local-ingestion-ca/O=AR Monitoring Local CA",
	)
}

func runOpenSSL(ctx context.Context, args ...string) error {
	opensslPath, err := resolveOpenSSL()
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx, opensslPath, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = err.Error()
		}
		return fmt.Errorf("openssl %s failed: %s", strings.Join(args, " "), message)
	}
	return nil
}

func resolveOpenSSL() (string, error) {
	if override := strings.TrimSpace(os.Getenv("OPENSSL_BIN")); override != "" {
		if fileExists(override) {
			return override, nil
		}
		return "", fmt.Errorf("OPENSSL_BIN points to a missing file: %s", override)
	}

	if path, err := exec.LookPath("openssl"); err == nil {
		return path, nil
	}

	if runtime.GOOS == "windows" {
		for _, candidate := range []string{
			`C:\Program Files\OpenSSL-Win64\bin\openssl.exe`,
			`C:\Program Files\OpenSSL-Win32\bin\openssl.exe`,
			`C:\Program Files\Git\usr\bin\openssl.exe`,
			`C:\Program Files\Git\mingw64\bin\openssl.exe`,
		} {
			if fileExists(candidate) {
				return candidate, nil
			}
		}
	}

	return "", fmt.Errorf("openssl executable not found; set OPENSSL_BIN to its full path")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func sanitizeFilename(value string) string {
	var b strings.Builder
	for _, r := range strings.TrimSpace(value) {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			b.WriteRune(r)
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-', r == '_', r == '.':
			b.WriteRune(r)
		default:
			b.WriteByte('-')
		}
	}
	if b.Len() == 0 {
		return "unknown-node"
	}
	return b.String()
}

func sanitizeDNSName(value string) string {
	return strings.Trim(strings.ToLower(sanitizeFilename(value)), ".")
}
