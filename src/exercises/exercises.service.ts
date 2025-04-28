import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { Model } from 'mongoose';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { paginateQuery } from 'src/common/utils/paginate-query';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectModel(Exercise.name) private exerciseModel: Model<ExerciseDocument>,
  ) {}

  async create(data: Partial<Exercise>) {
    return this.exerciseModel.create(data);
  }

  async findAllByCoach(coachId: string, listQuery: ListQuery) {
    const filters = {
      coachId,
      ...(listQuery.filters || {}), // Include categoryId from filters
    };
    return paginateQuery(this.exerciseModel, listQuery, {
      filters,
      searchFields: ['name'],
      populate: 'categoryId', // Populate categoryId to get category details
    });
  }

  async update(id: string, coachId: string, data: Partial<Exercise>) {
    return this.exerciseModel.findOneAndUpdate({ _id: id, coachId }, data, {
      new: true,
    });
  }

  async delete(id: string, coachId: string) {
    return this.exerciseModel.findOneAndDelete({ _id: id, coachId });
  }

  async findById(id: string, coachId: string) {
    return this.exerciseModel.findOne({ _id: id, coachId });
  }
}
