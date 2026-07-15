import { ApiProperty } from '@nestjs/swagger';

export class ExternalAlertSyncResponseDto {
  @ApiProperty({ example: 3 })
  totalReceived!: number;

  @ApiProperty({ example: 2 })
  synced!: number;

  @ApiProperty({ example: 1 })
  invalid!: number;

  @ApiProperty({ example: 0 })
  skipped!: number;
}

export class ExternalAlertSyncResponseEnvelopeDto {
  @ApiProperty({
    type: ExternalAlertSyncResponseDto,
  })
  data!: ExternalAlertSyncResponseDto;
}
