import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ExerciseDto {
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

class DayDto {
  @IsString()
  day: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseDto)
  exercises: ExerciseDto[];
}

export class CreateProgramDto {
  @IsString()
  studentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayDto)
  days: DayDto[];
}
