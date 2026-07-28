package redis

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"telemetry-shaping-service/internal/domain/entities"
)

const windowUpsertScript = `
local payloadKey = KEYS[1]
local agentIndexKey = KEYS[2]
local scopeIndexKey = KEYS[3]
local incomingPayload = ARGV[1]
local incomingBatchSequence = tonumber(ARGV[2])
local pointLimit = tonumber(ARGV[3])
local ttlMillis = tonumber(ARGV[4])

local currentPayload = redis.call("GET", payloadKey)
if currentPayload then
	local currentDocument = cjson.decode(currentPayload)
	local currentBatchSequence = tonumber(currentDocument["batch_sequence"]) or 0
	if currentBatchSequence > incomingBatchSequence then
		return 0
	end
end

local incomingDocument = cjson.decode(incomingPayload)
local points = incomingDocument["Points"] or incomingDocument["points"] or {}

if currentPayload then
	local currentDocument = cjson.decode(currentPayload)
	local currentPoints = currentDocument["Points"] or currentDocument["points"] or {}
	for i = 1, #points do
		currentPoints[#currentPoints + 1] = points[i]
	end
	points = currentPoints
end

local trimmed = 0
if pointLimit > 0 and #points > pointLimit then
	trimmed = #points - pointLimit
	local startIndex = #points - pointLimit + 1
	local trimmedPoints = {}
	for i = startIndex, #points do
		trimmedPoints[#trimmedPoints + 1] = points[i]
	end
	points = trimmedPoints
end

incomingDocument["Points"] = points
incomingDocument["points"] = nil
redis.call("SET", payloadKey, cjson.encode(incomingDocument))
redis.call("SADD", agentIndexKey, payloadKey)
redis.call("SADD", scopeIndexKey, payloadKey)
if ttlMillis > 0 then
	redis.call("PEXPIRE", payloadKey, ttlMillis)
	redis.call("PEXPIRE", agentIndexKey, ttlMillis)
	redis.call("PEXPIRE", scopeIndexKey, ttlMillis)
end

return trimmed
`

type WindowRedisStore struct {
	client *goredis.Client
	cfg    Config
}

func NewWindowRedisStore(ctx context.Context, cfg Config) (*WindowRedisStore, error) {
	client, err := newRedisClient(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return &WindowRedisStore{
		client: client,
		cfg:    withWindowDefaults(cfg),
	}, nil
}

func (s *WindowRedisStore) UpsertWindowSeries(ctx context.Context, series []entities.WindowSeries, pointLimit int) (int, error) {
	ttlMillis := s.cfg.WindowTTL.Milliseconds()
	pipe := s.client.Pipeline()
	cmds := make([]*goredis.Cmd, 0, len(series))

	for _, item := range series {
		payload, err := json.Marshal(item)
		if err != nil {
			return 0, fmt.Errorf("marshal window %s/%s: %w", item.ScopeType, item.ScopeID, err)
		}

		cmds = append(cmds, pipe.Eval(
			ctx,
			windowUpsertScript,
			[]string{
				s.windowKey(item.AgentID, item.ScopeType, item.ScopeID, item.SeriesKey),
				s.agentIndexKey(item.AgentID),
				s.scopeIndexKey(item.ScopeType, item.ScopeID),
			},
			string(payload),
			item.BatchSequence,
			pointLimit,
			ttlMillis,
		))
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return 0, fmt.Errorf("exec window pipeline: %w", err)
	}

	trimmedTotal := 0
	for _, cmd := range cmds {
		trimmed, err := cmd.Int()
		if err != nil {
			return 0, fmt.Errorf("read window pipeline result: %w", err)
		}
		trimmedTotal += trimmed
	}

	return trimmedTotal, nil
}

func (s *WindowRedisStore) Close() error {
	return s.client.Close()
}

func (s *WindowRedisStore) windowKey(agentID, scopeType, scopeID, seriesKey string) string {
	return strings.Join([]string{
		s.cfg.WindowPrefix,
		scopeType,
		agentID,
		hashSeriesKey(seriesKey),
	}, ":")
}

func (s *WindowRedisStore) agentIndexKey(agentID string) string {
	return strings.Join([]string{
		s.cfg.WindowPrefix,
		"index",
		"agent",
		agentID,
	}, ":")
}

func (s *WindowRedisStore) scopeIndexKey(scopeType, scopeID string) string {
	return strings.Join([]string{
		s.cfg.WindowPrefix,
		"index",
		"scope",
		scopeType,
		scopeID,
	}, ":")
}

func hashSeriesKey(seriesKey string) string {
	sum := sha1.Sum([]byte(seriesKey))
	return hex.EncodeToString(sum[:8])
}

func withWindowDefaults(cfg Config) Config {
	if strings.TrimSpace(cfg.WindowPrefix) == "" {
		cfg.WindowPrefix = "window"
	}
	if cfg.WindowTTL <= 0 {
		cfg.WindowTTL = 24 * time.Hour
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
