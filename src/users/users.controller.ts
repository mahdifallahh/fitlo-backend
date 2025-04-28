import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Param,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import * as bcrypt from 'bcrypt';
import { PremiumStatusEnum, UserRole } from './schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ListQuery } from 'src/common/dto/list-query.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // 🔐 اطلاعات خود مربی
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: RequestWithUser) {
    const userId = (req.user as any).userId;
    console.log("userId",req.user);
    
    return this.usersService.findById(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMyProfile(@Req() req: RequestWithUser, @Body() body: any) {
    const userId = (req.user as any).userId;
    return this.usersService.updateProfile(userId, body);
  }

  // 📸 آپلود عکس پروفایل
  @UseGuards(JwtAuthGuard)
  @Put('upload-profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('فقط تصویر JPG یا PNG مجاز است'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    const url = `http://localhost:3000/uploads/profiles/${file.filename}`;
    return this.usersService.updateProfile(req.user.userId, {
      profileImage: url,
    });
  }

  // 📣 صفحه عمومی مربی
  @Get('public/:phone')
  async getPublicProfile(@Param('phone') phone: string) {
    const exists = await this.usersService.existsByPhone(phone);
    if (!exists) {
      throw new Error('User with this phone number does not exist');
    }
    return this.usersService.findPublicProfile(phone);
  }

  // 👨‍🎓 شاگردها
  @UseGuards(JwtAuthGuard)
  @Post('students')
  async createStudent(
    @Req() req: RequestWithUser,
    @Body() body: { phone: string; password: string; name: string },
  ) {
    const existingRole = await this.usersService.getRoleByPhone(body.phone);

    if (existingRole) {
      throw new BadRequestException(
        `این شماره قبلاً به عنوان "${existingRole}" ثبت شده است.`,
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    return this.usersService.create({
      phone: body.phone,
      password: hashedPassword,
      role: UserRole.STUDENT,
      verified: false,
      coachId: req.user.userId,
      name: body.name,
    });
  }
  @UseGuards(JwtAuthGuard)
  @Get('students')
  async getMyStudents(@Req() req: RequestWithUser,@Query() listQuery: ListQuery) {
    return this.usersService.findStudentsByCoach(req.user.userId,listQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Put('students/:id')
  async updateStudent(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.usersService.updateStudent(id, req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('students/:id')
  async deleteStudent(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.usersService.deleteStudent(id, req.user.userId);
  }

  // 💎 درخواست ارتقا به نسخه پرمیوم
  @UseGuards(JwtAuthGuard)
  @Post('request-premium')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/receipts',
        filename: (req, file, cb) => {
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('فقط تصویر یا PDF مجاز است'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPremiumReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    const url = `http://localhost:3000/uploads/receipts/${file.filename}`;
    return this.usersService.updateForReceipt(req.user.userId, {
      receiptUrl: url,
      premiumStatus: PremiumStatusEnum.PENDING,
    });
  }
}
