package delivery

import (
	"context"
	"net"
	"testing"

	telemetrypb "ingestion-worker/api/telemetry/v1"
	"ingestion-worker/internal/domain"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
	"google.golang.org/protobuf/types/known/structpb"
)

type fakeTelemetryUseCase struct {
	lastClientDN string
	lastReq      *domain.IngestBatchRequest
	resp         *domain.IngestBatchResponse
	err          error
}

func (f *fakeTelemetryUseCase) IngestBatch(ctx context.Context, clientDN string, req *domain.IngestBatchRequest) (*domain.IngestBatchResponse, error) {
	f.lastClientDN = clientDN
	f.lastReq = req
	return f.resp, f.err
}

func TestTelemetryHandlerSupportsProtoGRPCIngestBatch(t *testing.T) {
	t.Parallel()

	listener := bufconn.Listen(1024 * 1024)
	useCase := &fakeTelemetryUseCase{
		resp: &domain.IngestBatchResponse{
			Accepted:   true,
			EnvelopeID: "env-123",
			ReceivedAt: "2026-06-16T03:00:00Z",
		},
	}

	server := grpc.NewServer()
	telemetrypb.RegisterTelemetryIngestServiceServer(server, NewTelemetryIngestHandler(useCase))

	go func() {
		if err := server.Serve(listener); err != nil {
			t.Logf("grpc server stopped: %v", err)
		}
	}()
	t.Cleanup(server.Stop)

	conn, err := grpc.NewClient(
		"passthrough:///bufnet",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return listener.DialContext(ctx)
		}),
	)
	if err != nil {
		t.Fatalf("create grpc client: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	client := telemetrypb.NewTelemetryIngestServiceClient(conn)
	value, err := structpb.NewValue(42.5)
	if err != nil {
		t.Fatalf("create protobuf value: %v", err)
	}

	resp, err := client.IngestBatch(context.Background(), &telemetrypb.IngestBatchRequest{
		SchemaVersion: "v1",
		Agent: &telemetrypb.AgentMeta{
			AgentId:      "agent-1",
			AgentName:    "node-msi",
			SourceType:   "windows_exporter",
			AgentVersion: "0.1.0",
			Hostname:     "node-msi",
			StartedAt:    "2026-06-16T02:39:37Z",
		},
		Batch: &telemetrypb.BatchMeta{
			BatchId:      "node-msi-42d8ae94-14",
			Sequence:     14,
			CollectedAt:  "2026-06-16T02:39:37Z",
			SentAt:       "2026-06-16T02:39:38Z",
			RecordCount:  99,
			DroppedCount: 0,
		},
		Context: &telemetrypb.PayloadContext{
			Identity: &telemetrypb.ContextIdentity{
				Hostname:   "node-msi",
				NodeId:     "node-msi-1",
				Source:     "windows_exporter",
				DeviceType: "WORKSTATION",
			},
		},
		Metrics: []*telemetrypb.MetricRecord{
			{
				MetricKey:    "cpu_usage",
				ScopeType:    "node",
				ScopeId:      "node-msi-1",
				Value:        value,
				Unit:         "percent",
				Timestamp:    "2026-06-16T02:39:37Z",
				Source:       "windows_exporter",
				SourceMetric: "windows_cpu_time_total",
				Tags:         map[string]string{"cpu": "_total"},
			},
		},
	})
	if err != nil {
		t.Fatalf("IngestBatch returned error: %v", err)
	}

	if !resp.GetAccepted() {
		t.Fatalf("expected accepted response")
	}
	if got := resp.GetEnvelopeId(); got != "env-123" {
		t.Fatalf("expected envelope id env-123, got %q", got)
	}
	if useCase.lastReq == nil {
		t.Fatalf("expected use case request to be captured")
	}
	if got := useCase.lastReq.Batch.BatchID; got != "node-msi-42d8ae94-14" {
		t.Fatalf("expected batch id to map through protobuf, got %q", got)
	}
	if got := useCase.lastReq.Metrics[0].Value; got != 42.5 {
		t.Fatalf("expected metric value 42.5, got %#v", got)
	}
}
