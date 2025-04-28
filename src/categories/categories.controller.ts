import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ListQuery } from 'src/common/dto/list-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: any) {
    return this.categoriesService.create({
      ...body,
      coachId: req.user.userId,
    });
  }

  @Get()
  async findAll(@Req() req: RequestWithUser,   @Query() ListQuery: ListQuery, @Query('type') type?: string,) {
    if (type) {
      ListQuery.filters = { ...(ListQuery.filters || {}), type };
    }
    return this.categoriesService.findAllByCoach(req.user.userId, ListQuery);
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.categoriesService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async delete(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.categoriesService.delete(id, req.user.userId);
  }
}
