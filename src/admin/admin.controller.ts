import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PremiumStatusEnum } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('coaches')
  async getAllCoaches() {
    return this.adminService.getAllCoaches();
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