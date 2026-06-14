package backend

import (
	"context"
	"strings"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

type RedpandaPublisher struct {
	client *kgo.Client
	topic  string
}

func NewRedpandaPublisher(brokers []string, topic string) (*RedpandaPublisher, error) {
	client, err := kgo.NewClient(kgo.SeedBrokers(brokers...))
	if err != nil {
		return nil, err
	}
	adm := kadm.NewClient(client)
	if _, err := adm.CreateTopics(context.Background(), 1, 1, nil, topic); err != nil {
		client.Close()
		return nil, err
	}
	return &RedpandaPublisher{client: client, topic: topic}, nil
}

func (p *RedpandaPublisher) Publish(ctx context.Context, envelope TransportEnvelope) error {
	body, err := envelope.MarshalBinary()
	if err != nil {
		return err
	}
	record := &kgo.Record{
		Topic: p.topic,
		Key:   []byte(envelope.BatchID),
		Value: body,
		Headers: []kgo.RecordHeader{
			{Key: "transport", Value: []byte("grpc")},
			{Key: "content-type", Value: []byte(strings.ToLower(envelope.ContentType))},
			{Key: "encoding", Value: []byte(strings.ToLower(envelope.Encoding))},
			{Key: "agent-id", Value: []byte(envelope.AgentID)},
		},
	}
	return p.client.ProduceSync(ctx, record).FirstErr()
}

func (p *RedpandaPublisher) Close() {
	if p != nil && p.client != nil {
		p.client.Close()
	}
}
