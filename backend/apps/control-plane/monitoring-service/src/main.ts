import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MonitoringServiceConfig } from './infrastructure/config/monitoring-service-config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(MonitoringServiceConfig);

  app.setGlobalPrefix(config.apiPrefix);
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Monitoring Context Service')
      .setDescription(
        'Monitoring context service for AR-based infrastructure monitoring and maintenance system.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document);
  }

  await app.listen(config.port);
  Logger.log(
    `Monitoring Service is running on: http://localhost:${config.port}/${config.apiPrefix}`,
  );
}

void bootstrap();
