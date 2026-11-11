import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { queryInAppNotificationsSchema } from '@matabai/validation';

@Controller('in-app-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InAppNotificationController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  async listNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryInAppNotificationsSchema.parse(query);
    const { page = 1, limit = 20, unreadOnly, category } = validated;
    const skip = (page - 1) * limit;

    const where: any = {
      recipientUserId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
      ...(category ? { category } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inAppNotification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const unreadCount = await this.prisma.inAppNotification.count({
      where: {
        recipientUserId: user.id,
        readAt: null,
      },
    });

    return { unreadCount };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.prisma.inAppNotification.updateMany({
      where: {
        id,
        recipientUserId: user.id,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.prisma.inAppNotification.updateMany({
      where: {
        recipientUserId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }
}
