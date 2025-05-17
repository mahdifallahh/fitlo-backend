

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { extname } from 'path';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { v4 as uuid } from 'uuid';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PremiumStatusEnum, UserRole } from './schemas/user.schema';
import { UsersService } from './users.service';
import { generateSignedUrl } from 'src/common/utils/minio-utils';
import { join } from 'path';
dotenv.config({ path: 'D:/myProjects/fitlo.ir/fitlo-backend/.env' });

const s3Config = {
  endpoint: process.env.MINIO_ENDPOINT,
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
};

if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
  throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be defined');
}

const s3 = new S3Client(s3Config);

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
  @ApiResponse({
    status: 200,
    description: 'Profile image uploaded successfully',
  })
  @UseGuards(JwtAuthGuard)
  @Post('upload-profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
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
 
    
    const key = `profiles/${uuid()}${extname(file.originalname)}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    const url = `${process.env.MINIO_PUBLIC_URL}/${key}`;

    const updatedUser = await this.usersService.updateProfile(req.user.userId, {
      minioKeyUrl: key,
    });

    const signedUrl = await generateSignedUrl(key);

    return {
      message: 'Profile image uploaded successfully',
      minioKeyUrl: key,
      signedProfilePictureUrl: signedUrl,
    };
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
    const existingRole = await this.usersService.getRoleByPhone(
      createStudentDto.phone,
    );

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
  async getMyStudents(
    @Req() req: RequestWithUser,
    @Query() listQuery: ListQuery,
  ) {
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
    return this.usersService.updateStudent(
      id,
      req.user.userId,
      updateStudentDto,
    );
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
  @ApiResponse({
    status: 200,
    description: 'Premium request submitted successfully',
  })
  @UseGuards(JwtAuthGuard)
  @Post('request-premium')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
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
    const key = `receipts/${uuid()}${extname(file.originalname)}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    const url = `${process.env.MINIO_PUBLIC_URL}/${key}`;

    const user = await this.usersService.findById(req.user.userId);
    if (user?.premiumStatus === PremiumStatusEnum.ACCEPTED) {
      throw new BadRequestException('شما قبلاً کاربر پرمیوم هستید');
    }

    return this.usersService.updateForReceipt(req.user.userId, {
      receiptUrl: url,
      premiumStatus: PremiumStatusEnum.PENDING,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('coaches')
  async getCoaches() {
    return this.usersService.getCoaches();
  }
  @UseGuards(JwtAuthGuard)
  @Get('coach/:id')
  async getCoachById(@Param('id') id: string) {
    return this.usersService.findCoachById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post('select-coach')
  async selectCoach(@Request() req, @Body('coachId') coachId: string) {
    return this.usersService.selectCoach(req.user._id, coachId);
  }
}
