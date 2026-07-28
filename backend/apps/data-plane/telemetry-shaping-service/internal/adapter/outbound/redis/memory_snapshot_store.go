package redis

import (
	"context"
	"sort"
	"strings"
	"sync"

	"telemetry-shaping-service/internal/domain/entities"
)

type MemorySnapshotStore struct {
	mu        sync.RWMutex
	snapshots map[string]entities.SnapshotDocument
}

func NewMemorySnapshotStore() *MemorySnapshotStore {
	return &MemorySnapshotStore{
		snapshots: make(map[string]entities.SnapshotDocument),
	}
}

func (s *MemorySnapshotStore) UpsertSnapshots(_ context.Context, snapshots []entities.SnapshotDocument) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, snapshot := range snapshots {
		s.snapshots[s.snapshotKey(snapshot.AgentID, snapshot.ScopeType, snapshot.ScopeID)] = snapshot
	}

	return nil
}

func (s *MemorySnapshotStore) ListSnapshots() []entities.SnapshotDocument {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys := make([]string, 0, len(s.snapshots))
	for key := range s.snapshots {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]entities.SnapshotDocument, 0, len(keys))
	for _, key := range keys {
		out = append(out, s.snapshots[key])
	}
	return out
}

func (s *MemorySnapshotStore) snapshotKey(agentID, scopeType, scopeID string) string {
	return strings.Join([]string{agentID, scopeType, scopeID}, "|")
}
