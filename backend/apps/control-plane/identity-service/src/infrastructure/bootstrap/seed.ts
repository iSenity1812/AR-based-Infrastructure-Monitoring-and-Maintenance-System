import { NestFactory } from '@nestjs/core';

import { IdentityServiceConfig } from '../config/identity-service-config';
import { SEED_IDENTITY_USE_CASE } from '../di/use-case.tokens';
import type { SeedIdentityUseCase } from '../../use-cases/commands/seed-identity.use-case';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const config = app.get(IdentityServiceConfig);
    const seedIdentityUseCase = app.get<SeedIdentityUseCase>(
      SEED_IDENTITY_USE_CASE,
    );

    await seedIdentityUseCase.execute({
      adminUsername: config.adminUsername,
      adminEmail: config.adminEmail,
      adminPassword: config.adminPassword,
    });
  } finally {
    await app.close();
  }
}

void bootstrap();
