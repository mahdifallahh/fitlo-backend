import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Phone number of the user',
    example: '09123456789',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Role of the user',
    example: 'student',
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({
    description: 'Whether the user is verified',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @ApiProperty({
    description: 'List of coach IDs that shared exercises with the user',
    example: ['5f375b9f0c3b5b4290a4e1a1'],
    required: false,
    isArray: true,
  })
  @IsString({ each: true })
  @IsOptional()
  coachesIdsThatSharedExercises?: string[];
} 