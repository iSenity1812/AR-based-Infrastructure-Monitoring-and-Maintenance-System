package backend

func enrichPayloadCompatibility(payload *Payload) {
	if payload == nil {
		return
	}
	if payload.Context.Identity.Hostname == "" {
		payload.Context.Identity.Hostname = firstNonEmpty(payload.Agent.Hostname, findMetricTag(payload.Metrics, "hostname"))
	}
	if payload.Context.Identity.NodeID == "" {
		payload.Context.Identity.NodeID = findMetricTag(payload.Metrics, "nodeId", "node_id")
	}
	if payload.Context.Identity.Source == "" {
		payload.Context.Identity.Source = firstNonEmpty(payload.Agent.SourceType, firstMetricSource(payload.Metrics))
	}
	if payload.Context.Identity.DeviceType == "" {
		payload.Context.Identity.DeviceType = findMetricTag(payload.Metrics, "deviceType")
	}

	if payload.Context.HardwareFingerprint.PrimaryIPv4 == "" {
		payload.Context.HardwareFingerprint.PrimaryIPv4 = firstNonEmpty(
			findMetricValue(payload.Metrics, "node.primary_ipv4"),
			findMetricTag(payload.Metrics, "address"),
		)
	}
	if payload.Context.HardwareFingerprint.OSProduct == "" {
		payload.Context.HardwareFingerprint.OSProduct = firstNonEmpty(
			findMetricValue(payload.Metrics, "node.os_product"),
			findMetricTag(payload.Metrics, "product"),
		)
	}
	if payload.Context.HardwareFingerprint.LogicalCPUCount == "" {
		payload.Context.HardwareFingerprint.LogicalCPUCount = findMetricValue(payload.Metrics, "node.logical_cpu_count")
	}
}

func firstMetricSource(metrics []MetricRecord) string {
	for _, metric := range metrics {
		if metric.Source != "" {
			return metric.Source
		}
	}
	return ""
}

func findMetricTag(metrics []MetricRecord, keys ...string) string {
	for _, metric := range metrics {
		for _, key := range keys {
			if metric.Tags[key] != "" {
				return metric.Tags[key]
			}
		}
	}
	return ""
}

func findMetricValue(metrics []MetricRecord, metricKey string) string {
	for _, metric := range metrics {
		if metric.MetricKey != metricKey || metric.Value == nil {
			continue
		}
		switch value := metric.Value.(type) {
		case string:
			return value
		case float64:
			return trimFloat(value)
		case int:
			return trimInt(value)
		}
	}
	return ""
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
