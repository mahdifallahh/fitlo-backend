import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { Category } from 'src/categories/schemas/category.schema';
import { User } from 'src/users/schemas/user.schema';

@Schema({ timestamps: true })
export class Exercise {
  @Prop({ required: true })
  name: string;

  @Prop()
  gifUrl?: string;
  @Prop()
  signedGifUrl?: string;

  @Prop()
  videoLink?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId | Category;
  

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  coachId: Types.ObjectId | User;
}

export type ExerciseDocument = Exercise & Document;
export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
