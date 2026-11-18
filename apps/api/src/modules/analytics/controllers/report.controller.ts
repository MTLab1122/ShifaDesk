import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole, ReportQueryResult } from '@matabai/shared';
import {
  runReportQuerySchema,
  exportReportSchema,
  saveReportConfigurationSchema,
  updateReportConfigurationSchema,
  createScheduledReportSchema,
  updateScheduledReportSchema,
} from '@matabai/validation';

import { ReportBuilderService } from '../services/report-builder.service';
import { ReportExportService } from '../services/report-export.service';
import { ScheduledReportService } from '../services/scheduled-report.service';

@Controller('analytics/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(
    private readonly reportBuilder: ReportBuilderService,
    private readonly reportExport: ReportExportService,
    private readonly scheduledService: ScheduledReportService,
  ) {}

  @Post('query')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async queryReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = runReportQuerySchema.parse(body);
    return this.reportBuilder.runReportQuery(user.organizationId!, {
      category: validated.category,
      dimensions: validated.dimensions || [],
      metrics: validated.metrics,
      startDate: validated.startDate,
      endDate: validated.endDate,
      clinicId: validated.clinicId || undefined,
      limit: validated.limit,
    });
  }

  @Post('export')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const validated = exportReportSchema.parse(body);

    const queryResult: ReportQueryResult = {
      columns: validated.columns.map((c) => ({
        key: c.key,
        label: c.label,
        type: (c.type as any) || 'string',
      })),
      rows: validated.rows,
      totalRows: validated.rows.length,
      generatedAt: new Date().toISOString(),
    };

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const exportResult = await this.reportExport.exportReport(
      user.organizationId!,
      user.id,
      validated.format,
      queryResult,
      validated.reportName,
      validated.category,
      validated.clinicId || undefined,
      validated.filtersApplied || {},
      ipAddress,
      userAgent,
    );

    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportResult.filename}"`,
    );
    res.send(exportResult.buffer);
  }

  // --- Saved Report Configurations ---

  @Get('configurations')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async listConfigurations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.reportBuilder.listConfigurations(user.organizationId!, clinicId);
  }

  @Post('configurations')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async createConfiguration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = saveReportConfigurationSchema.parse(body);
    return this.reportBuilder.createConfiguration(user.organizationId!, user.id, {
      ...validated,
      description: validated.description || undefined,
      grouping: validated.grouping || undefined,
      clinicId: validated.clinicId || undefined,
    });
  }

  @Get('configurations/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async getConfiguration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportBuilder.getConfiguration(id, user.organizationId!);
  }

  @Patch('configurations/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async updateConfiguration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = updateReportConfigurationSchema.parse(body);
    return this.reportBuilder.updateConfiguration(id, user.organizationId!, {
      ...validated,
      description: validated.description || undefined,
      grouping: validated.grouping || undefined,
    });
  }

  @Delete('configurations/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async deleteConfiguration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportBuilder.deleteConfiguration(id, user.organizationId!);
  }

  // --- Scheduled Reports ---

  @Get('scheduled')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async listScheduledReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.scheduledService.listScheduledReports(user.organizationId!, clinicId);
  }

  @Post('scheduled')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createScheduledReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = createScheduledReportSchema.parse(body);
    return this.scheduledService.createScheduledReport(user.organizationId!, user.id, {
      ...validated,
      clinicId: validated.clinicId || undefined,
    });
  }

  @Get('scheduled/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getScheduledReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduledService.getScheduledReport(id, user.organizationId!);
  }

  @Patch('scheduled/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateScheduledReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = updateScheduledReportSchema.parse(body);
    return this.scheduledService.updateScheduledReport(id, user.organizationId!, validated);
  }

  @Delete('scheduled/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async deleteScheduledReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduledService.deleteScheduledReport(id, user.organizationId!);
  }

  @Post('scheduled/:id/run')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async runScheduledReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduledService.executeScheduledReport(id, user.organizationId!);
  }
}
