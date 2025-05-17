import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ObjectId } from 'mongodb';
import { v4 as uuid } from 'uuid';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { UsersService } from '../users/users.service';
import * as AWS from '@aws-sdk/client-s3';
import { generateSignedUrl } from 'src/common/utils/minio-utils';

const s3 = new AWS.S3({
  endpoint: process.env.MINIO_ENDPOINT || '',
  region: process.env.MINIO_REGION || '',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.MINIO_SECRET_KEY || '',
  },
  forcePathStyle: true, // Required for MinIO
});

@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getAll(
    @Req() req: RequestWithUser,
    @Query() listQuery: ListQuery,
    @Query('categoryId') categoryId?: string,
  ) {
    if (categoryId) {
      listQuery.filters = { ...(listQuery.filters || {}), categoryId };
    }
    return this.exercisesService.findAllByCoach(req.user.userId, listQuery);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('gif', {
      storage: undefined, // Always use MinIO
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'image/gif') {
          return cb(new BadRequestException('فقط فایل .gif مجاز است'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!body.name?.trim()) {
      throw new BadRequestException('نام تمرین الزامی است');
    }

    if (file) {
      const user = await this.usersService.findById(req.user.userId);
      if (!user?.isPremium) {
        throw new ForbiddenException(
          'آپلود گیف فقط برای کاربران پرمیوم در دسترس است',
        );
      }
    }

    const exerciseData = {
      name: body.name,
      categoryId: body.categoryId || undefined,
      videoLink: body.videoLink || undefined,
    };

    // CHANGE: Use uploadExerciseGif for GIF uploads to ensure signed URL is generated consistently
    if (file) {
      return this.exercisesService.uploadExerciseGif(
        file,
        req.user.userId,
        exerciseData,
      );
    }

    // CHANGE: Ensure create returns exercise with signedGifUrl (handled by ExercisesService)
    return this.exercisesService.create({
      ...exerciseData,
      coachId: new ObjectId(req.user.userId),
    });
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // CHANGE: No change needed; update now returns signedGifUrl via ExercisesService
    return this.exercisesService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async delete(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.exercisesService.delete(id, req.user.userId);
  }

  @Post('upload-gif')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // Always use MinIO
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'image/gif') {
          return cb(new BadRequestException('فقط فایل .gif مجاز است'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadGif(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user?.isPremium) {
      throw new ForbiddenException(
        'آپلود گیف فقط برای کاربران پرمیوم در دسترس است',
      );
    }

    const key = `gifs/${uuid()}${extname(file.originalname)}`;
    await s3.send(
      new AWS.PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    // CHANGE: Return signed URL instead of public URL for secure access
    const signedUrl = await generateSignedUrl(key);
    return { url: signedUrl };
  }
}
