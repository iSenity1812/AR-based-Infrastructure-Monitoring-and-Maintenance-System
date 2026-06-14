package backend

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const grpcMethodName = "/telemetry.v1.TelemetryIngestService/IngestBatch"

type GRPCIngestRequest struct {
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

type GRPCIngestResponse struct {
	Status     string `json:"status"`
	BatchID    string `json:"batchId"`
	AcceptedAt string `json:"acceptedAt"`
}

type envelopePublisher interface {
	Publish(ctx context.Context, envelope TransportEnvelope) error
	Close()
}

func RegisterGRPC(server *grpc.Server, service *Server) {
	server.RegisterService(&grpc.ServiceDesc{
		ServiceName: "telemetry.v1.TelemetryIngestService",
		HandlerType: (*grpcServiceRegistrar)(nil),
		Methods: []grpc.MethodDesc{{
			MethodName: "IngestBatch",
			Handler: func(srv any, ctx context.Context, dec func(any) error, _ grpc.UnaryServerInterceptor) (any, error) {
				req := &GRPCIngestRequest{}
				if err := dec(req); err != nil {
					return nil, status.Error(codes.InvalidArgument, err.Error())
				}
				return srv.(*Server).HandleGRPCIngest(ctx, req)
			},
		}},
	}, service)
}

type grpcServiceRegistrar interface {
	HandleGRPCIngest(context.Context, *GRPCIngestRequest) (*GRPCIngestResponse, error)
}

func (s *Server) HandleGRPCIngest(ctx context.Context, req *GRPCIngestRequest) (*GRPCIngestResponse, error) {
	if mode, ok := s.store.consumeFailure(); ok {
		return nil, mapFailModeToStatus(mode)
	}
	if err := validateGRPCIngestRequest(req); err != nil {
		s.store.recordError(err)
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	if s.publisher == nil {
		err := errors.New("redpanda publisher is not configured")
		s.store.recordError(err)
		return nil, status.Error(codes.FailedPrecondition, err.Error())
	}

	now := s.nowFn().UTC()
	envelope := TransportEnvelope{
		SchemaVersion: req.SchemaVersion,
		AgentID:       req.AgentID,
		AgentName:     req.AgentName,
		BatchID:       req.BatchID,
		RecordCount:   int32(req.RecordCount),
		DroppedCount:  int32(req.DroppedCount),
		SentAt:        req.SentAt,
		ReceivedAt:    now.Format("2006-01-02T15:04:05"),
		ContentType:   req.ContentType,
		Encoding:      req.Encoding,
		PayloadBytes:  append([]byte(nil), req.PayloadBytes...),
	}
	if err := s.publisher.Publish(ctx, envelope); err != nil {
		s.store.recordError(err)
		return nil, status.Error(codes.Unavailable, err.Error())
	}

	payload := decodePayloadBytes(req.PayloadBytes)
	s.store.saveEnvelope(envelope, now, s.redpandaTopic, payload)
	return &GRPCIngestResponse{
		Status:     "accepted",
		BatchID:    req.BatchID,
		AcceptedAt: now.Format("2006-01-02T15:04:05"),
	}, nil
}

func decodePayloadBytes(body []byte) *Payload {
	var payload Payload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil
	}
	return &payload
}

func validateGRPCIngestRequest(req *GRPCIngestRequest) error {
	switch {
	case req == nil:
		return errors.New("request is required")
	case strings.TrimSpace(req.AgentID) == "":
		return errors.New("agentId is required")
	case strings.TrimSpace(req.BatchID) == "":
		return errors.New("batchId is required")
	case len(req.PayloadBytes) == 0:
		return errors.New("payloadBytes is required")
	case strings.TrimSpace(req.ContentType) == "":
		return errors.New("contentType is required")
	case strings.TrimSpace(req.Encoding) == "":
		return errors.New("encoding is required")
	default:
		return nil
	}
}

func mapFailModeToStatus(mode FailMode) error {
	statusCode := mode.StatusCode
	if statusCode == 0 {
		statusCode = http.StatusInternalServerError
	}
	message := mode.Message
	if message == "" {
		message = "simulated backend failure"
	}
	switch statusCode {
	case http.StatusBadRequest:
		return status.Error(codes.InvalidArgument, message)
	case http.StatusTooManyRequests:
		return status.Error(codes.ResourceExhausted, message)
	case http.StatusGatewayTimeout:
		return status.Error(codes.DeadlineExceeded, message)
	case http.StatusServiceUnavailable, http.StatusBadGateway:
		return status.Error(codes.Unavailable, message)
	default:
		if statusCode >= 500 {
			return status.Error(codes.Internal, message)
		}
		return status.Error(codes.Unknown, message)
	}
}
