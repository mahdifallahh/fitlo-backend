import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SharedExercises, SharedExercisesSchema } from './schemas/shared-exercises.schema';
import { Exercise, ExerciseSchema } from '../exercises/schemas/exercise.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SharedExercises.name, schema: SharedExercisesSchema },
      { name: Exercise.name, schema: ExerciseSchema },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
