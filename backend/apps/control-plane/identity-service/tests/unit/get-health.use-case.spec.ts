import { GetHealthUseCase } from '../../src/use-cases/queries/get-health.use-case';

describe('GetHealthUseCase', () => {
  it('should report the identity service as healthy', () => {
    const useCase = new GetHealthUseCase();

    expect(useCase.execute()).toEqual({
      status: 'ok',
      service: 'identity-service',
    });
  });
});