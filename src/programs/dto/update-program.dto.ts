import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateExerciseDto {
  @IsString()
  _id: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  gifUrl?: string;

  @IsString()
  @IsOptional()
  videoLink?: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsOptional()
  categoryId?: string | { name: string };

  @IsString()
  @IsOptional()
  sets?: string;

  @IsString()
  @IsOptional()
  reps?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class UpdateDayDto {
  @IsString()
  day: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateExerciseDto)
  exercises: UpdateExerciseDto[];
}

export class UpdateProgramDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDayDto)
  days: UpdateDayDto[];
} 