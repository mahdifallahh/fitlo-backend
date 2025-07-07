import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ShareExercisesDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class ValidateSharePasswordDto {
  @IsString()
  @IsNotEmpty()
  shareId: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
