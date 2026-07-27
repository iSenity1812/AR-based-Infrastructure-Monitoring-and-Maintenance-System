import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { DownstreamServiceError } from '@application/errors/downstream-service.error';

export function toArBlockingException(error: DownstreamServiceError): Error {
  switch (error.reason) {
    case 'NOT_FOUND':
      return new NotFoundException({
        code: `${error.serviceName}.not_found`,
        message: error.message,
      });
    case 'FORBIDDEN':
      return new ForbiddenException({
        code: `${error.serviceName}.forbidden`,
        message: error.message,
      });
    case 'VALIDATION_FAILED':
      return new UnprocessableEntityException({
        code: `${error.serviceName}.validation_failed`,
        message: error.message,
      });
    case 'CONFLICT':
      return new ConflictException({
        code: `${error.serviceName}.conflict`,
        message: error.message,
      });
    case 'UNAVAILABLE':
      return new ServiceUnavailableException({
        code: `${error.serviceName}.unavailable`,
        message: error.message,
      });
  }
}

export function toArBadGateway(error: DownstreamServiceError): Error {
  return new BadGatewayException({
    code: `${error.serviceName}.${error.reason.toLowerCase()}`,
    message: error.message,
  });
}
