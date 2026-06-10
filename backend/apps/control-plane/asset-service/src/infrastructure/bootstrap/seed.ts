import { NestFactory } from '@nestjs/core';

import { AppModule } from '@infrastructure/bootstrap/app.module';
import { SeedAssetContextUseCase } from '@use-cases/commands/seed-asset-context.use-case';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const seedAssetContextUseCase = app.get(SeedAssetContextUseCase);
    const result = await seedAssetContextUseCase.execute();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    process.exitCode = 1;
    console.error(error);
  } finally {
    await app.close();
  }
}

void bootstrap().finally(() => {
  setImmediate(() => process.exit(process.exitCode ?? 0));
});
