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
      storage: process.env.NODE_ENV === 'production'
        ? undefined // Let the method handle MinIO upload
        : diskStorage({
            destination: './uploads/gifs',
            filename: (req, file, cb) => {
              const unique = uuid() + extname(file.originalname);
              cb(null, unique);
            },
          }),
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

    let gifUrl: string | undefined;
    if (process.env.NODE_ENV === 'production' && file) {
      const key = `gifs/${uuid()}${extname(file.originalname)}`;
      await s3.putObject({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Set public access
      });
      gifUrl = `${process.env.MINIO_PUBLIC_URL}/${key}`;
    } else if (file) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      gifUrl = `${baseUrl}/uploads/gifs/${file.filename}`;
    }

    return this.exercisesService.create({
      name: body.name,
      categoryId: body.categoryId || undefined,
      videoLink: body.videoLink || undefined,
      gifUrl,
      coachId: new ObjectId(req.user.userId),
    });
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
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
    await s3.putObject({
      Bucket: process.env.MINIO_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Set public access
    });
    const url = `${process.env.MINIO_PUBLIC_URL}/${key}`;

    return { url };
  }
}
