package port

import (
	"context"
	"ingestion-worker/internal/domain"
)

// TelemetryRepositoryPort định nghĩa giao tiếp đầu ra để lưu trữ Envelopes (Outbound Port)
type TelemetryRepositoryPort interface {
	SaveEnvelope(ctx context.Context, envelope *domain.TelemetryEnvelope) error
}

// TelemetryUseCasePort định nghĩa giao tiếp nghiệp vụ đầu vào (Inbound Port)
type TelemetryUseCasePort interface {
	IngestBatch(ctx context.Context, clientDN string, req *domain.IngestBatchRequest) (*domain.IngestBatchResponse, error)
}

type TelemetryBrokerPort interface {
	PublishTelemetryEnvelope(ctx context.Context, envelope *domain.TelemetryEnvelope) error
	Close() error
}
