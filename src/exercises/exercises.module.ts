import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exercise.name, schema: ExerciseSchema },
    ]),
    UsersModule,
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
