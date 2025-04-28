import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { ListQuery } from 'src/common/dto/list-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  async createProgram(@Req() req: RequestWithUser, @Body() body: any) {
    return this.programsService.createProgram({
      coachId: req.user.userId,
      studentId: body.studentId,
      days: body.days,
    });
  }

  @Get()
  async getMyPrograms(@Req() req: RequestWithUser,@Query() ListQuery: ListQuery) {
    return this.programsService.getProgramsByCoach(req.user.userId,ListQuery);
  }

  @Get(':id')
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.programsService.getOneById(id, req.user.userId);
  }
  @Put(':id')
  async updateProgram(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.programsService.updateProgram(id, req.user.userId, body);
  }
  @Delete(':id')
  async delete(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.programsService.delete(id, req.user.userId);
  }
}
