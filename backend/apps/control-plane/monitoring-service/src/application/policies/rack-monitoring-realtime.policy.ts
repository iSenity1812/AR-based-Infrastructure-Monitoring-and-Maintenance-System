import type { MonitoringTransition } from '../ports/monitoring-transition';

export function shouldEmitRackMonitoringStateChanged(
  transition: MonitoringTransition,
): boolean {
  return (
    transition.scopeType === 'rack' &&
    (transition.transitionKind === 'activate' ||
      transition.transitionKind === 'resolve')
  );
}
