import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshSessionRequestDto {
  @ApiProperty({
    example: '665b9f053a5d8b6cc4915d17',
    description: 'Current session identifier.',
  })
  @IsString()
  sessionId!: string;

  @ApiProperty({
    example: '4ef3adf4-4424-4b66-a2e8-f9922f0f8ab9',
    description: 'Refresh token issued at login or refresh.',
  })
  @IsString()
  refreshToken!: string;
}
