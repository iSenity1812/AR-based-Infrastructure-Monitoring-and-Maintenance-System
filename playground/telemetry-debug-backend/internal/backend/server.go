package backend

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"
)

type Server struct {
	store *store
	nowFn func() time.Time
}

func NewServer() *Server {
	return &Server{
		store: newStore(),
		nowFn: time.Now,
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/api/telemetry/ingest", s.handleIngest)
	mux.HandleFunc("/api/telemetry/stats", s.handleStats)
	mux.HandleFunc("/api/telemetry/batches", s.handleBatches)
	mux.HandleFunc("/api/telemetry/fail-mode", s.handleFailMode)
	return mux
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if mode, ok := s.store.consumeFailure(); ok {
		statusCode := mode.StatusCode
		if statusCode == 0 {
			statusCode = http.StatusInternalServerError
		}
		message := mode.Message
		if message == "" {
			message = "simulated backend failure"
		}
		http.Error(w, message, statusCode)
		return
	}

	var payload Payload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.store.recordError(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Batch.BatchID == "" || payload.Agent.AgentID == "" {
		s.store.recordError(io.ErrUnexpectedEOF)
		http.Error(w, "missing required batch or agent fields", http.StatusBadRequest)
		return
	}

	now := s.nowFn().UTC()
	s.store.save(payload, now)
	writeJSON(w, http.StatusAccepted, map[string]any{
		"status":      "accepted",
		"batchId":     payload.Batch.BatchID,
		"recordCount": payload.Batch.RecordCount,
		"receivedAt":  now.Format(time.RFC3339),
	})
}

func (s *Server) handleStats(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.stats())
}

func (s *Server) handleBatches(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items": s.store.batchList(limit),
	})
}

func (s *Server) handleFailMode(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, s.store.currentFailMode())
	case http.MethodPost:
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		mode, err := decodeFailMode(body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		s.store.setFailMode(mode)
		writeJSON(w, http.StatusOK, mode)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_, _ = w.Write(body)
}
