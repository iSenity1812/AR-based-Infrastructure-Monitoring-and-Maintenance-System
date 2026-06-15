package sender

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

const grpcServiceMethod = "/telemetry.v1.TelemetryIngestService/IngestBatch"

// GRPCSender posts payload batches over gRPC.
type GRPCSender struct {
	conn *grpc.ClientConn
}

// NewGRPCSender constructs a gRPC sender using the collector runtime config.
func NewGRPCSender(cfg *config.Config) (*GRPCSender, error) {
	transportCredentials, err := sendTransportCredentials(cfg)
	if err != nil {
		return nil, err
	}

	conn, err := grpc.NewClient(
		cfg.Send.Endpoint,
		grpc.WithTransportCredentials(transportCredentials),
		grpc.WithDefaultCallOptions(grpc.ForceCodec(jsonCodec{})),
	)
	if err != nil {
		return nil, fmt.Errorf("create grpc client: %w", err)
	}

	return &GRPCSender{conn: conn}, nil
}

// Send invokes the IngestBatch gRPC method with the JSON payload body.
func (s *GRPCSender) Send(ctx context.Context, payload Payload) error {
	if err := ValidatePayload(payload); err != nil {
		return err
	}

	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req := payload
	resp := new(struct{})
	if err := s.conn.Invoke(callCtx, grpcServiceMethod, req, resp); err != nil {
		if st, ok := status.FromError(err); ok {
			return GRPCStatusError{Code: int(st.Code()), Message: st.Message()}
		}
		return err
	}
	return nil
}

func sendTransportCredentials(cfg *config.Config) (credentials.TransportCredentials, error) {
	if !cfg.Runtime.RegistrationTLSEnabled {
		return insecure.NewCredentials(), nil
	}

	caPEM, err := os.ReadFile(cfg.Runtime.RegistrationCACertPath)
	if err != nil {
		return nil, fmt.Errorf("read send CA cert %s: %w", cfg.Runtime.RegistrationCACertPath, err)
	}

	roots := x509.NewCertPool()
	if ok := roots.AppendCertsFromPEM(caPEM); !ok {
		return nil, fmt.Errorf("parse send CA cert %s", cfg.Runtime.RegistrationCACertPath)
	}

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		RootCAs:    roots,
		ServerName: cfg.Runtime.RegistrationServerName,
	}

	clientCert, err := loadSendClientCertificate(cfg)
	if err != nil {
		return nil, err
	}
	if clientCert != nil {
		tlsConfig.Certificates = []tls.Certificate{*clientCert}
	}

	return credentials.NewTLS(tlsConfig), nil
}

func loadSendClientCertificate(cfg *config.Config) (*tls.Certificate, error) {
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
		return nil, fmt.Errorf("load send client certificate: %w", err)
	}
	return &certificate, nil
}

type jsonCodec struct{}

func (jsonCodec) Marshal(v any) ([]byte, error) {
	return json.Marshal(v)
}

func (jsonCodec) Unmarshal(data []byte, v any) error {
	return json.Unmarshal(data, v)
}

func (jsonCodec) Name() string {
	return "json"
}

// GRPCStatusError captures non-OK gRPC status codes for retry policy matching.
type GRPCStatusError struct {
	Code    int
	Message string
}

func (e GRPCStatusError) Error() string {
	return fmt.Sprintf("grpc status %d: %s", e.Code, e.Message)
}
