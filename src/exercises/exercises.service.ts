import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { HydratedDocument, Model } from 'mongoose';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { paginateQuery } from 'src/common/utils/paginate-query';
import { generateSignedUrl } from '../common/utils/minio-utils';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from 'src/common/utils/s3-client';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';
import { SharedExercises } from '../users/schemas/shared-exercises.schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectModel(Exercise.name) private exerciseModel: Model<ExerciseDocument>,
    @InjectModel(SharedExercises.name) private readonly sharedExercisesModel: Model<SharedExercises>,
  ) {}

  private async addSignedUrlToExercise(exercise: ExerciseDocument | null) {
    if (exercise?.gifUrl) {
      exercise.signedGifUrl = await generateSignedUrl(exercise.gifUrl);
    }
    return exercise;
  }

  private async addSignedUrlsToExercises(exercises: ExerciseDocument[]) {
    return Promise.all(
      exercises.map(async (exercise) => {
        if (exercise.gifUrl) {
          exercise.signedGifUrl = await generateSignedUrl(exercise.gifUrl);
        }
        return exercise;
      }),
    );
  }

  async create(data: Partial<Exercise>) {
    const exercise = await this.exerciseModel.create(data);
    return this.addSignedUrlToExercise(exercise);
  }

  async findAllByCoach(coachId: string, listQuery: ListQuery) {
    const filters = {
      coachId,
      ...(listQuery.filters || {}),
    };
    const result = await paginateQuery(this.exerciseModel, listQuery, {
      filters,
      searchFields: ['name'],
      populate: 'categoryId',
    });
    result.items = await this.addSignedUrlsToExercises(result.items) as (HydratedDocument<ExerciseDocument> & Exercise & Required<{ _id: unknown; }> & { __v: number; })[];
    return result;
  }

  async update(id: string, coachId: string, data: Partial<Exercise>) {
    const exercise = await this.exerciseModel.findOneAndUpdate(
      { _id: id, coachId },
      data,
      { new: true },
    );
    return this.addSignedUrlToExercise(exercise);
  }

  async delete(id: string, coachId: string) {
    return this.exerciseModel.findOneAndDelete({ _id: id, coachId });
  }

  async findById(id: string, coachId: string) {
    const exercise = await this.exerciseModel.findOne({ _id: id, coachId });
    return this.addSignedUrlToExercise(exercise);
  }

  async uploadExerciseGif(
    file: any,
    coachId: string,
    exerciseData: any,
  ) {
    const key = `gifs/${uuid()}${extname(file.originalname)}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const signedUrl = await generateSignedUrl(key);

    const exercise = await this.create({
      ...exerciseData,
      gifUrl: `${process.env.MINIO_PUBLIC_URL}/${key}`,
      signedGifUrl: signedUrl,
      coachId,
    });

    return this.addSignedUrlToExercise(exercise);
  }

 

  async validateSharePassword(shareId: string, password: string) {
    const sharedExercises = await this.sharedExercisesModel.findOne({
      shareId,
      isActive: true
    });

    if (!sharedExercises) {
      throw new NotFoundException('لینک اشتراک‌گذاری یافت نشد یا منقضی شده است');
    }

    const isPasswordValid = await bcrypt.compare(password, sharedExercises.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('رمز عبور نادرست است');
    }

    return true;
  }

  async getSharedExercises(shareId: string, search?: string) {
    const sharedExercises = await this.sharedExercisesModel.findOne({
      shareId,
      isActive: true
    });

    if (!sharedExercises) {
      throw new NotFoundException('لینک اشتراک‌گذاری یافت نشد یا منقضی شده است');
    }

    return this.exerciseModel.find({
      coachId: sharedExercises.coachId,
      isPublic: true
    }).exec();
  }

  async deactivateShareLink(coachId: string, shareId: string) {
    return this.sharedExercisesModel.findOneAndUpdate(
      { shareId, coachId },
      { isActive: false },
      { new: true }
    );
  }

  async toggleShareForAll(coachId: string, isShareForAll: boolean) {
    const sharedExercise = await this.sharedExercisesModel.findOne({ coachId });
    if (!sharedExercise) {
      throw new Error('Shared exercise not found');
    }
    sharedExercise.isShareForAll = isShareForAll;
    await sharedExercise.save();
    return sharedExercise;
  }
}
