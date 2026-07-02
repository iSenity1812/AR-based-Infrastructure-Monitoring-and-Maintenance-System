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

const dashboardUpsertScript = `
local payloadKey = KEYS[1]
local agentIndexKey = KEYS[2]
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
redis.call("SADD", agentIndexKey, payloadKey)
if ttlMillis > 0 then
	redis.call("PEXPIRE", payloadKey, ttlMillis)
	redis.call("PEXPIRE", agentIndexKey, ttlMillis)
end

return 1
`

type DashboardRedisStore struct {
	client *goredis.Client
	cfg    Config
}

func NewDashboardRedisStore(ctx context.Context, cfg Config) (*DashboardRedisStore, error) {
	client, err := newRedisClient(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return &DashboardRedisStore{
		client: client,
		cfg:    withDashboardDefaults(cfg),
	}, nil
}

func (s *DashboardRedisStore) UpsertDashboards(ctx context.Context, documents []entities.DashboardDocument) error {
	ttlMillis := s.cfg.DashboardTTL.Milliseconds()

	pipe := s.client.Pipeline()
	for _, document := range documents {
		payload, err := json.Marshal(document)
		if err != nil {
			return fmt.Errorf("marshal dashboard %s/%s: %w", document.ScopeType, document.ScopeID, err)
		}

		pipe.Eval(
			ctx,
			dashboardUpsertScript,
			[]string{
				s.dashboardKey(document.AgentID, document.ScopeType, document.ScopeID),
				s.agentIndexKey(document.AgentID),
			},
			string(payload),
			document.BatchSequence,
			ttlMillis,
		)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("exec dashboard pipeline: %w", err)
	}

	return nil
}

func (s *DashboardRedisStore) Close() error {
	return s.client.Close()
}

func (s *DashboardRedisStore) dashboardKey(agentID, scopeType, scopeID string) string {
	return strings.Join([]string{s.cfg.DashboardPrefix, scopeType, agentID, scopeID}, ":")
}

func (s *DashboardRedisStore) agentIndexKey(agentID string) string {
	return strings.Join([]string{s.cfg.DashboardPrefix, "index", "agent", agentID}, ":")
}

func withDashboardDefaults(cfg Config) Config {
	if strings.TrimSpace(cfg.DashboardPrefix) == "" {
		cfg.DashboardPrefix = "dashboard"
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
