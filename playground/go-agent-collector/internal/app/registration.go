package app

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/hostmeta"
	registrationpb "github.com/iSenity1812/ingestion-worker-contract/api/registration/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"gopkg.in/yaml.v3"
)

type registrationState struct {
	AgentID         string `json:"agentId"`
	CertificatePath string `json:"certificatePath"`
	PrivateKeyPath  string `json:"privateKeyPath"`
	RegisteredAt    string `json:"registeredAt"`
}

type sharedIngestionConfig struct {
	Auth struct {
		BootstrapToken string `yaml:"bootstrap_token"`
	} `yaml:"auth"`
}

func ensureRegistered(cfg *config.Config) error {
	if !cfg.Runtime.RegistrationEnabled {
		return nil
	}

	state, err := loadRegistrationState(cfg.Runtime.RegistrationStatePath)
	if err == nil && state.AgentID != "" {
		applyRegisteredIdentity(cfg, state.AgentID)
		return nil
	}

	bootstrapToken, err := resolveBootstrapToken(cfg)
	if err != nil {
		return err
	}

	callCtx, cancel := context.WithTimeout(
		context.Background(),
		cfg.Runtime.RegistrationTimeout,
	)
	defer cancel()

	transportCredentials, err := registrationTransportCredentials(cfg)
	if err != nil {
		return err
	}

	conn, err := grpc.NewClient(
		cfg.Runtime.RegistrationEndpoint,
		grpc.WithTransportCredentials(transportCredentials),
	)
	if err != nil {
		return fmt.Errorf("create registration client: %w", err)
	}
	defer conn.Close()

	networkMeta := hostmeta.ResolveNetwork(cfg.Network.PrimaryNICHint, "")

	client := registrationpb.NewRegistrationServiceClient(conn)
	response, err := client.RegisterNode(callCtx, buildRegisterNodeRequest(cfg, bootstrapToken, networkMeta))
	if err != nil {
		return fmt.Errorf("register node: %w", err)
	}

	state, err = persistRegistrationState(
		cfg.Runtime.RegistrationStatePath,
		response.GetAgentId(),
		response.GetCertificate(),
		response.GetPrivateKey(),
	)
	if err != nil {
		return err
	}

	applyRegisteredIdentity(cfg, state.AgentID)
	return nil
}

func registrationTransportCredentials(cfg *config.Config) (credentials.TransportCredentials, error) {
	if !cfg.Runtime.RegistrationTLSEnabled {
		return insecure.NewCredentials(), nil
	}

	clientCert, err := loadClientCertificate(cfg)
	if err != nil {
		return nil, err
	}

	caPEM, err := os.ReadFile(cfg.Runtime.RegistrationCACertPath)
	if err != nil {
		return nil, fmt.Errorf("read registration CA cert %s: %w", cfg.Runtime.RegistrationCACertPath, err)
	}

	roots := x509.NewCertPool()
	if ok := roots.AppendCertsFromPEM(caPEM); !ok {
		return nil, fmt.Errorf("parse registration CA cert %s", cfg.Runtime.RegistrationCACertPath)
	}

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		RootCAs:    roots,
		ServerName: cfg.Runtime.RegistrationServerName,
	}
	if clientCert != nil {
		tlsConfig.Certificates = []tls.Certificate{*clientCert}
	}
	return credentials.NewTLS(tlsConfig), nil
}

func loadClientCertificate(cfg *config.Config) (*tls.Certificate, error) {
	certPath := cfg.Runtime.RegistrationClientCertPath
	keyPath := cfg.Runtime.RegistrationClientKeyPath
	if certPath == "" || keyPath == "" {
		return nil, nil
	}
	if _, err := os.Stat(certPath); err != nil {
		return nil, nil
	}
	if _, err := os.Stat(keyPath); err != nil {
		return nil, nil
	}

	certificate, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		return nil, fmt.Errorf("load registration client certificate: %w", err)
	}
	return &certificate, nil
}

func applyRegisteredIdentity(cfg *config.Config, agentID string) {
	cfg.Runtime.AgentID = agentID
	cfg.Agent.Identity.AgentID = agentID
	cfg.Runtime.NodeID = agentID
	cfg.Node.NodeID = agentID
}

func resolveBootstrapToken(cfg *config.Config) (string, error) {
	if token := strings.TrimSpace(os.Getenv("GO_AGENT_BOOTSTRAP_TOKEN")); token != "" {
		return token, nil
	}
	if token := strings.TrimSpace(cfg.Runtime.RegistrationToken); token != "" {
		return token, nil
	}

	configBytes, err := os.ReadFile(cfg.Runtime.RegistrationConfigPath)
	if err != nil {
		return "", fmt.Errorf(
			"read shared ingestion config %s: %w",
			cfg.Runtime.RegistrationConfigPath,
			err,
		)
	}

	var sharedConfig sharedIngestionConfig
	if err := yaml.Unmarshal(configBytes, &sharedConfig); err != nil {
		return "", fmt.Errorf(
			"parse shared ingestion config %s: %w",
			cfg.Runtime.RegistrationConfigPath,
			err,
		)
	}

	token := strings.TrimSpace(sharedConfig.Auth.BootstrapToken)
	if token == "" {
		return "", fmt.Errorf(
			"bootstrap token not found in %s",
			cfg.Runtime.RegistrationConfigPath,
		)
	}
	return token, nil
}

func buildRegisterNodeRequest(
	cfg *config.Config,
	bootstrapToken string,
	networkMeta hostmeta.NetworkMetadata,
) *registrationpb.RegisterNodeRequest {
	return &registrationpb.RegisterNodeRequest{
		BootstrapToken:  bootstrapToken,
		Hostname:        cfg.Node.Hostname,
		DeviceType:      cfg.Runtime.RegistrationDeviceType,
		DiscoverySource: discoverSource(cfg),
		HardwareInfo: &registrationpb.HardwareInfo{
			PrimaryIpv4:     networkMeta.PrimaryIPv4,
			MacAddress:      networkMeta.MACAddress,
			HardwareSerial:  cfg.Runtime.HardwareSerial,
			Vendor:          cfg.Runtime.Vendor,
			Model:           cfg.Runtime.Model,
			OsProduct:       cfg.Runtime.OSProduct,
			LogicalCpuCount: int32(cfg.Runtime.LogicalCPUCount),
			CpuArchitecture: cfg.Runtime.CPUArchitecture,
		},
	}
}

func discoverSource(cfg *config.Config) string {
	source := strings.TrimSpace(cfg.Agent.SourceType)
	if source != "" {
		return source
	}
	return strings.TrimSpace(cfg.Runtime.AgentSourceType)
}

func loadRegistrationState(path string) (*registrationState, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var state registrationState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("parse registration state %s: %w", path, err)
	}
	if strings.TrimSpace(state.AgentID) == "" {
		return nil, fmt.Errorf("registration state %s has empty agent id", path)
	}
	return &state, nil
}

func persistRegistrationState(
	statePath string,
	agentID string,
	certificate []byte,
	privateKey []byte,
) (*registrationState, error) {
	stateDir := filepath.Dir(statePath)
	if err := os.MkdirAll(stateDir, 0o755); err != nil {
		return nil, fmt.Errorf("create registration directory: %w", err)
	}

	certificatePath := filepath.Join(stateDir, "client.crt")
	privateKeyPath := filepath.Join(stateDir, "client.key")
	if err := os.WriteFile(certificatePath, certificate, 0o600); err != nil {
		return nil, fmt.Errorf("write certificate: %w", err)
	}
	if err := os.WriteFile(privateKeyPath, privateKey, 0o600); err != nil {
		return nil, fmt.Errorf("write private key: %w", err)
	}

	state := &registrationState{
		AgentID:         agentID,
		CertificatePath: certificatePath,
		PrivateKeyPath:  privateKeyPath,
		RegisteredAt:    time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal registration state: %w", err)
	}
	if err := os.WriteFile(statePath, data, 0o600); err != nil {
		return nil, fmt.Errorf("write registration state: %w", err)
	}
	return state, nil
}
