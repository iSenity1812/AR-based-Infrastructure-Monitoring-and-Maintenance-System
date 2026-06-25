package usecases

import (
	"context"
	"errors"
	"strings"
	"time"

	"telemetry-shaping-service/internal/application/dto"
)

type Disposition string

const (
	DispositionCommit Disposition = "commit"
	DispositionRetry  Disposition = "retry"
)

var ErrTransportValidation = errors.New("transport validation failed")
var ErrPoisonMessage = errors.New("poison message")

type HandoffResult struct {
	Disposition Disposition
	Reason      string
}

type ValidationIssue struct {
	Field   string
	Message string
}

// EnvelopeSink is the application boundary the inbound Kafka adapter hands off to
// after transport-level validation completes.
type EnvelopeSink interface {
	Handle(ctx context.Context, envelope dto.IngressEnvelope) (HandoffResult, error)
}

// DLQWriter persists non-retryable messages so operators can inspect or replay
// them later without blocking the hot ingestion path.
type DLQWriter interface {
	Write(ctx context.Context, entry dto.DLQEntry) error
}

type IngressReader struct {
	sink      EnvelopeSink
	dlqWriter DLQWriter
}

func NewIngressReader(sink EnvelopeSink, dlqWriter DLQWriter) *IngressReader {
	return &IngressReader{
		sink:      sink,
		dlqWriter: dlqWriter,
	}
}

func (r *IngressReader) Handle(ctx context.Context, envelope dto.IngressEnvelope) (HandoffResult, error) {
	issues := validateTransport(envelope)
	if len(issues) > 0 {
		validationErr := wrapValidationIssues(issues)
		return r.writeDLQOrRetry(ctx, envelope, "transport_validation_failed", validationErr)
	}

	result, err := r.sink.Handle(ctx, envelope)
	if err == nil {
		return result, nil
	}

	if errors.Is(err, ErrPoisonMessage) {
		return r.writeDLQOrRetry(ctx, envelope, "poison_message_detected", err)
	}

	return result, err
}

func (r *IngressReader) writeDLQOrRetry(
	ctx context.Context,
	envelope dto.IngressEnvelope,
	reason string,
	cause error,
) (HandoffResult, error) {
	if r.dlqWriter == nil {
		return HandoffResult{
			Disposition: DispositionRetry,
			Reason:      "dlq_unavailable",
		}, errors.Join(errors.New("dlq writer is not configured"), cause)
	}

	entry := dto.DLQEntry{
		Envelope:   envelope,
		Reason:     reason,
		Error:      cause.Error(),
		OccurredAt: time.Now().UTC(),
	}

	if err := r.dlqWriter.Write(ctx, entry); err != nil {
		return HandoffResult{
			Disposition: DispositionRetry,
			Reason:      "dlq_write_failed",
		}, errors.Join(cause, err)
	}

	return HandoffResult{
		Disposition: DispositionCommit,
		Reason:      reason + "_dlq",
	}, cause
}

func validateTransport(envelope dto.IngressEnvelope) []ValidationIssue {
	var issues []ValidationIssue

	if strings.TrimSpace(envelope.Topic) == "" {
		issues = append(issues, ValidationIssue{Field: "topic", Message: "topic is empty"})
	}

	if envelope.Partition < 0 {
		issues = append(issues, ValidationIssue{Field: "partition", Message: "partition must be non-negative"})
	}

	if envelope.Offset < 0 {
		issues = append(issues, ValidationIssue{Field: "offset", Message: "offset must be non-negative"})
	}

	if strings.TrimSpace(envelope.MessageKey) == "" {
		issues = append(issues, ValidationIssue{Field: "message_key", Message: "message key is empty"})
	}

	if strings.TrimSpace(envelope.AgentID) == "" {
		issues = append(issues, ValidationIssue{Field: "agent_id", Message: "agent id is empty"})
	}

	if len(envelope.RawPayload) == 0 {
		issues = append(issues, ValidationIssue{Field: "raw_payload", Message: "raw payload is empty"})
	}

	if envelope.ReceivedAt.IsZero() || envelope.ReceivedAt.Equal(time.Time{}) {
		issues = append(issues, ValidationIssue{Field: "received_at", Message: "received at is missing"})
	}

	return issues
}

func wrapValidationIssues(issues []ValidationIssue) error {
	if len(issues) == 0 {
		return nil
	}

	parts := make([]string, 0, len(issues))
	for _, issue := range issues {
		parts = append(parts, issue.Field+": "+issue.Message)
	}

	return errors.Join(
		ErrTransportValidation,
		errors.New(strings.Join(parts, "; ")),
	)
}
