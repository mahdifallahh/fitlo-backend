import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Model } from 'mongoose';
import { ListQuery } from 'src/common/dto/list-query.dto';
import { paginateQuery } from 'src/common/utils/paginate-query';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findByPhone(phone: string) {
    return this.userModel.findOne({ phone }).exec();
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ phone }).exec();
    return count > 0;
  }
  async getRoleByPhone(phone: string): Promise<UserRole | null> {
    const user = await this.userModel.findOne({ phone });
    return user ? user.role : null;
  }
  async create(userData: Partial<User>) {
    if (!userData.phone) {
      throw new Error('وارد کردن شماره تلفن اجباری است.');
    }
    const exists = await this.existsByPhone(userData.phone);
    if (exists) {
      throw new Error('این کاربر قبلا وجود داره');
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
    return this.userModel.findById(userId).select('-password'); // رمز عبور مخفی
  }

  async updateProfile(userId: string, profileData: Partial<User>) {
    return this.userModel
      .findByIdAndUpdate(userId, profileData, { new: true })
      .select('-password');
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
  async findStudentsByCoach(coachId: string,listQuery:ListQuery) {
    return paginateQuery(this.userModel, listQuery, {
      coachId,
      role: 'student',
      searchFields: ['name', 'phone'],
    });
  
  }

  async updateStudent(id: string, coachId: string, updateData: any) {
    return this.userModel
      .findOneAndUpdate({ _id: id, coachId }, updateData, { new: true })
      .select('-password');
  }

  async deleteStudent(id: string, coachId: string) {
    return this.userModel.findOneAndDelete({ _id: id, coachId });
  }

  async getCoaches() {
    return this.userModel.find({ role: UserRole.COACH }).exec();
  }
  async findCoachById(id: string) {
    const coach = await this.userModel.findOne({
      _id: id,
      role: UserRole.COACH,
    }).select('name phone');

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
      { new: true }
    );

    if (!student) {
      throw new BadRequestException('کاربر یافت نشد');
    }

    return student;
  }
}
