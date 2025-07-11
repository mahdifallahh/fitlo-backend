import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['exercise', 'food'] })
  type: string;

  @Prop({ required: true })
  coachId: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
