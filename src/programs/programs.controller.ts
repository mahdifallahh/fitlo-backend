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
import { CreateProgramDto } from './dto/create-program.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { ProgramResponseDto } from './dto/program-response.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  async createProgram(@Body() body: CreateProgramDto, @GetUser() user?: any) {
    return this.programsService.createProgram({
      coachId: user._id,
      studentId: body.studentId,
      days: body.days,
    });
  }

  @Get()
  async getMyPrograms(@Query() ListQuery: ListQuery,@GetUser() user?: any) {
    return this.programsService.getProgramsByCoach(user._id,ListQuery);
  }
  @Get('student/:studentId')
  async getProgramsByStudentId(
   
    @Param('studentId') studentId: string,
    @Query() listQuery: ListQuery,
    @GetUser() user?: any
  ) {
    return this.programsService.getProgramsByStudentId(user._id, {
      ...listQuery,
      filters: { ...listQuery.filters, studentId },
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @GetUser() user?: any): Promise<ProgramResponseDto> {
    return this.programsService.getOneById(id, user._id);
  }
  @Put(':id')
  async updateProgram(
    @Param('id') id: string,
    @Body() body: UpdateProgramDto,
    @GetUser() user?: any
  ) {
    return this.programsService.updateProgram(id, user._id, body);
  }
  @Delete(':id')
  async delete(@Param('id') id: string,@GetUser() user?: any) {
    return this.programsService.delete(id, user._id);
  }
  
}
