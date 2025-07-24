import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ExerciseResponseDto {
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

class DayResponseDto {
  @IsString()
  day: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseResponseDto)
  exercises: ExerciseResponseDto[];
}

export class ProgramResponseDto {
  @IsString()
  _id: string;

  @IsString()
  studentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayResponseDto)
  days: DayResponseDto[];
} 