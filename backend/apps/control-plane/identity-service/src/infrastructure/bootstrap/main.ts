import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { IdentityServiceConfig } from "../config/identity-service-config";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  let globalPrefix = process.env.API_PREFIX || "api/v1";
  app.setGlobalPrefix(globalPrefix);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = app.get(IdentityServiceConfig);

  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Identity Service API")
      .setDescription("Authentication, user access, role, and session APIs.")
      .setVersion("1.0.0")
      .addBearerAuth()
      .addServer("/identity/")
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(config.port);
}

void bootstrap();
