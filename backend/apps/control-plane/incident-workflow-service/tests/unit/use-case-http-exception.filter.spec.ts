import type { ArgumentsHost } from '@nestjs/common';

import { UseCaseHttpExceptionFilter } from '../../src/presentation/http/filters/use-case-http-exception.filter';
import { BadRequestUseCaseError } from '../../src/use-cases/errors/use-case.errors';

describe('UseCaseHttpExceptionFilter', () => {
  it('maps BadRequestUseCaseError to a 400 error envelope', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const switchToHttp = jest.fn().mockReturnValue({
      getResponse: () => ({ status }),
      getRequest: () => ({
        headers: {
          'x-request-id': 'request-1',
          'x-correlation-id': 'correlation-1',
        },
      }),
    });

    new UseCaseHttpExceptionFilter().catch(
      new BadRequestUseCaseError('Invalid transition.', {
        allowedTransitions: ['ASSIGNED'],
      }),
      { switchToHttp } as unknown as ArgumentsHost,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid transition.',
          details: { allowedTransitions: ['ASSIGNED'] },
        },
      }),
    );
  });
});
