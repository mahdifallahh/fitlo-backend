import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from 'src/users/schemas/user.schema';
import * as Kavenegar from 'kavenegar';

@Injectable()
export class AuthService {
  // حافظه موقت برای ذخیره OTP
  private otpStore = new Map<string, { code: string; expiresAt: number }>();
  private kavenegar: any;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    this.kavenegar = Kavenegar.KavenegarApi({
      apikey: '4F7942462B693877794C556A5055444A4874614C6F573648396B45624C486256393563575879774E5757593D'
    });
  }

  private generateOtp(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  async sendOtp(phone: string): Promise<void> {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
      const expiresAt = Date.now() + 120_000; // 2 minutes expiry

      // Store the code before sending
      this.otpStore.set(phone, { code, expiresAt });

      // Format phone number (remove +98 or 0 prefix if exists)
      const formattedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
    

      // Send OTP via Kavenegar
      await new Promise((resolve, reject) => {
        this.kavenegar.Send({
          message: ` کد تایید شما در فیتلو: ${code}`,
          sender: "2000660110",
          receptor: formattedPhone
        }, function(response, status) {
          
          if (status >= 200 && status < 300 && response) {
            resolve(response);
          } else {
            reject(new Error('خطا در ارسال پیامک'));
          }
        });
      });

    } catch (error) {
      console.error('OTP error:', error.message);
      throw new InternalServerErrorException('خطا در ارسال کد تایید');
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
    
    if (!password || password.trim() === '') {
      throw new UnauthorizedException('پسورد نمی‌تواند خالی باشد');
    }
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
    await user.save();
  }
}
