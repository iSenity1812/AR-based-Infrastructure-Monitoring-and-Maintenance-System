package adapter

import (
	"context"
	"encoding/json"
	"fmt"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	nodeAgentsKey      = "nodes:agents"
	discoveredNodeTTL = 24 * time.Hour
)

type RedisAdapter struct {
	client *redis.Client
}

// NewRedisAdapter initializes a new RedisAdapter with the given Redis client.
func NewRedisAdapter(addr string, password string, db int) (port.NodeRepositoryPort, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}
	return &RedisAdapter{client: rdb}, nil
}

// SaveNode saves a Node entity to Redis using a unique key based on hardware information.
func (a *RedisAdapter) SaveNode(ctx context.Context, node *domain.Node) error {
	data, err := json.Marshal(node)
	if err != nil {
		return fmt.Errorf("failed to marshal node: %w", err)
	}

	agentKey := agentNodeKey(node.AgentID)
	ttl := nodeTTL(node)
	pipe := a.client.TxPipeline()
	pipe.Set(ctx, agentKey, data, ttl)
	pipe.SAdd(ctx, nodeAgentsKey, node.AgentID)

	hardwareKey := hardwareNodeKey(node.Hardware.MacAddress, node.Hardware.HardwareSerial)
	if hardwareKey != "" {
		pipe.Set(ctx, hardwareKey, node.AgentID, ttl)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("failed to save node to Redis: %w", err)
	}
	return nil
}

// FindNodeByAgentID loads the node state from Redis so ingestion can gate telemetry
// before publishing anything downstream.
func (a *RedisAdapter) FindNodeByAgentID(ctx context.Context, agentID string) (*domain.Node, error) {
	if agentID == "" {
		return nil, nil
	}

	raw, err := a.client.Get(ctx, agentNodeKey(agentID)).Result()
	if err != nil {
		if err == redis.Nil {
			if cleanupErr := a.client.SRem(ctx, nodeAgentsKey, agentID).Err(); cleanupErr != nil {
				return nil, fmt.Errorf("failed to clean stale node index: %w", cleanupErr)
			}
			return nil, nil
		}
		return nil, fmt.Errorf("failed to load node from Redis: %w", err)
	}

	var node domain.Node
	if err := json.Unmarshal([]byte(raw), &node); err != nil {
		return nil, fmt.Errorf("failed to unmarshal node from Redis: %w", err)
	}

	return &node, nil
}

func agentNodeKey(agentID string) string {
	return fmt.Sprintf("node:agent:%s", agentID)
}

func hardwareNodeKey(macAddress, hardwareSerial string) string {
	normalizedMAC := strings.TrimSpace(strings.ToUpper(macAddress))
	normalizedSerial := strings.TrimSpace(hardwareSerial)
	if normalizedMAC == "" || normalizedSerial == "" {
		return ""
	}
	return fmt.Sprintf("node:hardware:%s:%s", normalizedMAC, normalizedSerial)
}

func nodeTTL(node *domain.Node) time.Duration {
	if node == nil {
		return 0
	}
	if node.LifecycleState == domain.StateDiscovered {
		return discoveredNodeTTL
	}
	return 0
}
