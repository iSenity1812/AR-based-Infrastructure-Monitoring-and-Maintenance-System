import { BadRequestException } from '@nestjs/common';
import { ProblemDetailsExceptionFilter } from './problem-details-exception.filter';

describe('ProblemDetailsExceptionFilter', () => {
  it('returns the shared problem details envelope for HttpException payloads', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/health',
      headers: {
        'x-request-id': 'req-123',
        'x-correlation-id': 'corr-456',
      },
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    } as never;

    const filter = new ProblemDetailsExceptionFilter();
    filter.catch(
      new BadRequestException({
        error: 'Bad Request',
        message: ['name must be provided'],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Bad Request',
        details: {
          status: 400,
          type: 'about:blank',
          instance: '/api/v1/health',
          reason: 'Bad Request',
          detail: 'name must be provided',
          invalidParams: [
            {
              name: 'payload',
              reason: 'name must be provided',
            },
          ],
        },
      },
      meta: {
        requestId: 'req-123',
        correlationId: 'corr-456',
        version: 'v1',
        timestamp: expect.any(String),
      },
    });
  });

  it('includes stack trace details for unexpected errors', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/health',
      headers: {},
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    } as never;

    const filter = new ProblemDetailsExceptionFilter();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal Server Error',
          details: expect.objectContaining({
            status: 500,
            type: 'about:blank',
            instance: '/api/v1/health',
            reason: 'Internal Server Error',
            detail: expect.stringContaining('Error: boom'),
          }),
        },
        meta: expect.objectContaining({
          version: 'v1',
        }),
      }),
    );
  });
});
