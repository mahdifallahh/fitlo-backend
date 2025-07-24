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
  NotFoundException,
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
import { Multer } from 'multer';
import { join } from 'path';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { ValidateSharePasswordDto } from '../exercises/dto/share-exercises.dto';
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
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: RequestWithUser) {
    const userId = (req.user as any)._id;
    return this.usersService.findById(userId);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMyProfile(@GetUser() user: any, @Body() body: any) {
    const userId = user._id;
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
  async uploadProfileImage(@UploadedFile() file: any, @GetUser() user: any) {
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

    const signedUrl = await generateSignedUrl(key);
    const updatedUser = await this.usersService.updateProfile(user._id, {
      minioKeyUrl: key,
      signedProfilePictureUrl: signedUrl,
    });
    return updatedUser;
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
    @Body() createStudentDto: CreateStudentDto,
    @GetUser() user?: any,
  ) {
    return this.usersService.addCoachToStudent(createStudentDto, user._id);
  }

  @ApiOperation({ summary: 'Get all students of current coach' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns list of students' })
  @UseGuards(JwtAuthGuard)
  @Get('students')
  async getMyStudents(@Query() listQuery: ListQuery, @GetUser() user?: any) {
    return this.usersService.findStudentsByCoach(user._id, listQuery);
  }

  @ApiOperation({ summary: 'Update a student' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @UseGuards(JwtAuthGuard)
  @Put('students/:id')
  async updateStudent(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @GetUser() user?: any,
  ) {
    return this.usersService.updateStudent(id, user._id, updateStudentDto);
  }

  @ApiOperation({ summary: 'Delete a student' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @UseGuards(JwtAuthGuard)
  @Delete('students/:id')
  async deleteStudent(@Param('id') id: string,@GetUser() user?: any) {
    return this.usersService.deleteStudent(id, user._id);
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
    @UploadedFile() file: any,
    @Body() body: any,
    @GetUser() user: any,
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

    const userData = await this.usersService.findById(user._id);
    if (userData?.premiumStatus === PremiumStatusEnum.ACCEPTED) {
      throw new BadRequestException('شما قبلاً کاربر پرمیوم هستید');
    }

    return this.usersService.updateForReceipt(user._id, {
      receiptUrl: url,
      premiumStatus: PremiumStatusEnum.PENDING,
      subscriptionType: body.subscriptionType,
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

  @UseGuards(JwtAuthGuard)
  @Get('students/:studentId/exercises')
  async getStudentExercises(@Param('studentId') studentId: string) {
    // Fetch the student by ID
    const student = await this.usersService.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Ensure coachesIdsThatSharedExercises is an array
    const coachesIdsThatSharedExercises =
      student.coachesIdsThatSharedExercises || [];

    // Fetch exercises from all shared coaches
    // Removed reference to non-existent method
    // const exercises = await this.usersService.getExercisesFromSharedCoaches(
    //   coachesIdsThatSharedExercises,
    // );
    return []; // Return an empty array as the method is removed
  }
}
