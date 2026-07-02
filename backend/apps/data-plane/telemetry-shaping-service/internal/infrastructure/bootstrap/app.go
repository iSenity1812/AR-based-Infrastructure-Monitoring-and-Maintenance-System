package bootstrap

import (
	"context"
	"fmt"
	"strings"

	"telemetry-shaping-service/internal/adapter/inbound/kafka"
	outboundkafka "telemetry-shaping-service/internal/adapter/outbound/kafka"
	outboundredis "telemetry-shaping-service/internal/adapter/outbound/redis"
	"telemetry-shaping-service/internal/application/usecases"
	"telemetry-shaping-service/internal/infrastructure/config"
)

type App struct {
	consumer  *kafka.Consumer
	dlqWriter *outboundkafka.DLQWriter
	cfg       kafka.Config
	closers   []func()
}

func NewApp(cfg config.Config) (*App, error) {
	kafkaCfg, err := cfg.KafkaConfig()
	if err != nil {
		return nil, err
	}

	dlqWriter, err := outboundkafka.NewDLQWriter(kafkaCfg)
	if err != nil {
		return nil, fmt.Errorf("create dlq writer: %w", err)
	}

	contextStore, contextClosers, err := buildContextStore(cfg)
	if err != nil {
		dlqWriter.Close()
		return nil, fmt.Errorf("build context store: %w", err)
	}

	dashboardStore, dashboardClosers, err := buildDashboardStore(cfg)
	if err != nil {
		for _, closer := range contextClosers {
			closer()
		}
		dlqWriter.Close()
		return nil, fmt.Errorf("build dashboard store: %w", err)
	}

	snapshotStore, snapshotCloser, err := buildSnapshotStore(cfg)
	if err != nil {
		for _, closer := range contextClosers {
			closer()
		}
		for _, closer := range dashboardClosers {
			closer()
		}
		dlqWriter.Close()
		return nil, fmt.Errorf("build snapshot store: %w", err)
	}
	windowStore, windowClosers, err := buildWindowStore(cfg)
	if err != nil {
		for _, closer := range contextClosers {
			closer()
		}
		for _, closer := range dashboardClosers {
			closer()
		}
		for _, closer := range snapshotCloser {
			closer()
		}
		dlqWriter.Close()
		return nil, fmt.Errorf("build window store: %w", err)
	}
	sink := usecases.NewTelemetryShapingSink(
		usecases.NewTelemetryBatchDecoder(),
		usecases.NewBatchNormalizer(),
		usecases.NewRuleBasedMetricClassifier(),
		usecases.NewDefaultLaneRouter(),
		usecases.NewDefaultLaneDispatcher(
			usecases.NewContextSink(contextStore),
			usecases.NewDashboardSink(dashboardStore),
			usecases.NewSnapshotSink(snapshotStore),
			usecases.NewWindowSink(windowStore, usecases.DefaultWindowPointLimit),
		),
	)
	reader := usecases.NewIngressReader(sink, dlqWriter)

	consumer, err := kafka.NewConsumer(kafkaCfg, reader)
	if err != nil {
		for _, closer := range contextClosers {
			closer()
		}
		for _, closer := range dashboardClosers {
			closer()
		}
		for _, closer := range snapshotCloser {
			closer()
		}
		dlqWriter.Close()
		return nil, fmt.Errorf("create consumer: %w", err)
	}

	return &App{
		consumer:  consumer,
		dlqWriter: dlqWriter,
		cfg:       kafkaCfg,
		closers:   append(append(append(contextClosers, dashboardClosers...), snapshotCloser...), windowClosers...),
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	return a.consumer.Run(ctx, a.cfg.PollTimeout)
}

func (a *App) Close() {
	a.consumer.Close()
	a.dlqWriter.Close()
	for _, closer := range a.closers {
		closer()
	}
}

func buildSnapshotStore(cfg config.Config) (usecases.SnapshotStore, []func(), error) {
	redisCfg, err := cfg.RedisConfig()
	if err != nil {
		return nil, nil, err
	}

	if strings.TrimSpace(redisCfg.Addr) == "" {
		return outboundredis.NewMemorySnapshotStore(), nil, nil
	}

	store, err := outboundredis.NewSnapshotRedisStore(context.Background(), redisCfg)
	if err != nil {
		return nil, nil, err
	}

	return store, []func(){
		func() {
			_ = store.Close()
		},
	}, nil
}

func buildDashboardStore(cfg config.Config) (usecases.DashboardStore, []func(), error) {
	redisCfg, err := cfg.RedisConfig()
	if err != nil {
		return nil, nil, err
	}

	if strings.TrimSpace(redisCfg.Addr) == "" {
		return outboundredis.NewMemoryDashboardStore(), nil, nil
	}

	store, err := outboundredis.NewDashboardRedisStore(context.Background(), redisCfg)
	if err != nil {
		return nil, nil, err
	}

	return store, []func(){
		func() {
			_ = store.Close()
		},
	}, nil
}

func buildContextStore(cfg config.Config) (usecases.ContextStore, []func(), error) {
	redisCfg, err := cfg.RedisConfig()
	if err != nil {
		return nil, nil, err
	}

	if strings.TrimSpace(redisCfg.Addr) == "" {
		return outboundredis.NewMemoryContextStore(), nil, nil
	}

	store, err := outboundredis.NewContextRedisStore(context.Background(), redisCfg)
	if err != nil {
		return nil, nil, err
	}

	return store, []func(){
		func() {
			_ = store.Close()
		},
	}, nil
}

func buildWindowStore(cfg config.Config) (usecases.WindowStore, []func(), error) {
	redisCfg, err := cfg.RedisConfig()
	if err != nil {
		return nil, nil, err
	}

	if strings.TrimSpace(redisCfg.Addr) == "" {
		return outboundredis.NewMemoryWindowStore(), nil, nil
	}

	store, err := outboundredis.NewWindowRedisStore(context.Background(), redisCfg)
	if err != nil {
		return nil, nil, err
	}

	return store, []func(){
		func() {
			_ = store.Close()
		},
	}, nil
}
