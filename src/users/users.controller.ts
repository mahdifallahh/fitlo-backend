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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: RequestWithUser) {
    const userId = (req.user as any).userId;
    return this.usersService.findById(userId);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMyProfile(@Req() req: RequestWithUser, @Body() body: any) {
    const userId = (req.user as any).userId;
    return this.usersService.updateProfile(userId, body);
  }

  @ApiOperation({ summary: 'Upload profile image' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile image uploaded successfully' })
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

  @ApiOperation({ summary: 'Get public profile by phone number' })
  @ApiResponse({ status: 200, description: 'Returns the public profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get('public/:phone')
  async getPublicProfile(@Param('phone') phone: string) {
    const exists = await this.usersService.existsByPhone(phone);
    if (!exists) {
      throw new Error('User with this phone number does not exist');
    }
    return this.usersService.findPublicProfile(phone);
  }

  @ApiOperation({ summary: 'Create a new student' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseGuards(JwtAuthGuard)
  @Post('students')
  async createStudent(
    @Req() req: RequestWithUser,
    @Body() createStudentDto: CreateStudentDto,
  ) {
    const existingRole = await this.usersService.getRoleByPhone(createStudentDto.phone);

    if (existingRole) {
      throw new BadRequestException(
        `این شماره قبلاً به عنوان "${existingRole}" ثبت شده است.`,
      );
    }

    const hashedPassword = await bcrypt.hash(createStudentDto.password, 10);
    return this.usersService.create({
      phone: createStudentDto.phone,
      password: hashedPassword,
      role: UserRole.STUDENT,
      verified: false,
      coachId: req.user.userId,
      name: createStudentDto.name,
    });
  }

  @ApiOperation({ summary: 'Get all students of current coach' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns list of students' })
  @UseGuards(JwtAuthGuard)
  @Get('students')
  async getMyStudents(@Req() req: RequestWithUser, @Query() listQuery: ListQuery) {
    return this.usersService.findStudentsByCoach(req.user.userId, listQuery);
  }

  @ApiOperation({ summary: 'Update a student' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @UseGuards(JwtAuthGuard)
  @Put('students/:id')
  async updateStudent(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.usersService.updateStudent(id, req.user.userId, updateStudentDto);
  }

  @ApiOperation({ summary: 'Delete a student' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @UseGuards(JwtAuthGuard)
  @Delete('students/:id')
  async deleteStudent(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.usersService.deleteStudent(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Request premium status' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Premium request submitted successfully' })
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
