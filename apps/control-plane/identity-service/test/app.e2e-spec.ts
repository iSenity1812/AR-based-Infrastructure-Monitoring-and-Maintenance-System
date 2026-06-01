import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { CorrelationIdMiddleware } from '../src/common/correlation-id.middleware';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '../src/common/response-envelope.interceptor';
import { HealthModule } from '../src/modules/health/health.module';

@Module({
  imports: [HealthModule],
})
class TestAppModule {}

describe('IdentityService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(new CorrelationIdMiddleware().use);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET) returns envelope with correlationId', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set('x-correlation-id', 'req-123')
      .expect(200)
      .expect({
        data: { status: 'ok' },
        meta: { correlationId: 'req-123', version: 'v1' },
      });
  });
});
