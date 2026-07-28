import Constants from 'expo-constants';

type ExtraConfig = {
  identityApiUrl?: string;
  incidentApiUrl?: string;
  webarUrl?: string;
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
    'http://localhost:4004/api/v1',
  webarUrl: process.env.EXPO_PUBLIC_WEBAR_URL ?? extra.webarUrl ?? '',
};
