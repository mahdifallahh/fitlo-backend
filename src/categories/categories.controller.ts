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
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@GetUser() user: any, @Body() body: any) {
    return this.categoriesService.create({
      ...body,
      coachId: user._id,
    });
  }

  @Get()
  async findAll(   @Query() ListQuery: ListQuery, @Query('type') type?: string,@GetUser() user?: any) {
    if (type) {
      ListQuery.filters = { ...(ListQuery.filters || {}), type };
    }
    return this.categoriesService.findAllByCoach(user._id, ListQuery);
  }

  @Put(':id')
      async update(
        @GetUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.categoriesService.update(id, user._id, body);
  }

  @Delete(':id')
  async delete(@GetUser() user: any, @Param('id') id: string) {
    return this.categoriesService.delete(id, user._id);
  }
}
