import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Model } from 'mongoose';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { paginateQuery } from 'src/common/utils/paginate-query';
import { generateSignedUrl } from '../common/utils/minio-utils';
import * as bcrypt from 'bcrypt';
import { CreateStudentDto } from './dto/create-student.dto';
import {
  Exercise,
  ExerciseDocument,
} from '../exercises/schemas/exercise.schema';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
  ) {}

  findByPhone(phone: string) {
    return this.userModel.findOne({ phone, isDeleted: false }).exec();
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.userModel
      .countDocuments({ phone, isDeleted: false })
      .exec();
    return count > 0;
  }
  async getRoleByPhone(phone: string): Promise<UserRole | null> {
    const user = await this.userModel.findOne({ phone, isDeleted: false });
    return user ? user.role : null;
  }
  async create(
    userData: Partial<User> & { shareExercises?: boolean },
    userId?: string,
  ) {
    if (!userData.phone) {
      throw new Error('Phone number is required.');
    }

    let student = await this.userModel.findOne({
      phone: userData.phone,
      role: UserRole.STUDENT,
      isDeleted: false,
    });

    if (student) {
      // If the coach is already associated with the student, throw an error
      if (student.coachIds?.includes(userId!)) {
        throw new BadRequestException(
          'This student is already added by this coach.',
        );
      }
      student.isDeleted = false;
      await student.save();
      return student;
    }

    // If the student does not exist, create a new record
    if (userData.shareExercises && userId) {
      userData.coachesIdsThatSharedExercises = [userId];
    }
    const user = new this.userModel(userData);
    return user.save();
  }

  update(user: UserDocument) {
    return user.save();
  }

  async updateForReceipt(userId: string, data: Partial<User>) {
    return this.userModel.findByIdAndUpdate(userId, data, { new: true });
  }
  async findById(userId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (user?.minioKeyUrl) {
      user.signedProfilePictureUrl = await generateSignedUrl(user.minioKeyUrl);
    }

    return user;
  }

  async updateProfile(userId: string, profileData: Partial<User>) {
    console.log('Updating profile for userId:', userId);
    console.log('Profile data:', profileData);
    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(userId, profileData, { new: true, isDeleted: false })
        .select('-password');
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  }
  async findPublicProfile(phone: string) {
    const user = await this.userModel
      .findOne({ phone, verified: true })
      .select('name bio whatsapp instagram telegram youtube email isPremium');

    if (!user?.isPremium) {
      throw new NotFoundException('این صفحه در دسترس نیست');
    }

    return user;
  }
  async findStudentsByCoach(coachId: string, listQuery: ListQuery) {
    return paginateQuery(this.userModel, listQuery, {
      role: UserRole.STUDENT,
      filters: { isDeleted: false, coachIds: coachId },
      searchFields: ['name', 'phone'],
    });
  }

  async updateStudent(id: string, coachId: string, updateData: any) {
    const student = await this.userModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!student) {
      throw new NotFoundException('شاگرد مورد نظر یافت نشد');
    }

    // Update other fields
    Object.assign(student, updateData);

    // Manage coachesIdsThatSharedExercises based on sharedExercises
    if (updateData.sharedExercises) {
      student.coachesIdsThatSharedExercises =
        student.coachesIdsThatSharedExercises || [];
      if (!student.coachesIdsThatSharedExercises.includes(coachId)) {
        student.coachesIdsThatSharedExercises.push(coachId);
      }
    } else {
      student.coachesIdsThatSharedExercises = (
        student.coachesIdsThatSharedExercises || []
      ).filter((cid) => cid !== coachId);
    }

    await student.save();

    return student.toObject({
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    });
  }

  async deleteStudent(id: string, coachId: string) {
    const student = await this.userModel.findOne({
      _id: id,
      isDeleted: false,
      coachIds: coachId,
    });
    if (!student) {
      throw new NotFoundException('شاگرد مورد نظر یافت نشد');
    }
    student.isDeleted = true;
    if (student.coachesIdsThatSharedExercises) {
      student.coachesIdsThatSharedExercises = (
        student.coachesIdsThatSharedExercises || []
      ).filter((cid) => cid != coachId);

      
    }
    await student.save();
    return student;
  }

  async getCoaches() {
    return this.userModel
      .find({ role: UserRole.COACH, isDeleted: false })
      .exec();
  }
  async findCoachById(id: string) {
    const coach = await this.userModel
      .findOne({
        _id: id,
        role: UserRole.COACH,
        isDeleted: false,
      })
      .select('name phone');

    if (!coach) {
      throw new NotFoundException('مربی مورد نظر یافت نشد');
    }

    return coach;
  }

  async selectCoach(studentId: string, coachId: string) {
    // Check if coach exists
    const coach = await this.userModel.findOne({
      _id: coachId,
      role: UserRole.COACH,
    });

    if (!coach) {
      throw new BadRequestException('مربی مورد نظر یافت نشد');
    }

    // Update student's coach
    const student = await this.userModel.findByIdAndUpdate(
      studentId,
      { coachId },
      { new: true },
    );

    if (!student) {
      throw new BadRequestException('کاربر یافت نشد');
    }

    return student;
  }

  async setStudentPassword(phone: string, password: string) {
    const user = await this.userModel.findOne({
      phone,
      role: UserRole.STUDENT,
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.verified)
      throw new BadRequestException('این کاربر قبلاً وریفای شده است');
    user.password = await bcrypt.hash(password, 10);
    user.verified = true;
    await user.save();
    return { message: 'رمز عبور با موفقیت ثبت شد' };
  }

  async addCoachToStudent(createStudentDto: CreateStudentDto, coachId: string) {
    let student = await this.userModel.findOne({
      phone: createStudentDto.phone,
      isDeleted: false,
    });

    if (student) {
      if (student.role !== UserRole.STUDENT) {
        throw new BadRequestException(
          'این کاربر قبلاً به عنوان ' + student.role + ' ثبت‌نام کرده است.',
        );
      }
      if (student.coachIds?.includes(coachId)) {
        throw new BadRequestException('این شاگرد قبلا توسط شما اضافه شده است.');
      }
      student.coachIds = student.coachIds || [];
      student.coachIds.push(coachId);

      // Add coachId to coachesIdsThatSharedExercises if sharedExercises is true
      if (createStudentDto.sharedExercises) {
        student.coachesIdsThatSharedExercises =
          student.coachesIdsThatSharedExercises || [];
        if (!student.coachesIdsThatSharedExercises.includes(coachId)) {
          student.coachesIdsThatSharedExercises.push(coachId);
        }
      }

      await student.save();
      return student;
    }

    const newStudent = new this.userModel({
      phone: createStudentDto.phone,
      name: createStudentDto.name,
      role: UserRole.STUDENT,
      verified: false,
      coachIds: [coachId],
      coachesIdsThatSharedExercises: createStudentDto.sharedExercises
        ? [coachId]
        : [],
    });
    return newStudent.save();
  }
}
