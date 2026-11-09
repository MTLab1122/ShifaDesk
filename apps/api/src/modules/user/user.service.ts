import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UpdateUserProfileDto } from '@matabai/validation';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthenticatedUser) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: user.id },
      include: {
        organizationMemberships: {
          include: { organization: true },
        },
        clinicMemberships: {
          include: { clinic: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    return profile;
  }

  async updateMe(user: AuthenticatedUser, dto: UpdateUserProfileDto) {
    const updated = await this.prisma.userProfile.update({
      where: { id: user.id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    return updated;
  }
}
