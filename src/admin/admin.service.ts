import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, PremiumStatusEnum } from '../users/schemas/user.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getAllCoaches(search?: string, page?: number, limit?: number) {
    const query: any = { role: UserRole.COACH };
    
    // Add search condition if search term is provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await this.userModel.countDocuments(query);

    // Apply pagination
    const skip = page && limit ? (page - 1) * limit : 0;
    const take = limit || 10;

    const coaches = await this.userModel
      .find(query)
      .skip(skip)
      .limit(take)
      .exec();
    
    // Get student count for each coach
    const coachesWithStudentCount = await Promise.all(
      coaches.map(async (coach) => {
        const studentCount = await this.userModel.countDocuments({
          role: UserRole.STUDENT,
          coachId: coach._id
        });
        
        return {
          ...coach.toObject(),
          studentCount
        };
      })
    );

    return {
      items: coachesWithStudentCount,
      total
    };
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
      const now = new Date();
      const expiresAt = new Date(now);
      const user = await this.userModel.findById(coachId);

      if (!user) {
        throw new Error('User not found');
      }

      switch (user.subscriptionType) {
        case 'quarterly':
          expiresAt.setMonth(expiresAt.getMonth() + 3);
          break;
        case 'semi-annual':
          expiresAt.setMonth(expiresAt.getMonth() + 6);
          break;
        default:
          expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      updateData.isPremium = true;
      updateData.premiumAt = now;
      updateData.premiumExpiresAt = expiresAt;
    }

    return this.userModel
      .findByIdAndUpdate(coachId, updateData, { new: true })
      .exec();
  }
} 