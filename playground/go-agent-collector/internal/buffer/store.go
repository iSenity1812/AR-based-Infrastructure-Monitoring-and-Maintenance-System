package buffer

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

type Store struct {
	root          string
	maxBatchFiles int
}

type BufferedBatch struct {
	FileName string
	Payload  sender.Payload
}

func New(root string, maxBatchFiles int) *Store {
	return &Store{
		root:          root,
		maxBatchFiles: maxBatchFiles,
	}
}

func (s *Store) Save(payload sender.Payload) error {
	if err := os.MkdirAll(s.root, 0o755); err != nil {
		return fmt.Errorf("create buffer dir: %w", err)
	}

	body, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	fileName := sanitizeFileName(payload.Batch.BatchID) + ".json"
	path := filepath.Join(s.root, fileName)
	if err := os.WriteFile(path, body, 0o644); err != nil {
		return fmt.Errorf("write buffer file: %w", err)
	}

	return s.trim()
}

func (s *Store) PeekOldest() (*BufferedBatch, error) {
	files, err := s.listFiles()
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, nil
	}

	path := filepath.Join(s.root, files[0])
	body, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read buffer file: %w", err)
	}

	var payload sender.Payload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("parse buffer file: %w", err)
	}

	return &BufferedBatch{
		FileName: files[0],
		Payload:  payload,
	}, nil
}

func (s *Store) Delete(fileName string) error {
	if fileName == "" {
		return nil
	}
	path := filepath.Join(s.root, fileName)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete buffer file: %w", err)
	}
	return nil
}

func (s *Store) Count() (int, error) {
	files, err := s.listFiles()
	if err != nil {
		return 0, err
	}
	return len(files), nil
}

func (s *Store) listFiles() ([]string, error) {
	if _, err := os.Stat(s.root); err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("stat buffer dir: %w", err)
	}

	entries, err := os.ReadDir(s.root)
	if err != nil {
		return nil, fmt.Errorf("read buffer dir: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		files = append(files, entry.Name())
	}
	sort.Strings(files)
	return files, nil
}

func (s *Store) trim() error {
	if s.maxBatchFiles <= 0 {
		return nil
	}

	files, err := s.listFiles()
	if err != nil {
		return err
	}
	if len(files) <= s.maxBatchFiles {
		return nil
	}

	for _, fileName := range files[:len(files)-s.maxBatchFiles] {
		path := filepath.Join(s.root, fileName)
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("trim buffer file: %w", err)
		}
	}
	return nil
}

func sanitizeFileName(value string) string {
	replacer := strings.NewReplacer(":", "-", "/", "-", "\\", "-", " ", "_")
	out := replacer.Replace(strings.TrimSpace(value))
	if out == "" {
		return "batch"
	}
	return out
}
