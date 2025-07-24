import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from './user.schema';

export type SharedExercisesDocument = SharedExercises & Document;

@Schema({ timestamps: true })
export class SharedExercises {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  coachId: User;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  shareId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isShareForAll: boolean;
}

export const SharedExercisesSchema = SchemaFactory.createForClass(SharedExercises);
