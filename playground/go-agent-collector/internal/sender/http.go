package sender

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
)

// HTTPSender is a minimal HTTP sender used by the scaffold.
type HTTPSender struct {
	endpoint  string
	authToken string
	client    *http.Client
}

type StatusError struct {
	Code int
}

func (e StatusError) Error() string {
	return fmt.Sprintf("unexpected status code: %d", e.Code)
}

// NewHTTPSender constructs an HTTPSender from config.
func NewHTTPSender(cfg *config.Config) *HTTPSender {
	timeout := cfg.Runtime.SendTimeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &HTTPSender{
		endpoint:  cfg.Send.Endpoint,
		authToken: cfg.Runtime.AuthToken,
		client:    &http.Client{Timeout: timeout},
	}
}

// Send posts a batch payload to the configured endpoint.
func (s *HTTPSender) Send(ctx context.Context, payload Payload) error {
	if err := ValidatePayload(payload); err != nil {
		return err
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", s.endpoint, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.authToken)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return StatusError{Code: resp.StatusCode}
	}
	return nil
}
