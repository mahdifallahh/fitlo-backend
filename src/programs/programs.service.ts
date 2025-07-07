import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Program, ProgramDocument } from './schemas/program.schema';
import { Model } from 'mongoose';
import { paginateQuery } from 'src/common/utils/paginate-query';
import { ListQuery } from 'src/common/dto/list-query.dto';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,
  ) {}

  async createProgram(data: any) {
    const fullDays = await Promise.all(
      data.days.map(async (d) => {
        const exercises = d.exercises || [];

        return {
          day: d.day,
          exercises: exercises.map((ex) => ({
            _id: ex._id,
            name: ex.name,
            gifUrl: ex.gifUrl,
            videoLink: ex.videoLink,
            categoryName:
              typeof ex.categoryId === 'object' && 'name' in ex.categoryId
                ? ex.categoryId.name
                : '',
            sets: ex.sets,
            reps: ex.reps,
            description: ex.description,
          })),
        };
      }),
    );

    return this.programModel.create({
      coachId: data.coachId,
      studentId: data.studentId,
      days: fullDays,
    });
  }
  async updateProgram(id: string, coachId: string, updatedData: any) {
    const program = await this.programModel.findOne({ _id: id, coachId });
    if (!program) {
      throw new NotFoundException('برنامه پیدا نشد');
    }

    const fullDays = await Promise.all(
      updatedData.days.map(async (d) => {
        const exercises = d.exercises || [];
        return {
          day: d.day,
          exercises: exercises.map((ex) => ({
            _id: ex._id,
            name: ex.name,
            gifUrl: ex.gifUrl,
            videoLink: ex.videoLink,
            categoryName:
              typeof ex.categoryId === 'object' && 'name' in ex.categoryId
                ? ex.categoryId.name
                : ex.categoryName || '',
            sets: ex.sets,
            reps: ex.reps,
          })),
        };
      }),
    );

    program.days = fullDays;
    await program.save();
    return program;
  }
  async getProgramsByStudentId(studentId: string, listQuery: ListQuery) {
    return paginateQuery(this.programModel, listQuery, {
      studentId,
      populate: {
        path: 'coachId',
        select: 'name phone',
      },
      searchFields: ['coachId.name', 'coachId.phone'],
    });
  }

  async getProgramsByCoach(coachId: string, listQuery: ListQuery) {
    return paginateQuery(this.programModel, listQuery, {
      coachId,
      populate: {
        path: 'studentId',
        select: 'name phone',
      },
      searchFields: ['studentId.name', 'studentId.phone'],
    });
  }

  async getOneById(id: string, coachId: string) {
    const program = await this.programModel.findOne({ _id: id, coachId });
    if (!program) {
      throw new NotFoundException('برنامه پیدا نشد');
    }
    return program;
  }

  async delete(id: string, coachId: string) {
    return this.programModel.findOneAndDelete({ _id: id, coachId });
  }
}
