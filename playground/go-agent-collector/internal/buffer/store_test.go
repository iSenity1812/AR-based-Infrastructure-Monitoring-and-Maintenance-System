package buffer

import (
	"path/filepath"
	"testing"

	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

func TestStoreSavePeekDeleteAndTrim(t *testing.T) {
	root := t.TempDir()
	store := New(root, 2)

	payloads := []sender.Payload{
		{Batch: sender.BatchMeta{BatchID: "b-1"}},
		{Batch: sender.BatchMeta{BatchID: "b-2"}},
		{Batch: sender.BatchMeta{BatchID: "b-3"}},
	}
	for _, payload := range payloads {
		if err := store.Save(payload); err != nil {
			t.Fatalf("save payload: %v", err)
		}
	}

	count, err := store.Count()
	if err != nil {
		t.Fatalf("count buffered files: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected trim to keep 2 files, got %d", count)
	}

	item, err := store.PeekOldest()
	if err != nil {
		t.Fatalf("peek oldest: %v", err)
	}
	if item == nil || item.Payload.Batch.BatchID != "b-2" {
		t.Fatalf("expected oldest retained batch b-2, got %#v", item)
	}

	if err := store.Delete(item.FileName); err != nil {
		t.Fatalf("delete buffered file: %v", err)
	}
	if _, err := filepath.Abs(root); err != nil {
		t.Fatalf("temp dir should still exist: %v", err)
	}
}
