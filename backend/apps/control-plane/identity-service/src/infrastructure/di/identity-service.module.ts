import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';

import { UserModel, UserSchema } from '../../adapters/persistence/mongoose/schemas/user.schema';
import { RoleModel, RoleSchema } from '../../adapters/persistence/mongoose/schemas/role.schema';
import { SessionModel, SessionSchema } from '../../adapters/persistence/mongoose/schemas/session.schema';
import { MongooseUserRepository } from '../../adapters/persistence/mongoose/repositories/mongoose-user.repository';
import { MongooseRoleRepository } from '../../adapters/persistence/mongoose/repositories/mongoose-role.repository';
import { MongooseSessionRepository } from '../../adapters/persistence/mongoose/repositories/mongoose-session.repository';
import { BcryptPasswordHasherAdapter } from '../../adapters/security/bcrypt-password-hasher.adapter';
import { JwtAccessTokenIssuerAdapter } from '../../adapters/security/jwt-access-token-issuer.adapter';
import { UuidRefreshTokenGeneratorAdapter } from '../../adapters/security/uuid-refresh-token-generator.adapter';
import { ACCESS_TOKEN_ISSUER, PASSWORD_HASHER, REFRESH_TOKEN_GENERATOR, ROLE_REPOSITORY, SESSION_REPOSITORY, USER_REPOSITORY } from '../../domain/ports/port.tokens';
import type { AccessTokenIssuerPort } from '../../domain/ports/access-token-issuer.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { RefreshTokenGeneratorPort } from '../../domain/ports/refresh-token-generator.port';
import type { RoleRepositoryPort } from '../../domain/ports/role-repository.port';
import type { SessionRepositoryPort } from '../../domain/ports/session-repository.port';
import type { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { IdentityServiceConfig } from '../config/identity-service-config';
import { AuthController } from '../../presentation/http/controllers/auth.controller';
import { AdminUsersController } from '../../presentation/http/controllers/admin-users.controller';
import { RolesController } from '../../presentation/http/controllers/roles.controller';
import { HealthController } from '../../presentation/http/controllers/health.controller';
import { JwtStrategy } from '../../presentation/http/strategies/jwt.strategy';
import { PermissionsGuard } from '../../presentation/http/guards/permissions.guard';
import { UseCaseHttpExceptionFilter } from '../../presentation/http/filters/use-case-http-exception.filter';
import { IdentityPermissionService } from '../../use-cases/services/identity-permission.service';
import { LoginUseCase } from '../../use-cases/commands/login.use-case';
import { LogoutUseCase } from '../../use-cases/commands/logout.use-case';
import { RefreshSessionUseCase } from '../../use-cases/commands/refresh-session.use-case';
import { GetCurrentUserUseCase } from '../../use-cases/queries/get-current-user.use-case';
import { CreateUserUseCase } from '../../use-cases/commands/create-user.use-case';
import { UpdateUserStatusUseCase } from '../../use-cases/commands/update-user-status.use-case';
import { AssignUserRolesUseCase } from '../../use-cases/commands/assign-user-roles.use-case';
import { ListRolesUseCase } from '../../use-cases/queries/list-roles.use-case';
import { GetHealthUseCase } from '../../use-cases/queries/get-health.use-case';
import { SeedIdentityUseCase } from '../../use-cases/commands/seed-identity.use-case';
import { ASSIGN_USER_ROLES_USE_CASE, CREATE_USER_USE_CASE, GET_CURRENT_USER_USE_CASE, GET_HEALTH_USE_CASE, LIST_ROLES_USE_CASE, LOGIN_USE_CASE, LOGOUT_USE_CASE, REFRESH_SESSION_USE_CASE, SEED_IDENTITY_USE_CASE, UPDATE_USER_STATUS_USE_CASE } from './use-case.tokens';

@Module({
  imports: [
    PassportModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
      { name: RoleModel.name, schema: RoleSchema },
      { name: SessionModel.name, schema: SessionSchema },
    ]),
  ],
  controllers: [
    AuthController,
    AdminUsersController,
    RolesController,
    HealthController,
  ],
  providers: [
    IdentityServiceConfig,
    JwtStrategy,
    PermissionsGuard,
    {
      provide: APP_FILTER,
      useClass: UseCaseHttpExceptionFilter,
    },
    IdentityPermissionService,
    MongooseUserRepository,
    MongooseRoleRepository,
    MongooseSessionRepository,
    BcryptPasswordHasherAdapter,
    JwtAccessTokenIssuerAdapter,
    UuidRefreshTokenGeneratorAdapter,
    {
      provide: USER_REPOSITORY,
      useExisting: MongooseUserRepository,
    },
    {
      provide: ROLE_REPOSITORY,
      useExisting: MongooseRoleRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useExisting: MongooseSessionRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useExisting: BcryptPasswordHasherAdapter,
    },
    {
      provide: ACCESS_TOKEN_ISSUER,
      useExisting: JwtAccessTokenIssuerAdapter,
    },
    {
      provide: REFRESH_TOKEN_GENERATOR,
      useExisting: UuidRefreshTokenGeneratorAdapter,
    },
    {
      provide: LOGIN_USE_CASE,
      inject: [
        USER_REPOSITORY,
        ROLE_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_HASHER,
        ACCESS_TOKEN_ISSUER,
        REFRESH_TOKEN_GENERATOR,
        IdentityPermissionService,
      ],
      useFactory: (
        userRepository: UserRepositoryPort,
        roleRepository: RoleRepositoryPort,
        sessionRepository: SessionRepositoryPort,
        passwordHasher: PasswordHasherPort,
        accessTokenIssuer: AccessTokenIssuerPort,
        refreshTokenGenerator: RefreshTokenGeneratorPort,
        identityPermissionService: IdentityPermissionService,
      ) =>
        new LoginUseCase(
          userRepository,
          roleRepository,
          sessionRepository,
          passwordHasher,
          accessTokenIssuer,
          refreshTokenGenerator,
          identityPermissionService,
        ),
    },
    {
      provide: LOGOUT_USE_CASE,
      inject: [SESSION_REPOSITORY],
      useFactory: (sessionRepository: SessionRepositoryPort) =>
        new LogoutUseCase(sessionRepository),
    },
    {
      provide: REFRESH_SESSION_USE_CASE,
      inject: [
        SESSION_REPOSITORY,
        USER_REPOSITORY,
        ROLE_REPOSITORY,
        PASSWORD_HASHER,
        ACCESS_TOKEN_ISSUER,
        REFRESH_TOKEN_GENERATOR,
        IdentityPermissionService,
      ],
      useFactory: (
        sessionRepository: SessionRepositoryPort,
        userRepository: UserRepositoryPort,
        roleRepository: RoleRepositoryPort,
        passwordHasher: PasswordHasherPort,
        accessTokenIssuer: AccessTokenIssuerPort,
        refreshTokenGenerator: RefreshTokenGeneratorPort,
        identityPermissionService: IdentityPermissionService,
      ) =>
        new RefreshSessionUseCase(
          sessionRepository,
          userRepository,
          roleRepository,
          passwordHasher,
          accessTokenIssuer,
          refreshTokenGenerator,
          identityPermissionService,
        ),
    },
    {
      provide: GET_CURRENT_USER_USE_CASE,
      inject: [USER_REPOSITORY, ROLE_REPOSITORY, IdentityPermissionService],
      useFactory: (
        userRepository: UserRepositoryPort,
        roleRepository: RoleRepositoryPort,
        identityPermissionService: IdentityPermissionService,
      ) =>
        new GetCurrentUserUseCase(
          userRepository,
          roleRepository,
          identityPermissionService,
        ),
    },
    {
      provide: GET_HEALTH_USE_CASE,
      useFactory: () => new GetHealthUseCase(),
    },
    {
      provide: CREATE_USER_USE_CASE,
      inject: [USER_REPOSITORY, ROLE_REPOSITORY, PASSWORD_HASHER, IdentityPermissionService],
      useFactory: (
        userRepository: UserRepositoryPort,
        roleRepository: RoleRepositoryPort,
        passwordHasher: PasswordHasherPort,
        identityPermissionService: IdentityPermissionService,
      ) =>
        new CreateUserUseCase(
          userRepository,
          roleRepository,
          passwordHasher,
          identityPermissionService,
        ),
    },
    {
      provide: UPDATE_USER_STATUS_USE_CASE,
      inject: [
        USER_REPOSITORY,
        ROLE_REPOSITORY,
        SESSION_REPOSITORY,
        IdentityPermissionService,
      ],
      useFactory: (
        userRepository: UserRepositoryPort,
        roleRepository: RoleRepositoryPort,
        sessionRepository: SessionRepositoryPort,
        identityPermissionService: IdentityPermissionService,
      ) =>
        new UpdateUserStatusUseCase(
          userRepository,
          roleRepository,
          sessionRepository,
          identityPermissionService,
        ),
    },
    {
      provide: ASSIGN_USER_ROLES_USE_CASE,
      inject: [USER_REPOSITORY, ROLE_REPOSITORY, IdentityPermissionService],
      useFactory: (
        userRepository: UserRepositoryPort,
        roleRepository: RoleRepositoryPort,
        identityPermissionService: IdentityPermissionService,
      ) =>
        new AssignUserRolesUseCase(
          userRepository,
          roleRepository,
          identityPermissionService,
        ),
    },
    {
      provide: LIST_ROLES_USE_CASE,
      inject: [ROLE_REPOSITORY],
      useFactory: (roleRepository: RoleRepositoryPort) =>
        new ListRolesUseCase(roleRepository),
    },
    {
      provide: SEED_IDENTITY_USE_CASE,
      inject: [ROLE_REPOSITORY, USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        roleRepository: RoleRepositoryPort,
        userRepository: UserRepositoryPort,
        passwordHasher: PasswordHasherPort,
      ) =>
        new SeedIdentityUseCase(
          roleRepository,
          userRepository,
          passwordHasher,
        ),
    },
  ],
  exports: [SEED_IDENTITY_USE_CASE, IdentityServiceConfig],
})
export class IdentityServiceModule {}
