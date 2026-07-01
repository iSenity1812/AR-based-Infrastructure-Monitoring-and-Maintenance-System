type HeaderRequest = { headers: Record<string, string | undefined> };

export function responseMeta(request: HeaderRequest) {
  return {
    requestId: request.headers['x-request-id'],
    correlationId:
      request.headers['x-correlation-id'] ?? request.headers['x-request-id'],
  };
}
