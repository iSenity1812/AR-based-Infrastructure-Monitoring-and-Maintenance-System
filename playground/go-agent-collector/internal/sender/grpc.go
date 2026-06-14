package sender

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/encoding"
	"google.golang.org/grpc/status"
)

const (
	grpcServiceMethod = "/telemetry.v1.TelemetryIngestService/IngestBatch"
	contentTypeJSON   = "application/json"
	payloadEncoding   = "json"
)

func init() {
	encoding.RegisterCodec(jsonCodec{})
}

// GRPCSender sends telemetry batches over unary gRPC.
type GRPCSender struct {
	endpoint string
	timeout  time.Duration
	conn     *grpc.ClientConn
}

type grpcIngestRequest struct {
	SchemaVersion string `json:"schemaVersion"`
	AgentID       string `json:"agentId"`
	AgentName     string `json:"agentName"`
	BatchID       string `json:"batchId"`
	RecordCount   int    `json:"recordCount"`
	DroppedCount  int    `json:"droppedCount"`
	SentAt        string `json:"sentAt"`
	ContentType   string `json:"contentType"`
	Encoding      string `json:"encoding"`
	PayloadBytes  []byte `json:"payloadBytes"`
}

type grpcIngestResponse struct {
	Status     string `json:"status"`
	BatchID    string `json:"batchId"`
	AcceptedAt string `json:"acceptedAt"`
}

type GRPCStatusError struct {
	Code codes.Code
}

func (e GRPCStatusError) Error() string {
	return fmt.Sprintf("unexpected grpc status code: %s", e.Code.String())
}

// NewGRPCSender constructs a gRPC sender from config.
func NewGRPCSender(cfg *config.Config) (*GRPCSender, error) {
	timeout := cfg.Runtime.GRPCSendTimeout
	if timeout <= 0 {
		timeout = 15 * time.Second
	}

	conn, err := grpc.NewClient(
		cfg.Send.Endpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.ForceCodec(jsonCodec{})),
	)
	if err != nil {
		return nil, err
	}

	return &GRPCSender{
		endpoint: cfg.Send.Endpoint,
		timeout:  timeout,
		conn:     conn,
	}, nil
}

// Send posts a batch payload to the configured gRPC service.
func (s *GRPCSender) Send(ctx context.Context, payload Payload) error {
	if err := ValidatePayload(payload); err != nil {
		return err
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	callCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	req := &grpcIngestRequest{
		SchemaVersion: payload.SchemaVersion,
		AgentID:       payload.Agent.AgentID,
		AgentName:     payload.Agent.AgentName,
		BatchID:       payload.Batch.BatchID,
		RecordCount:   payload.Batch.RecordCount,
		DroppedCount:  payload.Batch.DroppedCount,
		SentAt:        payload.Batch.SentAt,
		ContentType:   contentTypeJSON,
		Encoding:      payloadEncoding,
		PayloadBytes:  body,
	}
	resp := &grpcIngestResponse{}
	if err := s.conn.Invoke(callCtx, grpcServiceMethod, req, resp); err != nil {
		if st, ok := status.FromError(err); ok {
			return GRPCStatusError{Code: st.Code()}
		}
		return err
	}
	if strings.ToLower(resp.Status) != "accepted" {
		return fmt.Errorf("unexpected grpc response status %q", resp.Status)
	}
	return nil
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
