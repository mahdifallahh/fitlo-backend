import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UsersService } from 'src/users/users.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

const iranianPhoneRegex = /^(?:\+98|0)?9\d{9}$/;

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('send-otp')
  async sendOtp(@Body('phone') phone: string) {
    if (!iranianPhoneRegex.test(phone)) {
      throw new BadRequestException('شماره موبایل معتبر نیست');
    }
    await this.authService.sendOtp(phone);
    return { message: 'کد ارسال شد' };
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { phone: string; code: string; password: string },
  ) {
    return this.authService.verifyOtpAndRegister(
      body.phone,
      body.code,
      body.password,
    );
  }

  @Post('check-phone')
  async checkPhone(@Body('phone') phone: string) {
    if (!iranianPhoneRegex.test(phone)) {
      throw new BadRequestException('شماره موبایل معتبر نیست');
    }
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      verified: user.verified,
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { phone: string; code: string; newPassword: string },
  ) {
    if (!iranianPhoneRegex.test(body.phone)) {
      throw new BadRequestException('شماره موبایل معتبر نیست');
    }
    await this.authService.resetPassword(body.phone, body.code, body.newPassword);
    return { message: 'رمز عبور با موفقیت تغییر کرد' };
  }
}
