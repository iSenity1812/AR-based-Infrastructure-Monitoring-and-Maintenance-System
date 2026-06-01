package windows

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/parser"
)

// Adapter scrapes a local windows_exporter endpoint and returns allowlisted raw samples.
type Adapter struct {
	endpoint     string
	maxBodyBytes int64
	allowlist    map[string]struct{}
	client       *http.Client
	sourceType   string
	primaryNIC   string
	excludeNICs  []string
}

// New returns a config-driven Windows source adapter.
func New(cfg *config.Config) *Adapter {
	timeout := cfg.Runtime.ScrapeTimeout
	if timeout <= 0 {
		timeout = 3 * time.Second
	}

	return &Adapter{
		endpoint:     cfg.Scrape.Endpoint,
		maxBodyBytes: int64(cfg.Scrape.MaxBodySizeMB) * 1024 * 1024,
		allowlist:    buildAllowlist(cfg.Metrics),
		client:       &http.Client{Timeout: timeout},
		sourceType:   cfg.Agent.SourceType,
		primaryNIC:   cfg.Runtime.PrimaryNICHint,
		excludeNICs:  append([]string(nil), cfg.Network.ExcludeNICPatterns...),
	}
}

// Collect scrapes the exporter endpoint once and returns raw allowlisted samples.
func (a *Adapter) Collect() ([]domain.Metric, error) {
	ctx, cancel := context.WithTimeout(context.Background(), a.client.Timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build scrape request: %w", err)
	}

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("scrape exporter: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("scrape exporter: unexpected status %s", resp.Status)
	}

	reader := io.Reader(resp.Body)
	if a.maxBodyBytes > 0 {
		reader = io.LimitReader(resp.Body, a.maxBodyBytes)
	}

	samples, err := parser.ParsePromText(reader)
	if err != nil {
		return nil, fmt.Errorf("parse exporter response: %w", err)
	}

	metrics := make([]domain.Metric, 0, len(samples))
	for _, sample := range samples {
		if !a.allowed(sample.Name) {
			continue
		}

		labels := cloneLabels(sample.Labels)
		labels["source_type"] = a.sourceType
		if a.primaryNIC != "" {
			labels["configured_primary_nic"] = a.primaryNIC
		}
		if len(a.excludeNICs) > 0 {
			labels["nic_exclusion_rules"] = fmt.Sprintf("%d", len(a.excludeNICs))
		}

		metrics = append(metrics, domain.Metric{
			Name:   sample.Name,
			Value:  sample.Value,
			Labels: labels,
		})
	}

	return metrics, nil
}

func (a *Adapter) allowed(metricName string) bool {
	_, ok := a.allowlist[metricName]
	return ok
}

func buildAllowlist(rules []config.MetricRule) map[string]struct{} {
	allowlist := make(map[string]struct{})
	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}
		for _, metric := range rule.SourceMetric {
			if metric == "" {
				continue
			}
			allowlist[metric] = struct{}{}
		}
	}
	return allowlist
}

func cloneLabels(input map[string]string) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}
