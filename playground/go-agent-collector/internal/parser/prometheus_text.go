package parser

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// Sample represents one Prometheus text exposition sample line.
type Sample struct {
	Name   string
	Value  float64
	Labels map[string]string
}

// ParsePromText parses Prometheus text exposition into individual samples.
func ParsePromText(r io.Reader) ([]Sample, error) {
	var samples []Sample

	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		sample, ok, err := parseSampleLine(line)
		if err != nil {
			return nil, err
		}
		if ok {
			samples = append(samples, sample)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return samples, nil
}

func parseSampleLine(line string) (Sample, bool, error) {
	metricToken, rest, ok := splitMetricToken(line)
	if !ok {
		return Sample{}, false, nil
	}
	parts := strings.Fields(rest)
	if len(parts) < 1 {
		return Sample{}, false, nil
	}

	name, labels, err := parseMetricToken(metricToken)
	if err != nil {
		return Sample{}, false, fmt.Errorf("parse metric token %q: %w", metricToken, err)
	}

	value, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return Sample{}, false, fmt.Errorf("parse sample value from %q: %w", line, err)
	}

	return Sample{
		Name:   name,
		Value:  value,
		Labels: labels,
	}, true, nil
}

func splitMetricToken(line string) (string, string, bool) {
	inBraces := false
	inQuotes := false

	for i := 0; i < len(line); i++ {
		switch line[i] {
		case '{':
			if !inQuotes {
				inBraces = true
			}
		case '}':
			if !inQuotes {
				inBraces = false
			}
		case '"':
			inQuotes = !inQuotes
		case ' ', '\t':
			if !inBraces && !inQuotes {
				metric := strings.TrimSpace(line[:i])
				rest := strings.TrimSpace(line[i+1:])
				if metric == "" || rest == "" {
					return "", "", false
				}
				return metric, rest, true
			}
		}
	}

	return "", "", false
}

func parseMetricToken(token string) (string, map[string]string, error) {
	open := strings.IndexByte(token, '{')
	if open == -1 {
		return token, nil, nil
	}
	closeIdx := strings.LastIndexByte(token, '}')
	if closeIdx == -1 || closeIdx < open {
		return "", nil, fmt.Errorf("missing closing brace")
	}

	name := token[:open]
	rawLabels := token[open+1 : closeIdx]
	labels, err := parseLabels(rawLabels)
	if err != nil {
		return "", nil, err
	}
	return name, labels, nil
}

func parseLabels(raw string) (map[string]string, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	labels := make(map[string]string)
	for _, part := range splitLabelPairs(raw) {
		key, value, ok := strings.Cut(part, "=")
		if !ok {
			return nil, fmt.Errorf("invalid label pair %q", part)
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"`)
		labels[key] = value
	}
	return labels, nil
}

func splitLabelPairs(raw string) []string {
	var parts []string
	var current strings.Builder
	inQuotes := false

	for i := 0; i < len(raw); i++ {
		ch := raw[i]
		switch ch {
		case '"':
			inQuotes = !inQuotes
			current.WriteByte(ch)
		case ',':
			if inQuotes {
				current.WriteByte(ch)
				continue
			}
			parts = append(parts, strings.TrimSpace(current.String()))
			current.Reset()
		default:
			current.WriteByte(ch)
		}
	}

	if current.Len() > 0 {
		parts = append(parts, strings.TrimSpace(current.String()))
	}
	return parts
}
