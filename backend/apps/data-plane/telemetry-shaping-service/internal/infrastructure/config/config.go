package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	"telemetry-shaping-service/internal/adapter/inbound/kafka"
	outboundredis "telemetry-shaping-service/internal/adapter/outbound/redis"
)

type Config struct {
	Kafka struct {
		Brokers            []string `yaml:"brokers"`
		Topic              string   `yaml:"topic"`
		DLQTopic           string   `yaml:"dlq_topic"`
		ConsumerGroup      string   `yaml:"consumer_group"`
		PollTimeout        string   `yaml:"poll_timeout"`
		MaxInFlight        int      `yaml:"max_in_flight"`
		MetricsLogInterval string   `yaml:"metrics_log_interval"`
	} `yaml:"kafka"`
	Redis struct {
		Addr               string `yaml:"addr"`
		Password           string `yaml:"password"`
		DB                 int    `yaml:"db"`
		ContextKeyPrefix   string `yaml:"context_key_prefix"`
		ContextTTL         string `yaml:"context_ttl"`
		DashboardKeyPrefix string `yaml:"dashboard_key_prefix"`
		DashboardTTL       string `yaml:"dashboard_ttl"`
		SnapshotKeyPrefix  string `yaml:"snapshot_key_prefix"`
		SnapshotTTL        string `yaml:"snapshot_ttl"`
		WindowKeyPrefix    string `yaml:"window_key_prefix"`
		WindowTTL          string `yaml:"window_ttl"`
		ConnectTimeout     string `yaml:"connect_timeout"`
		ReadTimeout        string `yaml:"read_timeout"`
		WriteTimeout       string `yaml:"write_timeout"`
	} `yaml:"redis"`
}

func Load(path string) (Config, error) {
	bytes, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read config file: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(bytes, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config file: %w", err)
	}

	applyEnvOverrides(&cfg)
	return cfg, nil
}

func (c Config) KafkaConfig() (kafka.Config, error) {
	pollTimeout := 5 * time.Second
	if c.Kafka.PollTimeout != "" {
		parsed, err := time.ParseDuration(c.Kafka.PollTimeout)
		if err != nil {
			return kafka.Config{}, fmt.Errorf("parse kafka.poll_timeout: %w", err)
		}
		pollTimeout = parsed
	}

	metricsLogInterval := 30 * time.Second
	if c.Kafka.MetricsLogInterval != "" {
		parsed, err := time.ParseDuration(c.Kafka.MetricsLogInterval)
		if err != nil {
			return kafka.Config{}, fmt.Errorf("parse kafka.metrics_log_interval: %w", err)
		}
		metricsLogInterval = parsed
	}

	cfg := kafka.Config{
		Brokers:            c.Kafka.Brokers,
		Topic:              c.Kafka.Topic,
		DLQTopic:           c.Kafka.DLQTopic,
		ConsumerGroup:      c.Kafka.ConsumerGroup,
		PollTimeout:        pollTimeout,
		MaxInFlight:        c.Kafka.MaxInFlight,
		MetricsLogInterval: metricsLogInterval,
	}

	if cfg.Topic == "" {
		cfg.Topic = kafka.DefaultTopic
	}

	if cfg.ConsumerGroup == "" {
		cfg.ConsumerGroup = kafka.DefaultConsumerID
	}

	if cfg.DLQTopic == "" {
		cfg.DLQTopic = cfg.Topic + ".dlq"
	}

	if cfg.MaxInFlight <= 0 {
		cfg.MaxInFlight = 8
	}

	return cfg, nil
}

func (c Config) RedisConfig() (outboundredis.Config, error) {
	connectTimeout := 5 * time.Second
	if c.Redis.ConnectTimeout != "" {
		parsed, err := time.ParseDuration(c.Redis.ConnectTimeout)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.connect_timeout: %w", err)
		}
		connectTimeout = parsed
	}

	readTimeout := 5 * time.Second
	if c.Redis.ReadTimeout != "" {
		parsed, err := time.ParseDuration(c.Redis.ReadTimeout)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.read_timeout: %w", err)
		}
		readTimeout = parsed
	}

	writeTimeout := 5 * time.Second
	if c.Redis.WriteTimeout != "" {
		parsed, err := time.ParseDuration(c.Redis.WriteTimeout)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.write_timeout: %w", err)
		}
		writeTimeout = parsed
	}

	snapshotTTL := time.Duration(0)
	if c.Redis.SnapshotTTL != "" {
		parsed, err := time.ParseDuration(c.Redis.SnapshotTTL)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.snapshot_ttl: %w", err)
		}
		snapshotTTL = parsed
	}

	contextTTL := time.Duration(0)
	if c.Redis.ContextTTL != "" {
		parsed, err := time.ParseDuration(c.Redis.ContextTTL)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.context_ttl: %w", err)
		}
		contextTTL = parsed
	}

	dashboardTTL := time.Duration(0)
	if c.Redis.DashboardTTL != "" {
		parsed, err := time.ParseDuration(c.Redis.DashboardTTL)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.dashboard_ttl: %w", err)
		}
		dashboardTTL = parsed
	}

	windowTTL := time.Duration(0)
	if c.Redis.WindowTTL != "" {
		parsed, err := time.ParseDuration(c.Redis.WindowTTL)
		if err != nil {
			return outboundredis.Config{}, fmt.Errorf("parse redis.window_ttl: %w", err)
		}
		windowTTL = parsed
	}

	return outboundredis.Config{
		Addr:            c.Redis.Addr,
		Password:        c.Redis.Password,
		DB:              c.Redis.DB,
		ContextPrefix:   c.Redis.ContextKeyPrefix,
		ContextTTL:      contextTTL,
		DashboardPrefix: c.Redis.DashboardKeyPrefix,
		DashboardTTL:    dashboardTTL,
		SnapshotPrefix:  c.Redis.SnapshotKeyPrefix,
		SnapshotTTL:     snapshotTTL,
		WindowPrefix:    c.Redis.WindowKeyPrefix,
		WindowTTL:       windowTTL,
		ConnectTimeout:  connectTimeout,
		ReadTimeout:     readTimeout,
		WriteTimeout:    writeTimeout,
	}, nil
}

func applyEnvOverrides(cfg *Config) {
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_BROKERS"); value != "" {
		cfg.Kafka.Brokers = splitAndTrim(value)
	}
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_TOPIC"); value != "" {
		cfg.Kafka.Topic = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_CONSUMER_GROUP"); value != "" {
		cfg.Kafka.ConsumerGroup = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_DLQ_TOPIC"); value != "" {
		cfg.Kafka.DLQTopic = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_POLL_TIMEOUT"); value != "" {
		cfg.Kafka.PollTimeout = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_MAX_IN_FLIGHT"); value != "" {
		var maxInFlight int
		_, _ = fmt.Sscanf(value, "%d", &maxInFlight)
		if maxInFlight > 0 {
			cfg.Kafka.MaxInFlight = maxInFlight
		}
	}
	if value := os.Getenv("TELEMETRY_SHAPING_KAFKA_METRICS_LOG_INTERVAL"); value != "" {
		cfg.Kafka.MetricsLogInterval = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_ADDR"); value != "" {
		cfg.Redis.Addr = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_PASSWORD"); value != "" {
		cfg.Redis.Password = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_DB"); value != "" {
		var db int
		_, _ = fmt.Sscanf(value, "%d", &db)
		if db >= 0 {
			cfg.Redis.DB = db
		}
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_SNAPSHOT_KEY_PREFIX"); value != "" {
		cfg.Redis.SnapshotKeyPrefix = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_WINDOW_KEY_PREFIX"); value != "" {
		cfg.Redis.WindowKeyPrefix = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_CONTEXT_KEY_PREFIX"); value != "" {
		cfg.Redis.ContextKeyPrefix = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_DASHBOARD_KEY_PREFIX"); value != "" {
		cfg.Redis.DashboardKeyPrefix = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_CONTEXT_TTL"); value != "" {
		cfg.Redis.ContextTTL = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_DASHBOARD_TTL"); value != "" {
		cfg.Redis.DashboardTTL = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_SNAPSHOT_TTL"); value != "" {
		cfg.Redis.SnapshotTTL = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_WINDOW_TTL"); value != "" {
		cfg.Redis.WindowTTL = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_CONNECT_TIMEOUT"); value != "" {
		cfg.Redis.ConnectTimeout = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_READ_TIMEOUT"); value != "" {
		cfg.Redis.ReadTimeout = value
	}
	if value := os.Getenv("TELEMETRY_SHAPING_REDIS_WRITE_TIMEOUT"); value != "" {
		cfg.Redis.WriteTimeout = value
	}
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
