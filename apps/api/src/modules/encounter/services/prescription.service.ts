import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  CreatePrescriptionInput,
  AmendPrescriptionInput,
  CancelPrescriptionInput,
  QueryPrescriptionsInput,
} from '@matabai/validation';
import { PrescriptionStatus } from '@matabai/shared';

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates next sequential reference: RX-YYYYMM-XXXX
   */
  private async generatePrescriptionReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `RX-${yearMonth}-`;

    const count = await this.prisma.prescription.count({
      where: {
        organizationId,
        prescriptionReference: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Creates an outpatient prescription with multiple items
   */
  async createPrescription(organizationId: string, _actorUserId: string, dto: CreatePrescriptionInput) {
    // 1. Verify Encounter
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id: dto.encounterId, organizationId },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    if (encounter.isFinalized) {
      throw new BadRequestException('Cannot add new prescriptions to a finalized encounter. Please use amendment workflow.');
    }

    // 2. Generate Reference
    const prescriptionReference = await this.generatePrescriptionReference(organizationId);

    // 3. Create Prescription & Items in Transaction
    return this.prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          organizationId,
          clinicId: dto.clinicId,
          encounterId: dto.encounterId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          prescriptionReference,
          version: 1,
          status: PrescriptionStatus.ACTIVE,
          notes: dto.notes || null,
          issuedAt: new Date(),
          items: {
            create: dto.items.map((item) => ({
              medicationName: item.medicationName,
              genericName: item.genericName || null,
              strength: item.strength,
              dosageForm: item.dosageForm || 'Tablet',
              dosage: item.dosage,
              route: item.route || 'Oral',
              frequency: item.frequency,
              duration: item.duration,
              quantity: item.quantity || null,
              instructions: item.instructions || null,
            })),
          },
        },
        include: {
          items: true,
          doctor: { include: { userProfile: true } },
          patient: true,
          clinic: true,
        },
      });

      return prescription;
    });
  }

  /**
   * Amends an existing prescription with version increment and historical snapshot preservation
   */
  async amendPrescription(
    id: string,
    organizationId: string,
    actorUserId: string,
    dto: AmendPrescriptionInput,
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new BadRequestException('Cannot amend a cancelled prescription');
    }

    const previousSnapshot = JSON.stringify(prescription.items);
    const newSnapshot = JSON.stringify(dto.items);
    const newVersion = prescription.version + 1;

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete previous items
      await tx.prescriptionItem.deleteMany({
        where: { prescriptionId: id },
      });

      // 2. Insert amended items
      await tx.prescriptionItem.createMany({
        data: dto.items.map((item) => ({
          prescriptionId: id,
          medicationName: item.medicationName,
          genericName: item.genericName || null,
          strength: item.strength,
          dosageForm: item.dosageForm || 'Tablet',
          dosage: item.dosage,
          route: item.route || 'Oral',
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity || null,
          instructions: item.instructions || null,
        })),
      });

      // 3. Record amendment ledger
      await tx.prescriptionAmendment.create({
        data: {
          prescriptionId: id,
          version: newVersion,
          reason: dto.reason,
          amendedById: actorUserId,
          previousSnapshot,
          newSnapshot,
        },
      });

      // 4. Update prescription record
      const updated = await tx.prescription.update({
        where: { id },
        data: {
          version: newVersion,
          status: PrescriptionStatus.AMENDED,
          notes: dto.notes !== undefined ? dto.notes : prescription.notes,
        },
        include: {
          items: true,
          amendments: true,
          doctor: { include: { userProfile: true } },
          patient: true,
          clinic: true,
        },
      });

      return updated;
    });
  }

  /**
   * Cancels a prescription with mandatory clinical reason
   */
  async cancelPrescription(
    id: string,
    organizationId: string,
    _actorUserId: string,
    dto: CancelPrescriptionInput,
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, organizationId },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new BadRequestException('Prescription is already cancelled');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: PrescriptionStatus.CANCELLED,
        cancellationReason: dto.cancellationReason,
      },
      include: {
        items: true,
        doctor: { include: { userProfile: true } },
        patient: true,
      },
    });
  }

  /**
   * Retrieves prescription details by ID
   */
  async getPrescription(id: string, organizationId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        amendments: { orderBy: { version: 'desc' } },
        doctor: { include: { userProfile: true } },
        patient: true,
        clinic: true,
        encounter: true,
      },
    });

    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  /**
   * Queries prescriptions with pagination and filters
   */
  async queryPrescriptions(organizationId: string, query: QueryPrescriptionsInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.encounterId) where.encounterId = query.encounterId;
    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { prescriptionReference: { contains: query.search, mode: 'insensitive' } },
        { patient: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { patient: { patientNumber: { contains: query.search, mode: 'insensitive' } } },
        { doctor: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.prescription.count({ where }),
      this.prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          doctor: { include: { userProfile: true } },
          patient: true,
          clinic: true,
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Generates official printable prescription HTML format
   */
  async generatePrescriptionHtml(id: string, organizationId: string): Promise<string> {
    const rx = await this.getPrescription(id, organizationId);

    const itemsHtml = rx.items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 8px; vertical-align: top; font-weight: bold; color: #1e293b;">
            ${idx + 1}. ${it.medicationName} ${it.strength}
            ${it.genericName ? `<br/><span style="font-size: 11px; color: #64748b; font-weight: normal;">(${it.genericName})</span>` : ''}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; color: #334155;">
            ${it.dosageForm} • ${it.dosage}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; color: #334155;">
            ${it.frequency}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; color: #334155;">
            ${it.duration}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; color: #475569; font-size: 12px;">
            ${it.instructions || '-'}
          </td>
        </tr>`,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Prescription ${rx.prescriptionReference}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .clinic-name { font-size: 22px; font-weight: bold; color: #0f766e; }
          .doctor-name { font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px; }
          .doctor-meta { font-size: 12px; color: #64748b; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 13px; }
          .patient-field-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
          .patient-field-value { font-weight: 600; color: #1e293b; }
          .rx-symbol { font-size: 32px; font-weight: bold; color: #0f766e; font-family: serif; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; }
          .signature-line { border-top: 1px solid #1e293b; width: 200px; text-align: center; padding-top: 6px; font-weight: 600; color: #1e293b; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-name">${rx.clinic.name}</div>
            <div class="doctor-name">Dr. ${rx.doctor.fullName}</div>
            <div class="doctor-meta">${rx.doctor.specialty || 'General Practitioner'} • PMDC: ${rx.doctor.registrationNumber}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 16px; color: #0f766e;">${rx.prescriptionReference}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Issued: ${new Date(rx.issuedAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            ${rx.version > 1 ? `<div style="font-size: 11px; color: #b45309; font-weight: 600;">Amended Version ${rx.version}</div>` : ''}
          </div>
        </div>

        <div class="patient-box">
          <div>
            <div class="patient-field-label">Patient Name</div>
            <div class="patient-field-value">${rx.patient.fullName}</div>
          </div>
          <div>
            <div class="patient-field-label">MRN / Patient ID</div>
            <div class="patient-field-value">${rx.patient.patientNumber}</div>
          </div>
          <div>
            <div class="patient-field-label">Gender / DOB</div>
            <div class="patient-field-value">${rx.patient.gender || '-'} / ${rx.patient.dateOfBirth || '-'}</div>
          </div>
          <div>
            <div class="patient-field-label">Contact</div>
            <div class="patient-field-value">${rx.patient.phone}</div>
          </div>
        </div>

        <div class="rx-symbol">&#8478;</div>

        <table>
          <thead>
            <tr>
              <th style="width: 32%;">Medication & Strength</th>
              <th style="width: 18%;">Dosage Form & Dose</th>
              <th style="width: 15%;">Frequency</th>
              <th style="width: 15%;">Duration</th>
              <th style="width: 20%;">Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${rx.notes ? `<div style="background: #f8fafc; border-left: 3px solid #0f766e; padding: 10px 14px; font-size: 12px; color: #334155; margin-bottom: 24px;"><strong>Doctor's Notes:</strong> ${rx.notes}</div>` : ''}

        <div class="footer">
          <div>
            <div>This prescription is doctor-issued and electronically validated on MatabAI.</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Encounter: ${rx.encounter.encounterReference}</div>
          </div>
          <div>
            <div class="signature-line">Dr. ${rx.doctor.fullName}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
