package delivery

import (
	"context"
	"fmt"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"

	telemetrypb "github.com/iSenity1812/ingestion-worker-contract/api/telemetry/v1"
	"google.golang.org/protobuf/types/known/structpb"
)

// TelemetryIngestHandler keeps the worker app focused on envelope wrapping.
type TelemetryIngestHandler struct {
	telemetrypb.UnimplementedTelemetryIngestServiceServer
	useCase port.TelemetryUseCasePort
}

func NewTelemetryIngestHandler(useCase port.TelemetryUseCasePort) *TelemetryIngestHandler {
	return &TelemetryIngestHandler{
		useCase: useCase,
	}
}

func (h *TelemetryIngestHandler) IngestBatch(ctx context.Context, req *telemetrypb.IngestBatchRequest) (*telemetrypb.IngestBatchResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("request cannot be nil")
	}

	clientDN := clientCertDN(ctx)
	domainReq, err := toDomainIngestBatchRequest(req)
	if err != nil {
		return nil, fmt.Errorf("invalid ingest batch request: %w", err)
	}

	resp, err := h.useCase.IngestBatch(ctx, clientDN, domainReq)
	if err != nil {
		return nil, fmt.Errorf("failed to ingest batch: %w", err)
	}

	fmt.Printf(
		"IngestBatch response: accepted=%t envelopeId=%s receivedAt=%s\n",
		resp.Accepted,
		resp.EnvelopeID,
		resp.ReceivedAt,
	)

	return &telemetrypb.IngestBatchResponse{
		Accepted:   resp.Accepted,
		EnvelopeId: resp.EnvelopeID,
		ReceivedAt: resp.ReceivedAt,
	}, nil
}

func toDomainIngestBatchRequest(req *telemetrypb.IngestBatchRequest) (*domain.IngestBatchRequest, error) {
	metrics := make([]domain.MetricRecord, 0, len(req.GetMetrics()))
	for _, metric := range req.GetMetrics() {
		value, err := fromProtoValue(metric.GetValue())
		if err != nil {
			return nil, fmt.Errorf("metric %s value: %w", metric.GetMetricKey(), err)
		}

		metrics = append(metrics, domain.MetricRecord{
			MetricKey:    metric.GetMetricKey(),
			ScopeType:    metric.GetScopeType(),
			ScopeID:      metric.GetScopeId(),
			Value:        value,
			Unit:         metric.GetUnit(),
			Timestamp:    metric.GetTimestamp(),
			Source:       metric.GetSource(),
			SourceMetric: metric.GetSourceMetric(),
			Tags:         metric.GetTags(),
		})
	}

	agent := req.GetAgent()
	batch := req.GetBatch()
	payloadContext := req.GetContext()
	identity := payloadContext.GetIdentity()
	hardware := payloadContext.GetHardwareFingerprint()

	return &domain.IngestBatchRequest{
		SchemaVersion: req.GetSchemaVersion(),
		Agent: domain.AgentMeta{
			AgentID:      agent.GetAgentId(),
			AgentName:    agent.GetAgentName(),
			SourceType:   agent.GetSourceType(),
			AgentVersion: agent.GetAgentVersion(),
			Hostname:     agent.GetHostname(),
			StartedAt:    agent.GetStartedAt(),
		},
		Batch: domain.BatchMeta{
			BatchID:      batch.GetBatchId(),
			Sequence:     batch.GetSequence(),
			CollectedAt:  batch.GetCollectedAt(),
			SentAt:       batch.GetSentAt(),
			RecordCount:  int(batch.GetRecordCount()),
			DroppedCount: int(batch.GetDroppedCount()),
		},
		Context: domain.PayloadContext{
			Identity: domain.ContextIdentity{
				Hostname:   identity.GetHostname(),
				NodeID:     identity.GetNodeId(),
				Source:     identity.GetSource(),
				DeviceType: identity.GetDeviceType(),
			},
			HardwareFingerprint: domain.HardwareFingerprint{
				PrimaryIPv4:      hardware.GetPrimaryIpv4(),
				MACAddress:       hardware.GetMacAddress(),
				HardwareSerial:   hardware.GetHardwareSerial(),
				OSProduct:        hardware.GetOsProduct(),
				LogicalCPUCount:  hardware.GetLogicalCpuCount(),
				CPUArchitecture:  hardware.GetCpuArchitecture(),
				MotherboardModel: hardware.GetMotherboardModel(),
				CPUModel:         hardware.GetCpuModel(),
				GPUModelPrimary:  hardware.GetGpuModelPrimary(),
				SSDModelPrimary:  hardware.GetSsdModelPrimary(),
				BatteryModel:     hardware.GetBatteryModel(),
			},
		},
		Metrics: metrics,
	}, nil
}

func fromProtoValue(value *structpb.Value) (any, error) {
	if value == nil {
		return nil, nil
	}

	return value.AsInterface(), nil
}
