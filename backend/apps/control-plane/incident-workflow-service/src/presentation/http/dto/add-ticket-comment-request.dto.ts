import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddTicketCommentRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  comment!: string;
}
