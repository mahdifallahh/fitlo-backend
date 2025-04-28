import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, PremiumStatusEnum } from '../users/schemas/user.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getAllCoaches() {
    return this.userModel.find({ role: UserRole.COACH }).exec();
  }

  async getPremiumRequests() {
    return this.userModel
      .find({
        role: UserRole.COACH,
        premiumStatus: PremiumStatusEnum.PENDING,
      })
      .exec();
  }

  async handlePremiumRequest(coachId: string, status: PremiumStatusEnum) {
    const updateData: any = { premiumStatus: status };
    
    if (status === PremiumStatusEnum.ACCEPTED) {
      updateData.isPremium = true;
      updateData.premiumAt = new Date();
    }

    return this.userModel
      .findByIdAndUpdate(coachId, updateData, { new: true })
      .exec();
  }
} 