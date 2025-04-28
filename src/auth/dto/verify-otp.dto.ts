import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Length(10, 15)
  phone: string;

  @IsString()
  @Length(5, 5)
  code: string;
}
