import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExercisesModule } from './exercises/exercises.module';
import { CategoriesModule } from './categories/categories.module';
import { ProgramsModule } from './programs/programs.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/fitlo'),
    AuthModule,
    UsersModule,
    ExercisesModule,
    CategoriesModule,
    ProgramsModule,
    AdminModule,
  ],
})
export class AppModule {}
