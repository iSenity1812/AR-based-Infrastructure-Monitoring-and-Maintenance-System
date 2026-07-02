package usecases

import "telemetry-shaping-service/internal/domain/entities"

type LaneRouter interface {
	Route(batch entities.ClassifiedBatch) entities.RoutedLaneBatch
}

type DefaultLaneRouter struct{}

func NewDefaultLaneRouter() *DefaultLaneRouter {
	return &DefaultLaneRouter{}
}

func (r *DefaultLaneRouter) Route(batch entities.ClassifiedBatch) entities.RoutedLaneBatch {
	routed := entities.RoutedLaneBatch{
		Batch:     batch,
		Context:   newLaneBatch(entities.LaneNameContext, batch),
		Dashboard: newLaneBatch(entities.LaneNameDashboard, batch),
		Snapshot:  newLaneBatch(entities.LaneNameSnapshot, batch),
		Window:    newLaneBatch(entities.LaneNameWindow, batch),
	}

	for _, metric := range batch.Metrics {
		if metric.Classification.LaneMask&entities.LaneContext != 0 {
			routed.Context.Metrics = append(routed.Context.Metrics, metric)
		}
		if metric.Classification.LaneMask&entities.LaneDashboard != 0 {
			routed.Dashboard.Metrics = append(routed.Dashboard.Metrics, metric)
		}
		if metric.Classification.LaneMask&entities.LaneSnapshot != 0 {
			routed.Snapshot.Metrics = append(routed.Snapshot.Metrics, metric)
		}
		if metric.Classification.LaneMask&entities.LaneWindow != 0 {
			routed.Window.Metrics = append(routed.Window.Metrics, metric)
		}
	}

	return routed
}

func newLaneBatch(lane entities.LaneName, batch entities.ClassifiedBatch) entities.LaneBatch {
	return entities.LaneBatch{
		Lane:                lane,
		AgentID:             batch.Batch.AgentID,
		MessageKey:          batch.Batch.MessageKey,
		SourceType:          batch.Batch.SourceType,
		Topic:               batch.Batch.Topic,
		Partition:           batch.Batch.Partition,
		Offset:              batch.Batch.Offset,
		ReceivedAt:          batch.Batch.ReceivedAt,
		BatchSequence:       batch.Batch.BatchSequence,
		BatchRecordCount:    batch.Batch.BatchRecordCount,
		HardwareFingerprint: batch.Batch.HardwareFingerprint,
		Headers:             batch.Batch.Headers,
		Metrics:             make([]entities.ClassifiedMetric, 0),
	}
}
