import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const CORRELATION_HEADER = 'x-correlation-id';

export class CorrelationIdMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incomingHeader = req.header(CORRELATION_HEADER);
    const correlationId =
      incomingHeader && incomingHeader.trim() !== ''
        ? incomingHeader
        : randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
  }
}
