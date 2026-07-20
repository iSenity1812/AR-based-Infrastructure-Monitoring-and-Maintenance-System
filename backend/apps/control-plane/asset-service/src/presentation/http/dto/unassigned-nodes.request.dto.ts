import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { NodeLifecycleState } from '@domain/entities/asset-context.entities';

export class UnassignedNodesRequestDto {
  @ApiPropertyOptional({ enum: NodeLifecycleState })
  @IsOptional()
  @IsEnum(NodeLifecycleState)
  lifecycleState?: NodeLifecycleState;
}
