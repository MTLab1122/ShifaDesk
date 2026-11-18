import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  ScheduledReport,
  ScheduledReportRunStatus,
  ScheduledReportStatus,
} from '@matabai/shared';
import { ReportBuilderService } from './report-builder.service';
import { ReportExportService } from './report-export.service';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class ScheduledReportService {
  private readonly logger = new Logger(ScheduledReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportBuilder: ReportBuilderService,
    private readonly reportExport: ReportExportService,
  ) {}

  public async createScheduledReport(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      reportConfigurationId: string;
      frequency: string;
      recipients: string[];
      exportFormat: string;
      clinicId?: string;
    },
  ): Promise<ScheduledReport> {
    const nextRunAt = this.calculateNextRun(data.frequency);

    const report = await this.prisma.scheduledReport.create({
      data: {
        organizationId,
        clinicId: data.clinicId,
        reportConfigurationId: data.reportConfigurationId,
        name: data.name,
        frequency: data.frequency,
        recipients: data.recipients,
        exportFormat: data.exportFormat,
        status: ScheduledReportStatus.ACTIVE,
        nextRunAt,
        createdById: userId,
      },
      include: {
        reportConfiguration: true,
      },
    });

    return this.mapScheduledReport(report);
  }

  public async listScheduledReports(
    organizationId: string,
    clinicId?: string,
  ): Promise<ScheduledReport[]> {
    const reports = await this.prisma.scheduledReport.findMany({
      where: {
        organizationId,
        ...(clinicId ? { clinicId } : {}),
      },
      include: {
        reportConfiguration: true,
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => this.mapScheduledReport(r));
  }

  public async getScheduledReport(id: string, organizationId: string): Promise<ScheduledReport> {
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
      include: {
        reportConfiguration: true,
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    return this.mapScheduledReport(report);
  }

  public async updateScheduledReport(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      frequency?: string;
      recipients?: string[];
      exportFormat?: string;
      status?: string;
      clinicId?: string;
    },
  ): Promise<ScheduledReport> {
    const existing = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    const nextRunAt = data.frequency
      ? this.calculateNextRun(data.frequency)
      : existing.nextRunAt;

    const updated = await this.prisma.scheduledReport.update({
      where: { id },
      data: {
        name: data.name,
        frequency: data.frequency,
        recipients: data.recipients,
        exportFormat: data.exportFormat,
        status: data.status,
        clinicId: data.clinicId,
        nextRunAt,
      },
      include: {
        reportConfiguration: true,
      },
    });

    return this.mapScheduledReport(updated);
  }

  public async deleteScheduledReport(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    await this.prisma.scheduledReport.delete({
      where: { id },
    });
    return true;
  }

  /**
   * Executes a scheduled report run: queries data, produces export, logs run, and updates next run time.
   */
  public async executeScheduledReport(id: string, organizationId: string) {
    const startTime = Date.now();
    const scheduledReport = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
      include: {
        reportConfiguration: true,
      },
    });

    if (!scheduledReport || !scheduledReport.reportConfiguration) {
      throw new NotFoundException(`Scheduled report ${id} or its configuration was not found`);
    }

    const config = scheduledReport.reportConfiguration;

    // Determine time range based on frequency
    let period = '30d';
    if (scheduledReport.frequency === 'DAILY') period = 'today';
    else if (scheduledReport.frequency === 'WEEKLY') period = '7d';
    else if (scheduledReport.frequency === 'MONTHLY') period = 'this_month';

    const dateRange = AnalyticsTimeHelper.resolveDateRange(period);

    const runRecord = await this.prisma.scheduledReportRun.create({
      data: {
        scheduledReportId: scheduledReport.id,
        organizationId: scheduledReport.organizationId,
        runStatus: ScheduledReportRunStatus.PENDING,
        startedAt: new Date(),
        recipientsDelivered: [],
      },
    });

    try {
      const dimensions = Array.isArray(config.dimensions) ? (config.dimensions as string[]) : [];
      const metrics = Array.isArray(config.metrics) ? (config.metrics as string[]) : [];

      // Execute the query
      const queryResult = await this.reportBuilder.runReportQuery(organizationId, {
        category: config.category,
        dimensions,
        metrics,
        startDate: dateRange.startDateStr,
        endDate: dateRange.endDateStr,
        clinicId: scheduledReport.clinicId || undefined,
        limit: 1000,
      });

      // Export file
      await this.reportExport.exportReport(
        organizationId,
        scheduledReport.createdById,
        scheduledReport.exportFormat,
        queryResult,
        `${scheduledReport.name} (${scheduledReport.frequency})`,
        config.category,
        scheduledReport.clinicId || undefined,
        { scheduledReportId: scheduledReport.id },
      );

      const executionDurationMs = Date.now() - startTime;
      const nextRunAt = this.calculateNextRun(scheduledReport.frequency);

      // Mark run as success
      const completedRun = await this.prisma.scheduledReportRun.update({
        where: { id: runRecord.id },
        data: {
          runStatus: ScheduledReportRunStatus.SUCCESS,
          rowCount: queryResult.totalRows,
          recipientsDelivered: scheduledReport.recipients,
          executionDurationMs,
          completedAt: new Date(),
        },
      });

      // Update scheduled report last/next run
      await this.prisma.scheduledReport.update({
        where: { id: scheduledReport.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      return completedRun;
    } catch (err: any) {
      this.logger.error(`Scheduled report execution failed: ${err.message}`, err.stack);
      const executionDurationMs = Date.now() - startTime;

      await this.prisma.scheduledReportRun.update({
        where: { id: runRecord.id },
        data: {
          runStatus: ScheduledReportRunStatus.FAILED,
          failureReason: err.message,
          executionDurationMs,
          completedAt: new Date(),
        },
      });

      throw err;
    }
  }

  private calculateNextRun(frequency: string): Date {
    const next = new Date();
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        next.setHours(6, 0, 0, 0); // 6 AM next day
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        next.setHours(7, 0, 0, 0);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(8, 0, 0, 0);
        break;
      default:
        next.setDate(next.getDate() + 1);
        break;
    }
    return next;
  }

  private mapScheduledReport(r: any): ScheduledReport {
    return {
      id: r.id,
      organizationId: r.organizationId,
      clinicId: r.clinicId,
      reportConfigurationId: r.reportConfigurationId,
      name: r.name,
      frequency: r.frequency,
      recipients: r.recipients,
      exportFormat: r.exportFormat,
      status: r.status,
      lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
      nextRunAt: r.nextRunAt ? r.nextRunAt.toISOString() : null,
      createdById: r.createdById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      reportConfiguration: r.reportConfiguration
        ? {
            id: r.reportConfiguration.id,
            organizationId: r.reportConfiguration.organizationId,
            clinicId: r.reportConfiguration.clinicId,
            name: r.reportConfiguration.name,
            description: r.reportConfiguration.description,
            category: r.reportConfiguration.category,
            dimensions: Array.isArray(r.reportConfiguration.dimensions)
              ? (r.reportConfiguration.dimensions as string[])
              : [],
            metrics: Array.isArray(r.reportConfiguration.metrics)
              ? (r.reportConfiguration.metrics as string[])
              : [],
            filtersJson: r.reportConfiguration.filtersJson || {},
            grouping: r.reportConfiguration.grouping,
            createdById: r.reportConfiguration.createdById,
            createdAt: r.reportConfiguration.createdAt.toISOString(),
            updatedAt: r.reportConfiguration.updatedAt.toISOString(),
          }
        : undefined,
      runs: r.runs
        ? r.runs.map((run: any) => ({
            id: run.id,
            scheduledReportId: run.scheduledReportId,
            organizationId: run.organizationId,
            runStatus: run.runStatus,
            rowCount: run.rowCount,
            recipientsDelivered: run.recipientsDelivered,
            failureReason: run.failureReason,
            executionDurationMs: run.executionDurationMs,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt ? run.completedAt.toISOString() : null,
          }))
        : undefined,
    };
  }
}
