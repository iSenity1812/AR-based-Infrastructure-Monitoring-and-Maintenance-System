package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"telemetry-shaping-service/internal/domain/entities"
)

const contextUpsertScript = `
local payloadKey = KEYS[1]
local incomingPayload = ARGV[1]
local incomingBatchSequence = tonumber(ARGV[2])
local ttlMillis = tonumber(ARGV[3])

local currentPayload = redis.call("GET", payloadKey)
if currentPayload then
	local currentDocument = cjson.decode(currentPayload)
	local currentBatchSequence = tonumber(currentDocument["batch_sequence"]) or 0
	if currentBatchSequence > incomingBatchSequence then
		return 0
	end
end

redis.call("SET", payloadKey, incomingPayload)
if ttlMillis > 0 then
	redis.call("PEXPIRE", payloadKey, ttlMillis)
end

return 1
`

type ContextRedisStore struct {
	client *goredis.Client
	cfg    Config
}

func NewContextRedisStore(ctx context.Context, cfg Config) (*ContextRedisStore, error) {
	client, err := newRedisClient(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return &ContextRedisStore{
		client: client,
		cfg:    withContextDefaults(cfg),
	}, nil
}

func (s *ContextRedisStore) UpsertContexts(ctx context.Context, documents []entities.ContextDocument) error {
	ttlMillis := s.cfg.ContextTTL.Milliseconds()

	pipe := s.client.Pipeline()
	for _, document := range documents {
		payload, err := json.Marshal(document)
		if err != nil {
			return fmt.Errorf("marshal context %s/%s: %w", document.ScopeType, document.ScopeID, err)
		}

		pipe.Eval(
			ctx,
			contextUpsertScript,
			[]string{s.contextKey(document.AgentID, document.ScopeType, document.ScopeID)},
			string(payload),
			document.BatchSequence,
			ttlMillis,
		)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("exec context pipeline: %w", err)
	}

	return nil
}

func (s *ContextRedisStore) Close() error {
	return s.client.Close()
}

func (s *ContextRedisStore) contextKey(agentID, scopeType, scopeID string) string {
	return strings.Join([]string{
		s.cfg.ContextPrefix,
		scopeType,
		agentID,
		scopeID,
	}, ":")
}

func withContextDefaults(cfg Config) Config {
	if strings.TrimSpace(cfg.ContextPrefix) == "" {
		cfg.ContextPrefix = "context"
	}
	if cfg.ConnectTimeout <= 0 {
		cfg.ConnectTimeout = 5 * time.Second
	}
	if cfg.ReadTimeout <= 0 {
		cfg.ReadTimeout = 5 * time.Second
	}
	if cfg.WriteTimeout <= 0 {
		cfg.WriteTimeout = 5 * time.Second
	}
	return cfg
}
