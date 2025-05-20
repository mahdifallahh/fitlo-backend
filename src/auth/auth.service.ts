import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from 'src/users/schemas/user.schema';
import axios from 'axios';

@Injectable()
export class AuthService {
  // حافظه موقت برای ذخیره OTP
  private otpStore = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private generateOtp(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  // async sendOtp(phone: string): Promise<void> {
  //   const code = this.generateOtp();
  //   const expiresAt = Date.now() + 60_000; // 60 ثانیه اعتبار

  //   this.otpStore.set(phone, { code, expiresAt });

  //   // به‌جای SMS
  //   console.log(`📱 OTP برای ${phone}: ${code}`);
  // }
  async sendOtp(phone: string): Promise<void> {
    try {
      const response = await axios.post(
        'https://console.melipayamak.com/api/send/otp/03516d01c8b9472d86c9501b3398c528',

        { to: phone },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
  
      const receivedCode = response.data?.code;
      if (!receivedCode) {
        throw new Error(response.data?.status || 'ارسال پیامک ناموفق بود');
      }
  
      // ذخیره کد ملی‌پیامک در حافظه موقت
      const expiresAt = Date.now() + 60_000;
      this.otpStore.set(phone, { code: receivedCode, expiresAt });
  
    } catch (error) {
      console.error('OTP error:', {
        message: error.message,
        responseData: error.response?.data,
        status: error.response?.status,
      });      throw new InternalServerErrorException('خطا در ارسال کد تایید');
    }
  }
  
  async verifyOtpAndRegister(
    phone: string,
    code: string,
    password: string,
  ): Promise<{ token: string }> {
    const otpData = this.otpStore.get(phone);

    if (!otpData || Date.now() > otpData.expiresAt) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException('کد منقضی شده یا موجود نیست');
    }

    if (otpData.code !== code) {
      throw new UnauthorizedException('کد اشتباه است');
    }

    this.otpStore.delete(phone);

    let user = await this.usersService.findByPhone(phone);

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.usersService.create({
        phone,
        password: hashedPassword,
        verified: true,
        role: UserRole.COACH, 
      });
    } else if (!user.verified) {
      user.verified = true;
      user.password = await bcrypt.hash(password, 10);
      await this.usersService.update(user);
    }

    const token = await this.jwtService.signAsync({
      userId: user.id,
      role: user.role,
    });

    return { token };
  }

  async verifyOtp(
    phone: string,
    inputCode: string,
  ): Promise<{ token: string }> {
    const otpData = this.otpStore.get(phone);

    if (!otpData || Date.now() > otpData.expiresAt) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException('کد منقضی شده یا موجود نیست');
    }

    if (otpData.code !== inputCode) {
      throw new UnauthorizedException('کد وارد شده اشتباه است');
    }

   
    this.otpStore.delete(phone);

    let user = await this.usersService.findByPhone(phone);

    if (!user) {
      const password = await bcrypt.hash(this.generateOtp(), 10); 
      user = await this.usersService.create({
        phone,
        password,
        verified: true,
        role: UserRole.COACH,
      });
    } else if (!user.verified) {
      user.verified = true;
      await this.usersService.update(user);
    }

    const token = await this.jwtService.signAsync({
     userId: user.id,
      role: user.role,
    });
    return { token };
  }

  async validateUser(phone: string, password: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user || !user.verified) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  async login(user: any) {
    const payload = { userId: user._id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  async resetPassword(phone: string, code: string, newPassword: string): Promise<void> {
    const otpData = this.otpStore.get(phone);

    if (!otpData || Date.now() > otpData.expiresAt) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException('کد منقضی شده یا موجود نیست');
    }

    if (otpData.code !== code) {
      throw new UnauthorizedException('کد اشتباه است');
    }

    this.otpStore.delete(phone);

    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('کاربری با این شماره یافت نشد');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.usersService.update(user);
  }
}
