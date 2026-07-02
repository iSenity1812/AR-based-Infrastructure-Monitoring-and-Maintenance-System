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

const snapshotUpsertScript = `
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

type SnapshotRedisStore struct {
	client *goredis.Client
	cfg    Config
}

func NewSnapshotRedisStore(ctx context.Context, cfg Config) (*SnapshotRedisStore, error) {
	client, err := newRedisClient(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return &SnapshotRedisStore{
		client: client,
		cfg:    withSnapshotDefaults(cfg),
	}, nil
}

func (s *SnapshotRedisStore) UpsertSnapshots(ctx context.Context, snapshots []entities.SnapshotDocument) error {
	ttlMillis := s.cfg.SnapshotTTL.Milliseconds()

	pipe := s.client.Pipeline()
	for _, snapshot := range snapshots {
		payload, err := json.Marshal(snapshot)
		if err != nil {
			return fmt.Errorf("marshal snapshot %s/%s: %w", snapshot.ScopeType, snapshot.ScopeID, err)
		}

		pipe.Eval(
			ctx,
			snapshotUpsertScript,
			[]string{s.snapshotKey(snapshot.AgentID, snapshot.ScopeType, snapshot.ScopeID)},
			string(payload),
			snapshot.BatchSequence,
			ttlMillis,
		)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("exec snapshot pipeline: %w", err)
	}

	return nil
}

func (s *SnapshotRedisStore) Close() error {
	return s.client.Close()
}

func (s *SnapshotRedisStore) snapshotKey(agentID, scopeType, scopeID string) string {
	return strings.Join([]string{
		s.cfg.SnapshotPrefix,
		scopeType,
		agentID,
		scopeID,
	}, ":")
}

func withSnapshotDefaults(cfg Config) Config {
	if strings.TrimSpace(cfg.SnapshotPrefix) == "" {
		cfg.SnapshotPrefix = "snapshot"
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
