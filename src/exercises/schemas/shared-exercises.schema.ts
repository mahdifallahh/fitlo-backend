import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SharedExercises extends Document {
  @Prop({ required: true })
  coachId: string;

  @Prop({ required: true, unique: true })
  shareId: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isShareForAll: boolean;
}

export const SharedExercisesSchema = SchemaFactory.createForClass(SharedExercises);
SharedExercisesSchema.add({ isShareForAll: { type: Boolean, default: false } });