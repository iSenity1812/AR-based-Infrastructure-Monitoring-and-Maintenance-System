import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateArWorkOrderRequestDto {
  @IsString()
  @IsNotEmpty()
  ticketCode!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  priority!: string;

  @IsString()
  @IsOptional()
  ownerUserId?: string;

  @IsString()
  @IsOptional()
  assigneeUserId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
