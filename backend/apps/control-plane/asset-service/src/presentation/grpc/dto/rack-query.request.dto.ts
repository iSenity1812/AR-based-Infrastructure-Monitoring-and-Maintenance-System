import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class GetRackRequestDto {
  @IsString()
  rackId!: string;
}

export class GetRackByCodeRequestDto {
  @IsString()
  rackCode!: string;
}

export class ListRacksRequestDto {}

export class BatchGetRacksRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  rackIds!: string[];
}
