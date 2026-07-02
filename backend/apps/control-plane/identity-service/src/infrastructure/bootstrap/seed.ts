import { NestFactory } from '@nestjs/core';

import { SEED_IDENTITY_USE_CASE } from '../di/use-case.tokens';
import type { SeedIdentityUseCase } from '../../use-cases/commands/seed-identity.use-case';
import { RoleCode } from '../../domain/constants/role-code.enum';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seedIdentityUseCase = app.get<SeedIdentityUseCase>(
      SEED_IDENTITY_USE_CASE,
    );

    await seedIdentityUseCase.execute({
      users: [
        {
          username: 'admin01',
          email: 'admin01@example.com',
          password: 'Admin01@123456',
          roleCodes: [RoleCode.IT_ADMINISTRATOR],
          fullName: 'Nguyen Minh Tri',
        },
        {
          username: 'admin02',
          email: 'admin02@example.com',
          password: 'Admin02@123456',
          roleCodes: [RoleCode.IT_ADMINISTRATOR],
          fullName: 'Tran Quang Huy',
        },
        {
          username: 'operator01',
          email: 'operator01@example.com',
          password: 'Operator01@123456',
          roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
          fullName: 'Le Anh Khoa',
        },
        {
          username: 'operator02',
          email: 'operator02@example.com',
          password: 'Operator02@123456',
          roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
          fullName: 'Pham Gia Bao',
        },
        {
          username: 'operator03',
          email: 'operator03@example.com',
          password: 'Operator03@123456',
          roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
          fullName: 'Vo Duc Long',
        },
        {
          username: 'operator04',
          email: 'operator04@example.com',
          password: 'Operator04@123456',
          roleCodes: [RoleCode.SYSTEM_MONITORING_OPERATOR],
          fullName: 'Huynh Tuan Kiet',
        },
        {
          username: 'technician01',
          email: 'technician01@example.com',
          password: 'Technician01@123456',
          roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
          fullName: 'Do Hoang Nam',
        },
        {
          username: 'technician02',
          email: 'technician02@example.com',
          password: 'Technician02@123456',
          roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
          fullName: 'Bui Thanh Tung',
        },
        {
          username: 'technician03',
          email: 'technician03@example.com',
          password: 'Technician03@123456',
          roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
          fullName: 'Dang Minh Duc',
        },
        {
          username: 'technician04',
          email: 'technician04@example.com',
          password: 'Technician04@123456',
          roleCodes: [RoleCode.MAINTENANCE_TECHNICIAN],
          fullName: 'Ngo Thanh Phuc',
        },
      ],
    });
  } finally {
    await app.close();
  }
}

void bootstrap();
