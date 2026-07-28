import { IsNotEmpty, IsString } from 'class-validator';

export class ScanMarkerRequestDto {
  @IsString()
  @IsNotEmpty()
  markerCode!: string;
}
