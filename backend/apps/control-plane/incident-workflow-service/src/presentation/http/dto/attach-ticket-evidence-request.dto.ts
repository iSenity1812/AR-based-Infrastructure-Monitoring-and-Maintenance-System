import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

import { TicketEvidenceType } from '@domain/constants/ticket-evidence-type.enum';

export class AttachTicketEvidenceRequestDto {
  @ApiProperty({ enum: TicketEvidenceType })
  @IsEnum(TicketEvidenceType)
  type!: TicketEvidenceType;

  @ApiPropertyOptional({
    description: 'Object-storage key; binary data is not accepted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  storageKey?: string;

  @ApiPropertyOptional({ description: 'External or object-storage URL.' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
