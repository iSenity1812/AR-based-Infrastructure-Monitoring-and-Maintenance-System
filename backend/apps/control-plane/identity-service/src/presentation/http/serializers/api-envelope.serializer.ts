export interface ApiEnvelope<TData> {
  data: TData;
  meta: {
    timestamp: string;
  };
}

export function serializeEnvelope<TData>(data: TData): ApiEnvelope<TData> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
