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
      storage: diskStorage({
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

    // Check if user is premium before allowing GIF upload
    if (file) {
      const user = await this.usersService.findById(req.user.userId);
      if (!user?.isPremium) {
        throw new ForbiddenException('آپلود گیف فقط برای کاربران پرمیوم در دسترس است');
      }
    }
    const baseUrl = process.env.BASE_URL;
    const gifUrl = file
      ? `${baseUrl}/uploads/gifs/${file.filename}`
      : undefined;

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
      storage: diskStorage({
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
  async uploadGif(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Check if user is premium before allowing GIF upload
    const user = await this.usersService.findById(req.user.userId);
    if (!user?.isPremium) {
      throw new ForbiddenException('آپلود گیف فقط برای کاربران پرمیوم در دسترس است');
    }
    const baseUrl = process.env.BASE_URL;
    const url = `${baseUrl}/uploads/gifs/${file.filename}`;
    return { url };
  }
}
