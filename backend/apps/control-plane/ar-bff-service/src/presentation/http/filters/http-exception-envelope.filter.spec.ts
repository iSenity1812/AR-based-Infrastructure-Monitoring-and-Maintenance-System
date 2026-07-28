import {
  ArgumentsHost,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { HttpExceptionEnvelopeFilter } from './http-exception-envelope.filter';

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: unknown;
  };
  meta: {
    timestamp: string;
    correlationId: string;
    version: string;
  };
};

function createHost(headers: Record<string, string> = {}) {
  const json = jest.fn<void, [unknown]>();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ headers }),
    }),
  } as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionEnvelopeFilter', () => {
  it('serializes unauthorized errors with the shared envelope shape', () => {
    const filter = new HttpExceptionEnvelopeFilter();
    const { host, status, json } = createHost({
      'x-correlation-id': 'corr-1',
    });

    filter.catch(new UnauthorizedException('Invalid credentials.'), host);

    expect(status).toHaveBeenCalledWith(401);
    const body = json.mock.calls[0][0] as ErrorEnvelope;

    expect(body.meta.timestamp).toEqual(expect.any(String) as string);
    expect(body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid credentials.',
        details: {
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials.',
          validationErrors: undefined,
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
        correlationId: 'corr-1',
        version: 'v1',
      },
    });
  });

  it('serializes missing permission errors with the shared envelope shape', () => {
    const filter = new HttpExceptionEnvelopeFilter();
    const { host, status, json } = createHost({
      'x-request-id': 'req-1',
    });

    filter.catch(new ForbiddenException('Missing required permissions.'), host);

    expect(status).toHaveBeenCalledWith(403);
    const body = json.mock.calls[0][0] as ErrorEnvelope;

    expect(body.meta.timestamp).toEqual(expect.any(String) as string);
    expect(body).toEqual({
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Missing required permissions.',
        details: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Missing required permissions.',
          validationErrors: undefined,
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
        correlationId: 'req-1',
        version: 'v1',
      },
    });
  });
});
