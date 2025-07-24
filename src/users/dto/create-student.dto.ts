import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsOptional, Matches } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({
    description: 'Phone number of the student',
    example: '09123456789',
  })
  @Matches(/^(?:\+98|0)?9\d{9}$/, { message: 'شماره موبایل معتبر نیست' })
  phone: string;


  @ApiProperty({
    description: 'Full name of the student',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The coach Ids that the student is shared with',
    example: ['5f375b9f0c3b5b4290a4e1a1'],
    required: false,
    isArray: true,
  })
  @IsString({ each: true })
  @IsOptional()
  coachesIdsThatSharedExercises?: string[];

  @ApiProperty({
    description: 'Whether to share coach exercises with this student',
    example: true,
    required: false,
  })
  @IsOptional()
  sharedExercises?: boolean;
}
