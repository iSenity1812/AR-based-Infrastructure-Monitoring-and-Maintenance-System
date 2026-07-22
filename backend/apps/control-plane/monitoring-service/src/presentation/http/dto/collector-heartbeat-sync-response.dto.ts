import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class CollectorHeartbeatSyncResponseDto {
  @ApiProperty({ example: 'node-msi-5e8ff2c0' })
  nodeId!: string;

  @ApiProperty({ example: true })
  synced!: boolean;

  @ApiProperty({ example: '2026-07-21T08:15:30.000Z' })
  lastHeartbeatAt!: string;
}

export class CollectorHeartbeatSyncResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(CollectorHeartbeatSyncResponseDto) }],
  })
  data!: CollectorHeartbeatSyncResponseDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
