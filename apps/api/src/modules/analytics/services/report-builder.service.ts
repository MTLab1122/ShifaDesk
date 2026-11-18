import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  ReportQueryResult,
  SavedReportConfiguration,
  AnalyticsCategory,
} from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class ReportBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  public async createConfiguration(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      category: string;
      dimensions: string[];
      metrics: string[];
      filtersJson?: Record<string, any>;
      grouping?: string;
      clinicId?: string;
    },
  ): Promise<SavedReportConfiguration> {
    const config = await this.prisma.savedReportConfiguration.create({
      data: {
        organizationId,
        clinicId: data.clinicId,
        name: data.name,
        description: data.description,
        category: data.category,
        dimensions: data.dimensions,
        metrics: data.metrics,
        filtersJson: data.filtersJson || {},
        grouping: data.grouping,
        createdById: userId,
      },
    });

    return this.mapConfiguration(config);
  }

  public async listConfigurations(
    organizationId: string,
    clinicId?: string,
  ): Promise<SavedReportConfiguration[]> {
    const configs = await this.prisma.savedReportConfiguration.findMany({
      where: {
        organizationId,
        ...(clinicId ? { clinicId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((c) => this.mapConfiguration(c));
  }

  public async getConfiguration(
    id: string,
    organizationId: string,
  ): Promise<SavedReportConfiguration> {
    const config = await this.prisma.savedReportConfiguration.findFirst({
      where: { id, organizationId },
    });
    if (!config) {
      throw new NotFoundException(`Saved report configuration with ID ${id} not found`);
    }

    return this.mapConfiguration(config);
  }

  public async updateConfiguration(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      dimensions?: string[];
      metrics?: string[];
      filtersJson?: Record<string, any>;
      grouping?: string;
      clinicId?: string;
    },
  ): Promise<SavedReportConfiguration> {
    const existing = await this.prisma.savedReportConfiguration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Saved report configuration with ID ${id} not found`);
    }

    const updated = await this.prisma.savedReportConfiguration.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        dimensions: data.dimensions,
        metrics: data.metrics,
        filtersJson: data.filtersJson,
        grouping: data.grouping,
        clinicId: data.clinicId,
      },
    });

    return this.mapConfiguration(updated);
  }

  public async deleteConfiguration(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.prisma.savedReportConfiguration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Saved report configuration with ID ${id} not found`);
    }

    await this.prisma.savedReportConfiguration.delete({
      where: { id },
    });
    return true;
  }

  public async runReportQuery(
    organizationId: string,
    params: {
      category: string;
      dimensions: string[];
      metrics: string[];
      startDate?: string;
      endDate?: string;
      clinicId?: string;
      doctorId?: string;
      limit?: number;
    },
  ): Promise<ReportQueryResult> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange('custom', params.startDate, params.endDate);
    const dateFilter = { gte: dateRange.startDate, lte: dateRange.endDate };
    const maxLimit = Math.min(params.limit || 500, 1000);

    const orgClinicFilter: any = { organizationId };
    if (params.clinicId) orgClinicFilter.clinicId = params.clinicId;

    switch (params.category) {
      case AnalyticsCategory.APPOINTMENTS: {
        const appointments = await this.prisma.appointment.findMany({
          where: {
            ...orgClinicFilter,
            createdAt: dateFilter,
            ...(params.doctorId ? { doctorId: params.doctorId } : {}),
          },
          include: {
            doctor: { select: { fullName: true, specialty: true } },
            clinic: { select: { name: true } },
          },
          take: maxLimit,
          orderBy: { createdAt: 'desc' },
        });

        const rows = appointments.map((a) => ({
          id: a.appointmentNumber,
          date: a.appointmentDate,
          startTime: a.startTime,
          status: a.status,
          doctorName: a.doctor?.fullName || 'N/A',
          specialty: a.doctor?.specialty || 'General',
          clinicName: a.clinic?.name || 'Main Clinic',
          bookingSource: a.bookingSource,
        }));

        const totalCount = rows.length;
        const completedCount = rows.filter((r) => r.status === 'COMPLETED').length;
        const cancelledCount = rows.filter((r) => r.status === 'CANCELLED').length;

        return {
          columns: [
            { key: 'id', label: 'Appointment #', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'startTime', label: 'Time', type: 'string' },
            { key: 'status', label: 'Status', type: 'string' },
            { key: 'doctorName', label: 'Doctor', type: 'string' },
            { key: 'specialty', label: 'Specialty', type: 'string' },
            { key: 'clinicName', label: 'Clinic', type: 'string' },
            { key: 'bookingSource', label: 'Source', type: 'string' },
          ],
          rows,
          summary: {
            totalAppointments: totalCount,
            completedAppointments: completedCount,
            cancelledAppointments: cancelledCount,
          },
          totalRows: totalCount,
          generatedAt: new Date().toISOString(),
        };
      }

      case AnalyticsCategory.FINANCE: {
        const invoices = await this.prisma.invoice.findMany({
          where: {
            ...orgClinicFilter,
            createdAt: dateFilter,
            status: { notIn: ['CANCELLED', 'VOIDED'] },
          },
          include: {
            clinic: { select: { name: true } },
            patient: { select: { patientNumber: true } },
          },
          take: maxLimit,
          orderBy: { createdAt: 'desc' },
        });

        const rows = invoices.map((inv) => ({
          invoiceReference: inv.invoiceReference,
          date: inv.createdAt.toISOString().split('T')[0]!,
          status: inv.status,
          clinicName: inv.clinic?.name || 'Main Clinic',
          patientNumber: inv.patient?.patientNumber || 'N/A',
          totalAmountPkr: inv.totalMinor / 100,
          paidAmountPkr: inv.paidMinor / 100,
          outstandingAmountPkr: inv.outstandingMinor / 100,
        }));

        const totalInvoiced = rows.reduce((acc, r) => acc + r.totalAmountPkr, 0);
        const totalPaid = rows.reduce((acc, r) => acc + r.paidAmountPkr, 0);
        const totalOutstanding = rows.reduce((acc, r) => acc + r.outstandingAmountPkr, 0);

        return {
          columns: [
            { key: 'invoiceReference', label: 'Invoice #', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'status', label: 'Status', type: 'string' },
            { key: 'clinicName', label: 'Clinic', type: 'string' },
            { key: 'patientNumber', label: 'Patient MRN', type: 'string' },
            { key: 'totalAmountPkr', label: 'Total (PKR)', type: 'currency' },
            { key: 'paidAmountPkr', label: 'Paid (PKR)', type: 'currency' },
            { key: 'outstandingAmountPkr', label: 'Outstanding (PKR)', type: 'currency' },
          ],
          rows,
          summary: {
            totalInvoicedPkr: totalInvoiced,
            totalPaidPkr: totalPaid,
            totalOutstandingPkr: totalOutstanding,
          },
          totalRows: rows.length,
          generatedAt: new Date().toISOString(),
        };
      }

      case AnalyticsCategory.LABORATORY: {
        const orders = await this.prisma.laboratoryOrder.findMany({
          where: {
            ...orgClinicFilter,
            createdAt: dateFilter,
          },
          include: {
            clinic: { select: { name: true } },
            patient: { select: { patientNumber: true } },
            orderingDoctor: { select: { fullName: true } },
          },
          take: maxLimit,
          orderBy: { createdAt: 'desc' },
        });

        const rows = orders.map((o) => ({
          orderReference: o.orderReference,
          date: o.createdAt.toISOString().split('T')[0]!,
          orderStatus: o.orderStatus,
          clinicName: o.clinic?.name || 'Main Clinic',
          patientNumber: o.patient?.patientNumber || 'N/A',
          doctorName: o.orderingDoctor?.fullName || 'N/A',
          totalAmount: o.totalAmount,
        }));

        return {
          columns: [
            { key: 'orderReference', label: 'Order #', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'orderStatus', label: 'Status', type: 'string' },
            { key: 'clinicName', label: 'Clinic', type: 'string' },
            { key: 'patientNumber', label: 'Patient MRN', type: 'string' },
            { key: 'doctorName', label: 'Doctor', type: 'string' },
            { key: 'totalAmount', label: 'Amount (PKR)', type: 'currency' },
          ],
          rows,
          summary: {
            totalOrders: rows.length,
          },
          totalRows: rows.length,
          generatedAt: new Date().toISOString(),
        };
      }

      default: {
        const encs = await this.prisma.clinicalEncounter.findMany({
          where: {
            ...orgClinicFilter,
            createdAt: dateFilter,
          },
          include: {
            doctor: { select: { fullName: true } },
            clinic: { select: { name: true } },
          },
          take: maxLimit,
          orderBy: { createdAt: 'desc' },
        });

        const rows = encs.map((e) => ({
          encounterReference: e.encounterReference,
          date: e.encounterDate,
          status: e.status,
          doctorName: e.doctor?.fullName || 'N/A',
          clinicName: e.clinic?.name || 'Main Clinic',
          type: e.type,
          source: e.source,
        }));

        return {
          columns: [
            { key: 'encounterReference', label: 'Encounter #', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'status', label: 'Status', type: 'string' },
            { key: 'doctorName', label: 'Doctor', type: 'string' },
            { key: 'clinicName', label: 'Clinic', type: 'string' },
            { key: 'type', label: 'Type', type: 'string' },
            { key: 'source', label: 'Source', type: 'string' },
          ],
          rows,
          summary: {
            totalEncounters: rows.length,
          },
          totalRows: rows.length,
          generatedAt: new Date().toISOString(),
        };
      }
    }
  }

  private mapConfiguration(c: any): SavedReportConfiguration {
    return {
      id: c.id,
      organizationId: c.organizationId,
      clinicId: c.clinicId,
      name: c.name,
      description: c.description,
      category: c.category,
      dimensions: Array.isArray(c.dimensions) ? (c.dimensions as string[]) : [],
      metrics: Array.isArray(c.metrics) ? (c.metrics as string[]) : [],
      filtersJson: (c.filtersJson as Record<string, any>) || {},
      grouping: c.grouping,
      createdById: c.createdById,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
