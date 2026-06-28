import { apiConfig } from './config';
import { requestJson } from './client';
import type { Incident, IncidentProps } from '../types/incident';

function unwrapIncident(incident: Incident | IncidentProps): IncidentProps {
  return 'props' in incident && incident.props
    ? incident.props
    : (incident as IncidentProps);
}

export async function listIncidents(token: string): Promise<IncidentProps[]> {
  const incidents = await requestJson<Incident[] | IncidentProps[]>(
    apiConfig.incidentApiUrl,
    '/incidents',
    { token },
  );

  return incidents.map(unwrapIncident);
}

export async function getIncident(
  incidentId: string,
  token: string,
): Promise<IncidentProps> {
  return unwrapIncident(
    await requestJson<Incident | IncidentProps>(
      apiConfig.incidentApiUrl,
      `/incidents/${incidentId}`,
      { token },
    ),
  );
}
