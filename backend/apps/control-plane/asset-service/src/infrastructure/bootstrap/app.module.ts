import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { LoggerModule } from 'nestjs-pino';

import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';
import { AssetServiceConfigModule } from '@infrastructure/config/asset-service-config.module';
import { AssetServiceModule } from '@infrastructure/di/asset-service.module';

@Module({
  imports: [
    AssetServiceConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        autoLogging: false,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers["x-api-key"]',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        // Pretty-printing via pino-pretty can be enabled locally by setting
        // PINO_PRETTY=1 once `pino-pretty` is added to devDependencies.
        // transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } },
      },
    }),
    CacheModule.register({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [AssetServiceConfigModule],
      inject: [AssetServiceConfig],
      useFactory: (config: AssetServiceConfig) => ({
        uri: config.mongoUri,
        serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
        retryAttempts: config.mongoRetryAttempts,
        retryDelay: config.mongoRetryDelayMs,
      }),
    }),
    RedisModule.forRootAsync(
      {
        imports: [AssetServiceConfigModule],
        inject: [AssetServiceConfig],
        useFactory: (...args: unknown[]) => {
          const config = args[0] as AssetServiceConfig;

          return {
            config: {
              url: config.redisUrl,
            },
          };
        },
      },
      true,
    ),
    AssetServiceModule,
  ],
})
export class AppModule {}
