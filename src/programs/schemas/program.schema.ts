import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type ProgramDocument = Program & Document;

@Schema({ timestamps: true })
export class Program {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  coachId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  studentId: string;

  @Prop([
    {
      day: { type: String, required: true },
      exercises: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
          gifUrl: String,
          videoLink: String,
          categoryName: String,
          sets: Number, 
          reps: Number, 
        },
      ],
    },
  ])
  days: {
    day: string;
    exercises: {
      _id: string;
      name: string;
      gifUrl?: string;
      videoLink?: string;
      categoryName?: string;
    }[];
  }[];
}

export const ProgramSchema = SchemaFactory.createForClass(Program);
