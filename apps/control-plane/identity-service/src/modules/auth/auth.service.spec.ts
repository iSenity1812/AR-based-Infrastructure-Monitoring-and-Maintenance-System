import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/user-status.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsernameOrEmail: jest.fn(),
            toObjectId: (id: string) => new Types.ObjectId(id),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            createSession: jest.fn(),
            rotateSession: jest.fn(),
            requireActiveSession: jest.fn(),
            assertSessionOwnedByUser: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, unknown> = {
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_ACCESS_TTL_SECONDS: 900,
                JWT_REFRESH_TTL_SECONDS: 3600,
              };
              if (!(key in values)) throw new Error(`missing ${key}`);
              return values[key];
            },
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    sessionsService = moduleRef.get(SessionsService);
    jwtService = moduleRef.get(JwtService);
  });

  it('rejects login for inactive users', async () => {
    usersService.findByUsernameOrEmail.mockResolvedValueOnce({
      _id: new Types.ObjectId(),
      username: 'u',
      email: 'u@example.com',
      passwordHash: 'hash',
      status: UserStatus.INACTIVE,
      roleIds: [],
    } as any);

    await expect(
      authService.login({ usernameOrEmail: 'u', password: 'p' }),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('issues access+refresh tokens on valid login', async () => {
    const userId = new Types.ObjectId();
    usersService.findByUsernameOrEmail.mockResolvedValueOnce({
      _id: userId,
      username: 'u',
      email: 'u@example.com',
      passwordHash: 'hash',
      status: UserStatus.ACTIVE,
      roleIds: [],
    } as any);

    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'bcrypt-hash');

    const sessionId = new Types.ObjectId();
    sessionsService.createSession.mockResolvedValueOnce({
      _id: sessionId,
      userId,
      refreshTokenHash: 'placeholder',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    } as any);

    jwtService.signAsync.mockResolvedValueOnce('refresh-token' as any);
    jwtService.signAsync.mockResolvedValueOnce('access-token' as any);

    const result = await authService.login({
      usernameOrEmail: 'u',
      password: 'p',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(sessionsService.rotateSession).toHaveBeenCalled();
  });
});
