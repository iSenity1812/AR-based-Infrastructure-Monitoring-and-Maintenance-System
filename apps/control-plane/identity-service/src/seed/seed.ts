import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CapabilitiesService } from '../modules/capabilities/capabilities.service';
import { RolesService } from '../modules/roles/roles.service';
import { UserStatus } from '../modules/users/user-status.enum';
import { UsersService } from '../modules/users/users.service';
import { DEFAULT_ROLES, CORE_CAPABILITIES } from './seed.constants';
import { SeedModule } from './seed.module';

async function main() {
  const logger = new Logger('seed');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger,
  });

  try {
    const configService = app.get(ConfigService);
    const capabilitiesService = app.get(CapabilitiesService);
    const rolesService = app.get(RolesService);
    const usersService = app.get(UsersService);

    await capabilitiesService.upsertMany(CORE_CAPABILITIES);
    await rolesService.upsertMany(DEFAULT_ROLES);

    const adminRole = await rolesService.requireByName('IT Administrator');

    const adminUsername = configService.getOrThrow<string>(
      'BOOTSTRAP_ADMIN_USERNAME',
    );
    const adminEmail = configService
      .getOrThrow<string>('BOOTSTRAP_ADMIN_EMAIL')
      .toLowerCase();
    const adminPassword = configService.getOrThrow<string>(
      'BOOTSTRAP_ADMIN_PASSWORD',
    );

    const existingAdmin =
      (await usersService.findByUsernameOrEmail(adminUsername)) ??
      (await usersService.findByUsernameOrEmail(adminEmail));

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await usersService.createUser({
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        roleIds: [usersService.toObjectId(adminRole._id.toString())],
        status: UserStatus.ACTIVE,
      });
      logger.log('Bootstrap admin user created');
    } else {
      const nextRoleIds = new Set(
        existingAdmin.roleIds.map((id) => id.toString()),
      );
      nextRoleIds.add(adminRole._id.toString());

      await usersService.updateStatus(
        existingAdmin._id.toString(),
        UserStatus.ACTIVE,
      );
      await usersService.updateRoles(
        existingAdmin._id.toString(),
        Array.from(nextRoleIds).map((id) => usersService.toObjectId(id)),
      );
      logger.log('Bootstrap admin user updated');
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  const logger = new Logger('seed');
  logger.error(error);
  process.exit(1);
});
