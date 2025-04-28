import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Model } from 'mongoose';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { paginateQuery } from 'src/common/utils/paginate-query';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(data: Partial<Category>) {
    return this.categoryModel.create(data);
  }

  async findAllByCoach(coachId: string, listQuery:ListQuery) {
    return paginateQuery(this.categoryModel, listQuery, {
      coachId,
      searchFields: ['name'],
    });
  }

  async update(id: string, coachId: string, data: Partial<Category>) {
    return this.categoryModel.findOneAndUpdate({ _id: id, coachId }, data, {
      new: true,
    });
  }

  async delete(id: string, coachId: string) {
    return this.categoryModel.findOneAndDelete({ _id: id, coachId });
  }
}
