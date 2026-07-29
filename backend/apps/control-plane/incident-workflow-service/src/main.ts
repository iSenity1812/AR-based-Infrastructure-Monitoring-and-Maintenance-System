import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AppModule } from './app.module';
import { IncidentWorkflowServiceConfig } from '@infrastructure/config/incident-workflow-service-config';

function getCorsOrigins(): string[] {
  const rawOrigins =
    process.env.CORS_ORIGIN ??
    'http://localhost:8083,http://127.0.0.1:8083,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006,http://localhost:3000';

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(IncidentWorkflowServiceConfig);

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'x-correlation-id',
    ],
  });

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

  app.setGlobalPrefix(config.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (config.swaggerEnabled && process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Incident Workflow Service API')
      .setDescription('Ticket and incident workflow APIs.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(config.port);
}

void bootstrap();
