import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UsersService } from 'src/users/users.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('send-otp')
  async sendOtp(@Body('phone') phone: string) {
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
    // user از گارد گرفته می‌شه
    return this.authService.login(req.user);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { phone: string; code: string; newPassword: string },
  ) {
    await this.authService.resetPassword(
      body.phone,
      body.code,
      body.newPassword,
    );
    return { message: 'رمز عبور با موفقیت تغییر کرد' };
  }
}
