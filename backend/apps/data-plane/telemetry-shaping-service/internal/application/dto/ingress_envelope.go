package dto

import "time"

// IngressEnvelope preserves transport metadata and the raw payload for the
// downstream decoder / normalizer to process later.
type IngressEnvelope struct {
	Topic      string
	Partition  int32
	Offset     int64
	AgentID    string
	MessageKey string
	ReceivedAt time.Time
	Headers    map[string]string
	RawPayload []byte
}
