import {
  Controller,
  Get,
  Query,
  UseGuards,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/database/prisma.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, CurrentUser } from '../../common/auth/decorators';
import { UserRole, buildPaginationMeta } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'List security and clinical audit logs' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader?: string,
    @Query('organizationId') orgQuery?: string,
    @Query('clinicId') clinicId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const targetOrgId = orgQuery || orgHeader || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to view audit logs');
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const where: any = {};

    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }
    if (clinicId) {
      where.clinicId = clinicId;
    }
    if (action) {
      where.action = action;
    }
    if (resourceType) {
      where.resourceType = resourceType;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorUser: true,
          clinic: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(Number(page), Number(limit), totalItems),
    };
  }
}

