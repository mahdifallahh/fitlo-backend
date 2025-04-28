import { Injectable, NotFoundException } from '@nestjs/common';
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
}
