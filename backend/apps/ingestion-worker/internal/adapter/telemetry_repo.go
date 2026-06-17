package adapter

import (
	"context"
	"fmt"
	"time"

	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
)

type TelemetryConsoleAdapter struct{}

func NewTelemetryConsoleAdapter() port.TelemetryRepositoryPort {
	return &TelemetryConsoleAdapter{}
}

func (a *TelemetryConsoleAdapter) SaveEnvelope(ctx context.Context, envelope *domain.TelemetryEnvelope) error {
	// Di dời luồng xuất kết quả/nhật ký nghiệp vụ ra khỏi Delivery Layer
	fmt.Printf(
		"Telemetry envelope accepted: envelopeId=%s agentId=%s batchId=%s clientDn=%s recordCount=%d receivedAt=%s\n",
		envelope.EnvelopeID,
		envelope.Payload.Agent.AgentID,
		envelope.Payload.Batch.BatchID,
		envelope.ClientDN,
		envelope.Payload.Batch.RecordCount,
		envelope.ReceivedAt.Format(time.RFC3339Nano),
	)
	return nil
}
