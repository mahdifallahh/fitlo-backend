import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Program, ProgramDocument } from './schemas/program.schema';
import { Model } from 'mongoose';
import { paginateQuery } from 'src/common/utils/paginate-query';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { ProgramResponseDto } from './dto/program-response.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

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
  async updateProgram(id: string, coachId: string, updatedData: UpdateProgramDto) {
    const program = (await this.programModel.findOne({
      _id: id,
      coachId,
    })) as ProgramDocument;
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
            description: ex.description,
          })),
        };
      }),
    );

    program.days = fullDays;
    await program.save();
    return program;
  }
  async getProgramsByStudentId(studentId: string, listQuery: ListQuery) {
    const programs = await paginateQuery(this.programModel, listQuery, {
      studentId,
      populate: {
        path: 'studentId',
        select: 'phone name',
      },
      searchFields: ['studentId.name', 'studentId.phone'],
    });

    console.log('Programs:', programs); 

    return programs.items.map(program => {
      const student = typeof program.studentId === 'object' ? program.studentId : { _id: program.studentId, name: '', phone: '' };
      return {
        _id: String(program._id),
        studentId: student._id,
        studentName: student.name, 
        studentPhone: student.phone,
        days: program.days.map(day => ({
          day: day.day,
          exercises: day.exercises.map(ex => ({
            _id: ex._id.toString(),
            name: ex.name,
            gifUrl: ex.gifUrl,
            videoLink: ex.videoLink,
            categoryName: ex.categoryName,
            sets: ex.sets,
            reps: ex.reps,
            description: ex.description,
          })),
        })),
      };
    });
  }

  async getProgramsByCoach(coachId: string, listQuery: ListQuery) {
    const programs = await paginateQuery(this.programModel, listQuery, {
      coachId,
      populate: {
        path: 'studentId',
        select: 'phone name',
      },
      searchFields: ['studentId.name', 'studentId.phone'],
    });

    return programs.items.map((program) => {
      const student =
        typeof program.studentId === 'object'
          ? program.studentId
          : { _id: program.studentId, name: '', phone: '' };
      return {
        _id: String(program._id),
        studentId: student._id, 
        studentName: student.name, 
        studentPhone: student.phone,
        days: program.days.map((day) => ({
          day: day.day,
          exercises: day.exercises.map((ex) => ({
            _id: ex._id.toString(),
            name: ex.name,
            gifUrl: ex.gifUrl,
            videoLink: ex.videoLink,
            categoryName: ex.categoryName,
            sets: ex.sets,
            reps: ex.reps,
            description: ex.description,
          })),
        })),
      };
    });
  }

  async getOneById(id: string, coachId: string): Promise<ProgramResponseDto> {
    const program = (await this.programModel.findOne({
      _id: id,
      coachId,
    })) as ProgramDocument;
    if (!program) {
      throw new NotFoundException('برنامه پیدا نشد');
    }
    return {
      _id: String(program._id),
      studentId: String(program.studentId),
      days: program.days.map((day) => ({
        day: day.day,
        exercises: day.exercises.map((ex) => ({
          _id: ex._id.toString(),
          name: ex.name,
          gifUrl: ex.gifUrl,
          videoLink: ex.videoLink,
          categoryName: ex.categoryName,
          sets: ex.sets,
          reps: ex.reps,
          description: ex.description,
        })),
      })),
    };
  }

  async delete(id: string, coachId: string) {
    return this.programModel.findOneAndDelete({ _id: id, coachId });
  }
}
