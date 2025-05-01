import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PremiumStatusEnum, User } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';


@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  @Get('coaches')
  async getAllCoaches() {
  const coaches=await this.adminService.getAllCoaches();
    return coaches;
  }

  @Get('premium-requests')
  async getPremiumRequests() {
    return this.adminService.getPremiumRequests();
  }

  @Post('premium-requests/:coachId')
  async handlePremiumRequest(
    @Param('coachId') coachId: string,
    @Body('status') status: PremiumStatusEnum,
  ) {
    return this.adminService.handlePremiumRequest(coachId, status);
  }
} 