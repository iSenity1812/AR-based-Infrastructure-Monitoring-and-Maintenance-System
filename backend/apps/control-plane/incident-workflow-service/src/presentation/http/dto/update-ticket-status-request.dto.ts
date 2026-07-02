import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { TicketStatus } from '@domain/constants/ticket-status.enum';

export class UpdateTicketStatusRequestDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
