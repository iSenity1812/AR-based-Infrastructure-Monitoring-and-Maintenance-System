package usecase

import (
	"context"
	"errors"
	"fmt"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
	"time"
)

type TelemetryUseCase struct {
	// repo port.TelemetryRepositoryPort
	nodeRepoPort port.NodeRepositoryPort
	brokerPort   port.TelemetryBrokerPort
}

// Ko su dung broker
// func NewTelemetryUseCase(repo port.TelemetryRepositoryPort) *TelemetryUseCase {
// 	return &TelemetryUseCase{repo: repo}
// }

// Sử dụng broker để chuyển giao dữ liệu đến hệ thống xử lý/ lưu trữ ngoại vi
func NewTelemetryUseCase(nodeRepoPort port.NodeRepositoryPort, brokerPort port.TelemetryBrokerPort) *TelemetryUseCase {
	return &TelemetryUseCase{
		nodeRepoPort: nodeRepoPort,
		brokerPort:   brokerPort,
	}
}

func (uc *TelemetryUseCase) IngestBatch(ctx context.Context, clientDN string, req *domain.IngestBatchRequest) (*domain.IngestBatchResponse, error) {
	receivedAt := time.Now().UTC()
	// 1. Nghiệp vụ bóc tách AgentID từ chứng chỉ bảo mật của Agent gửi lên
	agentID := domain.ExtractAgentIDFromDN(clientDN)
	if agentID != "" {
		req.Agent.AgentID = agentID
	}

	if err := uc.ensureAgentAssigned(ctx, agentID); err != nil {
		return nil, err
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

func (uc *TelemetryUseCase) ensureAgentAssigned(ctx context.Context, agentID string) error {
	if agentID == "" {
		return errors.New("agent id is required before telemetry can be accepted")
	}
	if uc.nodeRepoPort == nil {
		return errors.New("node repository is not configured")
	}

	node, err := uc.nodeRepoPort.FindNodeByAgentID(ctx, agentID)
	if err != nil {
		return fmt.Errorf("failed to load node state: %w", err)
	}
	if node == nil {
		return fmt.Errorf("node %s not found", agentID)
	}
	if node.AssignmentState == domain.AssignmentUnassigned {
		return fmt.Errorf("node %s is unassigned", agentID)
	}

	return nil
}
