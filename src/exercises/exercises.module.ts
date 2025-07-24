import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { SharedExercises, SharedExercisesSchema } from '../users/schemas/shared-exercises.schema';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exercise.name, schema: ExerciseSchema },
      { name: SharedExercises.name, schema: SharedExercisesSchema }
    ]),
    UsersModule,
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService]
})
export class ExercisesModule {}
