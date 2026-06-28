import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AppModule } from '@infrastructure/bootstrap/app.module';
import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';
import { createValidationProblem } from '@presentation/http/problem-details/problem-details.util';
import { LoggingInterceptor } from '@presentation/interceptors/logging.interceptor';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AssetServiceConfig);

  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId =
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : randomUUID();
    const correlationId =
      typeof request.headers['x-correlation-id'] === 'string'
        ? request.headers['x-correlation-id']
        : requestId;

    request.headers['x-request-id'] = requestId;
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);
    next();
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: createValidationProblem,
    }),
  );

  // interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Asset Context Service')
      .setDescription(
        'Rack, node, marker lifecycle, topology, and contextual lookup APIs.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addServer('/asset')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  await app.listen(config.port);
  Logger.log(
    `Asset service listening on http://localhost:${config.port}/api/v1`,
    'Bootstrap',
  );
}
