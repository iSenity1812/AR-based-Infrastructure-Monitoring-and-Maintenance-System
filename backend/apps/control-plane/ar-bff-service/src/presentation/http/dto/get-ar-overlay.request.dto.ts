import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ArOverlayAssetRequestDto {
  @IsIn(['rack', 'node'])
  assetType!: 'rack' | 'node';

  @IsString()
  @IsNotEmpty()
  assetCode!: string;
}

export class GetArOverlayRequestDto {
  @IsString()
  @IsOptional()
  markerCode?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ArOverlayAssetRequestDto)
  asset?: ArOverlayAssetRequestDto;
}
