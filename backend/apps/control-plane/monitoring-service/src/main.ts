import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { MonitoringServiceConfig } from './infrastructure/config/monitoring-service-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(MonitoringServiceConfig);

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
  app.enableCors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    }),
  );

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Monitoring Service')
      .setDescription(
        'Monitoring control-plane service for alert truth, health summaries, and monitoring-facing read models.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      // .addServer()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(config.port);
  Logger.log(
    `Monitoring Service is running on: http://localhost:${config.port}/${config.apiPrefix}`,
  );
}

void bootstrap();
