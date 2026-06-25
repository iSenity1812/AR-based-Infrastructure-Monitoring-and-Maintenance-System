package usecases

import (
	"context"
	"errors"
	"fmt"
	"log"

	"telemetry-shaping-service/internal/domain/entities"
)

var ErrDispatchFailed = errors.New("lane dispatch failed")

type LaneSink interface {
	Handle(ctx context.Context, batch entities.LaneBatch) error
}

type LaneDispatcher interface {
	Dispatch(ctx context.Context, batch entities.RoutedLaneBatch) error
}

type DefaultLaneDispatcher struct {
	contextSink   LaneSink
	dashboardSink LaneSink
	snapshotSink  LaneSink
	windowSink    LaneSink
}

func NewDefaultLaneDispatcher(
	contextSink LaneSink,
	dashboardSink LaneSink,
	snapshotSink LaneSink,
	windowSink LaneSink,
) *DefaultLaneDispatcher {
	return &DefaultLaneDispatcher{
		contextSink:   contextSink,
		dashboardSink: dashboardSink,
		snapshotSink:  snapshotSink,
		windowSink:    windowSink,
	}
}

func (d *DefaultLaneDispatcher) Dispatch(ctx context.Context, batch entities.RoutedLaneBatch) error {
	steps := []struct {
		name string
		sink LaneSink
		lane entities.LaneBatch
	}{
		{name: string(entities.LaneNameContext), sink: d.contextSink, lane: batch.Context},
		{name: string(entities.LaneNameSnapshot), sink: d.snapshotSink, lane: batch.Snapshot},
		{name: string(entities.LaneNameDashboard), sink: d.dashboardSink, lane: batch.Dashboard},
		{name: string(entities.LaneNameWindow), sink: d.windowSink, lane: batch.Window},
	}

	for _, step := range steps {
		if step.sink == nil || len(step.lane.Metrics) == 0 {
			continue
		}

		if err := step.sink.Handle(ctx, step.lane); err != nil {
			return errors.Join(
				ErrDispatchFailed,
				fmt.Errorf("dispatch %s lane: %w", step.name, err),
			)
		}
	}

	return nil
}

type LoggingLaneSink struct {
	lane entities.LaneName
}

func NewLoggingLaneSink(lane entities.LaneName) *LoggingLaneSink {
	return &LoggingLaneSink{lane: lane}
}

func (s *LoggingLaneSink) Handle(_ context.Context, batch entities.LaneBatch) error {
	log.Printf(
		"lane dispatch lane=%s topic=%s partition=%d offset=%d agent_id=%s batch_sequence=%d metric_count=%d",
		s.lane,
		batch.Topic,
		batch.Partition,
		batch.Offset,
		batch.AgentID,
		batch.BatchSequence,
		len(batch.Metrics),
	)

	return nil
}
