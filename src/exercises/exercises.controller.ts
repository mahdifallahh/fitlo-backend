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
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ShareExercisesDto, ValidateSharePasswordDto } from './dto/share-exercises.dto';

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
    
    @Query() listQuery: ListQuery,
    @Query('categoryId') categoryId?: string,
    @GetUser() user?: any,
  ) {
    if (categoryId) {
      listQuery.filters = { ...(listQuery.filters || {}), categoryId };
    }
    return this.exercisesService.findAllByCoach(user._id, listQuery);
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
    
    @UploadedFile() file: any,
    @Body() body: any,
    @GetUser() user?: any
  ) {
    const coachId = user._id;
    if (!body.name?.trim()) {
      throw new BadRequestException('نام تمرین الزامی است');
    }

    if (file) {
      const user = await this.usersService.findById(coachId);
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
        coachId,
        exerciseData,
      );
    }

    // CHANGE: Ensure create returns exercise with signedGifUrl (handled by ExercisesService)
    return this.exercisesService.create({
      ...exerciseData,
        coachId: new ObjectId(coachId),
    });
  }

  @Put(':id')
  async update(
    
    @Param('id') id: string,
    @Body() body: any,
    @GetUser() user?: any
  ) {
    // CHANGE: No change needed; update now returns signedGifUrl via ExercisesService
    return this.exercisesService.update(id, user._id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string,@GetUser() user?: any) {
    return this.exercisesService.delete(id, user._id);
  }

  @Post('upload-gif')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
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
    
    @UploadedFile() file: any,
    @GetUser() user?: any
  ) {
    const userData = await this.usersService.findById(user._id);
    if (!userData?.isPremium) {
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
