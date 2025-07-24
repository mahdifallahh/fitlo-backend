import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateStudentDto {
  @ApiProperty({
    description: 'New name for the student',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'New password for the student account',
    example: 'newpassword123',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Whether to share coach exercises with this student',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  sharedExercises?: boolean;
}