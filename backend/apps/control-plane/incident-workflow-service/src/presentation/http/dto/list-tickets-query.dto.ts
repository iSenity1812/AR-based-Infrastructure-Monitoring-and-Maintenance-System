import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { TicketStatus } from '@domain/constants/ticket-status.enum';

export class ListTicketsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter tickets by exact ticket code.',
    example: 'TICKET-001',
  })
  @IsOptional()
  @IsString()
  ticketCode?: string;

  @ApiPropertyOptional({
    description: 'Filter tickets by linked incident id.',
    example: '6886d2cb7f2c3d32c9912345',
  })
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiPropertyOptional({
    description: 'Filter tickets by workflow status.',
    enum: TicketStatus,
    example: TicketStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
