import { GetHealthUseCase } from '@use-cases/queries/get-health.use-case';

describe('GetHealthUseCase', () => {
  it('returns the incident workflow service health payload', () => {
    const useCase = new GetHealthUseCase();

    expect(useCase.execute()).toEqual({
      status: 'ok',
      service: 'incident-workflow-service',
    });
  });
});
