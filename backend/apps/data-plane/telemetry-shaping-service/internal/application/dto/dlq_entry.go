package dto

import "time"

type DLQEntry struct {
	Envelope   IngressEnvelope `json:"envelope"`
	Reason     string          `json:"reason"`
	Error      string          `json:"error"`
	OccurredAt time.Time       `json:"occurred_at"`
}
