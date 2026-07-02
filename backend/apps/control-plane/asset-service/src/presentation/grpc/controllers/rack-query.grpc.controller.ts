import { Controller } from '@nestjs/common';
import { RpcException, GrpcMethod } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

import { UseCaseError } from '@use-cases/errors/use-case.errors';
import {
  BatchGetRackSummariesUseCase,
  GetRackSummaryByCodeUseCase,
  GetRackSummaryUseCase,
  ListRackSummariesUseCase,
} from '@use-cases/queries/topology.queries';
import {
  BatchGetRacksRequestDto,
  GetRackByCodeRequestDto,
  GetRackRequestDto,
} from '@presentation/grpc/dto/rack-query.request.dto';

@Controller()
export class RackQueryGrpcController {
  constructor(
    private readonly getRackSummaryUseCase: GetRackSummaryUseCase,
    private readonly getRackSummaryByCodeUseCase: GetRackSummaryByCodeUseCase,
    private readonly listRackSummariesUseCase: ListRackSummariesUseCase,
    private readonly batchGetRackSummariesUseCase: BatchGetRackSummariesUseCase,
  ) {}

  @GrpcMethod('RackQueryService', 'GetRack')
  async getRack(data: GetRackRequestDto) {
    return this.executeRpc(() =>
      this.getRackSummaryUseCase.execute(data.rackId),
    );
  }

  @GrpcMethod('RackQueryService', 'GetRackByCode')
  async getRackByCode(data: GetRackByCodeRequestDto) {
    return this.executeRpc(() =>
      this.getRackSummaryByCodeUseCase.execute(data.rackCode),
    );
  }

  @GrpcMethod('RackQueryService', 'ListRacks')
  async listRacks() {
    const racks = await this.executeRpc(() =>
      this.listRackSummariesUseCase.execute(),
    );

    return { racks };
  }

  @GrpcMethod('RackQueryService', 'BatchGetRacks')
  async batchGetRacks(data: BatchGetRacksRequestDto) {
    const racks = await this.executeRpc(() =>
      this.batchGetRackSummariesUseCase.execute(data.rackIds),
    );

    return { racks };
  }

  private async executeRpc<T>(work: () => Promise<T> | T): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  private toRpcException(error: unknown): RpcException {
    if (error instanceof UseCaseError) {
      return new RpcException({
        code: this.mapHttpStatusToGrpcStatus(error.statusCode),
        message: error.message,
        details: error.errorCode,
      });
    }

    if (error instanceof Error) {
      return new RpcException({
        code: status.INTERNAL,
        message: error.message,
      });
    }

    return new RpcException({
      code: status.INTERNAL,
      message: 'An unexpected error occurred.',
    });
  }

  private mapHttpStatusToGrpcStatus(httpStatus: number): status {
    switch (httpStatus) {
      case 400:
        return status.INVALID_ARGUMENT;
      case 401:
        return status.UNAUTHENTICATED;
      case 403:
        return status.PERMISSION_DENIED;
      case 404:
        return status.NOT_FOUND;
      case 409:
        return status.FAILED_PRECONDITION;
      default:
        return status.INTERNAL;
    }
  }
}
