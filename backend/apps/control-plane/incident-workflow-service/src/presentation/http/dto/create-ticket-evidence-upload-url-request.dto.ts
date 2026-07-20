import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';

import { TicketEvidenceType } from '@domain/constants/ticket-evidence-type.enum';

export class CreateTicketEvidenceUploadUrlRequestDto {
  @ApiProperty({ enum: TicketEvidenceType })
  @IsEnum(TicketEvidenceType)
  type!: TicketEvidenceType;

  @ApiProperty({ example: 'inspection-photo.jpg' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(255)
  mimeType!: string;
}
