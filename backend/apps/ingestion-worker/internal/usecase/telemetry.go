package usecase

import (
	"context"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
	"time"
)

type TelemetryUseCase struct {
	// repo port.TelemetryRepositoryPort
	brokerPort port.TelemetryBrokerPort
}

// Ko su dung broker
// func NewTelemetryUseCase(repo port.TelemetryRepositoryPort) *TelemetryUseCase {
// 	return &TelemetryUseCase{repo: repo}
// }

// Sử dụng broker để chuyển giao dữ liệu đến hệ thống xử lý/ lưu trữ ngoại vi
func NewTelemetryUseCase(brokerPort port.TelemetryBrokerPort) *TelemetryUseCase {
	return &TelemetryUseCase{brokerPort: brokerPort}
}

func (uc *TelemetryUseCase) IngestBatch(ctx context.Context, clientDN string, req *domain.IngestBatchRequest) (*domain.IngestBatchResponse, error) {
	receivedAt := time.Now().UTC()
	// 1. Nghiệp vụ bóc tách AgentID từ chứng chỉ bảo mật của Agent gửi lên
	agentID := domain.ExtractAgentIDFromDN(clientDN)
	if agentID != "" {
		req.Agent.AgentID = agentID
	}

	// 2. Xây dựng Envelope chứa toàn bộ thông tin cần thiết cho việc xử lý và lưu trữ
	envelopeID := domain.BuildEnvelopeID(req, clientDN, receivedAt)
	envelope := &domain.TelemetryEnvelope{
		EnvelopeID: envelopeID,
		AgentID:    agentID,
		ReceivedAt: receivedAt,
		ClientDN:   clientDN,
		Payload:    *req,
	}

	// 3. Chuyển giao dữ liệu cho Adapter lưu trữ ngoại vi
	if err := uc.brokerPort.PublishTelemetryEnvelope(ctx, envelope); err != nil {
		return nil, err
	}

	return &domain.IngestBatchResponse{
		Accepted:   true,
		EnvelopeID: envelope.EnvelopeID,
		ReceivedAt: envelope.ReceivedAt.Format(time.RFC3339Nano),
	}, nil
}
