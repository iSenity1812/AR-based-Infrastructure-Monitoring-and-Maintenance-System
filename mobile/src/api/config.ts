import Constants from 'expo-constants';

type ExtraConfig = {
  identityApiUrl?: string;
  incidentApiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const apiConfig = {
  identityApiUrl:
    process.env.EXPO_PUBLIC_IDENTITY_API_URL ??
    extra.identityApiUrl ??
    'http://localhost:4001/api/v1',
  incidentApiUrl:
    process.env.EXPO_PUBLIC_INCIDENT_API_URL ??
    extra.incidentApiUrl ??
    'http://localhost:4003/api/v1',
};
