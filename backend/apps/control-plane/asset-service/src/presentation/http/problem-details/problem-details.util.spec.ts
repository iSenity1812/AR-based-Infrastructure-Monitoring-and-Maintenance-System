import { ConflictUseCaseError } from '@use-cases/errors/use-case.errors';

import { toProblemDetails } from './problem-details.util';

describe('problem details mapping', () => {
  it('maps use-case errors to their declared HTTP status', () => {
    const problem = toProblemDetails(
      new ConflictUseCaseError('Rack already has a node at position U20.'),
      {
        headers: {},
        originalUrl: '/api/v1/admin/topology/nodes/node-1',
      },
    );

    const details = problem.error.details!;
    expect(details.status).toBe(409);
    expect(problem.error.code).toBe('CONFLICT');
    expect(details.reason).toContain('Rack already has a node');
  });
});
