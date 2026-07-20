package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/twmb/franz-go/pkg/kgo"

	inboundkafka "telemetry-shaping-service/internal/adapter/inbound/kafka"
	"telemetry-shaping-service/internal/application/dto"
)

type DLQWriter struct {
	client *kgo.Client
	topic  string
}

func NewDLQWriter(cfg inboundkafka.Config) (*DLQWriter, error) {
	if len(cfg.Brokers) == 0 {
		return nil, fmt.Errorf("brokers are required")
	}

	if cfg.DLQTopic == "" {
		return nil, fmt.Errorf("dlq topic is required")
	}

	client, err := kgo.NewClient(
		kgo.SeedBrokers(cfg.Brokers...),
		kgo.RequiredAcks(kgo.AllISRAcks()),
	)
	if err != nil {
		return nil, fmt.Errorf("create dlq kafka client: %w", err)
	}

	return &DLQWriter{
		client: client,
		topic:  cfg.DLQTopic,
	}, nil
}

func (w *DLQWriter) Write(ctx context.Context, entry dto.DLQEntry) error {
	payload, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("marshal dlq entry: %w", err)
	}

	record := &kgo.Record{
		Topic: w.topic,
		Key:   []byte(entry.Envelope.AgentID),
		Value: payload,
	}

	return w.client.ProduceSync(ctx, record).FirstErr()
}

func (w *DLQWriter) Close() {
	w.client.Close()
}
