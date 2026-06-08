import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({
    example: 'TempPass@123',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewStrongPass@123',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
