import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({
    description: 'Phone number of the student',
    example: '09123456789',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Password for the student account',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Full name of the student',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
} 