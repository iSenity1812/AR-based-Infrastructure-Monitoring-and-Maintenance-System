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

  const apiPrefix = normalizePath(config.apiPrefix);
  const publicApiBasePath = normalizePath(config.publicApiBasePath);

  Logger.log(
    `Asset config loaded: mongoUri=${config.mongoUri}, redisUrl=${config.redisUrl}, kafkaBrokers=${config.kafkaBrokers.join(',')}, corsOrigins=${config.corsOrigins.join(',')}, apiPrefix=${apiPrefix}, publicApiBasePath=${publicApiBasePath}, env=${config.nodeEnv}`,
    'Bootstrap',
  );

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

  if (config.corsEnabled) {
    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      methods: config.corsMethods,
      credentials: true,
      preflightContinue: false,
    });
  }

  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: createValidationProblem,
    }),
  );

  app.useGlobalInterceptors(app.get(LoggingInterceptor));

  if (config.swaggerEnabled) {
    const publicServerPath = publicApiBasePath ? `/${publicApiBasePath}` : '/';

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Asset Context Service')
      .setDescription(
        'Rack, node, marker lifecycle, topology, and contextual lookup APIs.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addServer(publicServerPath)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    const docsPath = apiPrefix ? `${apiPrefix}/docs` : 'docs';
    SwaggerModule.setup(docsPath, app, document);
  }

  await app.listen(config.port);

  const localPath = apiPrefix ? `/${apiPrefix}` : '';
  Logger.log(
    `Asset service listening on http://localhost:${config.port}${localPath}`,
    'Bootstrap',
  );
}

function normalizePath(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}
