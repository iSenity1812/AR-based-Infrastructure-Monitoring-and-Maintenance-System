package sender

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
	telemetrypb "ingestion-worker/api/telemetry/v1"
)

// GRPCSender posts payload batches over gRPC.
type GRPCSender struct {
	conn   *grpc.ClientConn
	client telemetrypb.TelemetryIngestServiceClient
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
	)
	if err != nil {
		return nil, fmt.Errorf("create grpc client: %w", err)
	}

	return &GRPCSender{
		conn:   conn,
		client: telemetrypb.NewTelemetryIngestServiceClient(conn),
	}, nil
}

// Send invokes the IngestBatch gRPC method with protobuf messages.
func (s *GRPCSender) Send(ctx context.Context, payload Payload) error {
	if err := ValidatePayload(payload); err != nil {
		return err
	}

	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := toProtoPayload(payload)
	if err != nil {
		return err
	}

	if _, err := s.client.IngestBatch(callCtx, req); err != nil {
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

func toProtoPayload(payload Payload) (*telemetrypb.IngestBatchRequest, error) {
	metrics := make([]*telemetrypb.MetricRecord, 0, len(payload.Metrics))
	for _, metric := range payload.Metrics {
		value, err := structpb.NewValue(metric.Value)
		if err != nil {
			return nil, fmt.Errorf("convert metric %s value to protobuf: %w", metric.MetricKey, err)
		}
		metrics = append(metrics, &telemetrypb.MetricRecord{
			MetricKey:    metric.MetricKey,
			ScopeType:    metric.ScopeType,
			ScopeId:      metric.ScopeID,
			Value:        value,
			Unit:         metric.Unit,
			Timestamp:    metric.Timestamp,
			Source:       metric.Source,
			SourceMetric: metric.SourceMetric,
			Tags:         metric.Tags,
		})
	}

	return &telemetrypb.IngestBatchRequest{
		SchemaVersion: payload.SchemaVersion,
		Agent: &telemetrypb.AgentMeta{
			AgentId:      payload.Agent.AgentID,
			AgentName:    payload.Agent.AgentName,
			SourceType:   payload.Agent.SourceType,
			AgentVersion: payload.Agent.AgentVersion,
			Hostname:     payload.Agent.Hostname,
			StartedAt:    payload.Agent.StartedAt,
		},
		Batch: &telemetrypb.BatchMeta{
			BatchId:      payload.Batch.BatchID,
			Sequence:     payload.Batch.Sequence,
			CollectedAt:  payload.Batch.CollectedAt,
			SentAt:       payload.Batch.SentAt,
			RecordCount:  int32(payload.Batch.RecordCount),
			DroppedCount: int32(payload.Batch.DroppedCount),
		},
		Context: &telemetrypb.PayloadContext{
			Identity: &telemetrypb.ContextIdentity{
				Hostname:   payload.Context.Identity.Hostname,
				NodeId:     payload.Context.Identity.NodeID,
				Source:     payload.Context.Identity.Source,
				DeviceType: payload.Context.Identity.DeviceType,
			},
			HardwareFingerprint: &telemetrypb.HardwareFingerprint{
				PrimaryIpv4:      payload.Context.HardwareFingerprint.PrimaryIPv4,
				MacAddress:       payload.Context.HardwareFingerprint.MACAddress,
				HardwareSerial:   payload.Context.HardwareFingerprint.HardwareSerial,
				OsProduct:        payload.Context.HardwareFingerprint.OSProduct,
				LogicalCpuCount:  payload.Context.HardwareFingerprint.LogicalCPUCount,
				CpuArchitecture:  payload.Context.HardwareFingerprint.CPUArchitecture,
				MotherboardModel: payload.Context.HardwareFingerprint.MotherboardModel,
				CpuModel:         payload.Context.HardwareFingerprint.CPUModel,
				GpuModelPrimary:  payload.Context.HardwareFingerprint.GPUModelPrimary,
				SsdModelPrimary:  payload.Context.HardwareFingerprint.SSDModelPrimary,
				BatteryModel:     payload.Context.HardwareFingerprint.BatteryModel,
			},
		},
		Metrics: metrics,
	}, nil
}

// GRPCStatusError captures non-OK gRPC status codes for retry policy matching.
type GRPCStatusError struct {
	Code    int
	Message string
}

func (e GRPCStatusError) Error() string {
	return fmt.Sprintf("grpc status %d: %s", e.Code, e.Message)
}
