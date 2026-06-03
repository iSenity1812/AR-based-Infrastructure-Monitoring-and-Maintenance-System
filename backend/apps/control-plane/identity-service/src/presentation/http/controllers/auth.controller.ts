import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { IdentityServiceConfig } from '../../../infrastructure/config/identity-service-config';
import { parseDurationToMilliseconds } from '../../../infrastructure/config/time.util';
import { GetCurrentUserUseCase } from '../../../use-cases/queries/get-current-user.use-case';
import { LOGIN_USE_CASE, LOGOUT_USE_CASE, REFRESH_SESSION_USE_CASE, GET_CURRENT_USER_USE_CASE } from '../../../infrastructure/di/use-case.tokens';
import { LoginUseCase } from '../../../use-cases/commands/login.use-case';
import { LogoutUseCase } from '../../../use-cases/commands/logout.use-case';
import { RefreshSessionUseCase } from '../../../use-cases/commands/refresh-session.use-case';
import { CurrentAuthContext } from '../decorators/current-auth-context.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginRequestDto } from '../dto/login-request.dto';
import { RefreshSessionRequestDto } from '../dto/refresh-session-request.dto';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';
import type { CurrentAuthContextDto } from '../../../use-cases/dto/current-auth-context.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(LOGIN_USE_CASE)
    private readonly loginUseCase: LoginUseCase,
    @Inject(REFRESH_SESSION_USE_CASE)
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    @Inject(LOGOUT_USE_CASE)
    private readonly logoutUseCase: LogoutUseCase,
    @Inject(GET_CURRENT_USER_USE_CASE)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly config: IdentityServiceConfig,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user and create a session.' })
  async login(
    @Body() requestDto: LoginRequestDto,
    @Req() request: Request,
  ) {
    const userAgentHeader = request.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    const ipAddress = request.ip;

    const result = await this.loginUseCase.execute({
      email: requestDto.email,
      password: requestDto.password,
      userAgent,
      ipAddress,
      refreshTokenExpiresAt: new Date(
        Date.now() + parseDurationToMilliseconds(this.config.refreshTokenTtl),
      ),
    });

    return serializeEnvelope(result);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access and refresh tokens.' })
  async refresh(@Body() requestDto: RefreshSessionRequestDto) {
    const result = await this.refreshSessionUseCase.execute({
      sessionId: requestDto.sessionId,
      refreshToken: requestDto.refreshToken,
      refreshTokenExpiresAt: new Date(
        Date.now() + parseDurationToMilliseconds(this.config.refreshTokenTtl),
      ),
    });

    return serializeEnvelope(result);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current authenticated session.' })
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentAuthContext() context: CurrentAuthContextDto) {
    await this.logoutUseCase.execute(context.sessionId);

    return serializeEnvelope({ success: true });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user profile.' })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentAuthContext() context: CurrentAuthContextDto) {
    const result = await this.getCurrentUserUseCase.execute(context);

    return serializeEnvelope(result);
  }
}
