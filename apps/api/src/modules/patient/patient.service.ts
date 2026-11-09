import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { CreatePatientDto, UpdatePatientDto } from '@matabai/validation';
import { UserRole, buildPaginationMeta } from '@matabai/shared';

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private isAuthorizedForPatientData(user: AuthenticatedUser): boolean {
    return (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CLINIC_ADMIN ||
      user.role === UserRole.DOCTOR ||
      user.role === UserRole.RECEPTIONIST
    );
  }

  async findAll(
    user: AuthenticatedUser,
    organizationId?: string,
    clinicId?: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ) {
    if (!this.isAuthorizedForPatientData(user)) {
      throw new ForbiddenException('You do not have permission to view patient directory');
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const targetOrgId = organizationId || user.organizationId;

    if (!targetOrgId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Organization context required to list patients');
    }

    const where: any = {};
    if (targetOrgId) {
      where.organizationId = targetOrgId;
    }
    if (clinicId) {
      where.clinicId = clinicId;
    }

    // Tenant check
    if (user.role !== UserRole.SUPER_ADMIN && targetOrgId) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: targetOrgId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to patients in this organization');
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { patientNumber: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status && status.trim()) {
      where.status = status.trim();
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          clinic: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        clinic: true,
        organization: true,
        userProfile: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    // Role and tenant verification
    if (user.role === UserRole.PATIENT) {
      // Patient can only view their own record
      if (!patient.userProfileId || patient.userProfileId !== user.id) {
        throw new ForbiddenException('You are not authorized to view another patient record');
      }
      return patient;
    }

    if (!this.isAuthorizedForPatientData(user)) {
      throw new ForbiddenException('Unauthorized to view patient clinical profiles');
    }

    // Organization tenant boundary check
    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: patient.organizationId,
          userProfileId: user.id,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Cross-tenant access forbidden. Patient belongs to another organization.');
      }
    }

    return patient;
  }

  async create(dto: CreatePatientDto, user: AuthenticatedUser) {
    // Only authorized clinical/administrative staff can register patients
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_ADMIN &&
      user.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Only clinical administrators or reception staff can register patients');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${dto.clinicId} not found`);
    }

    const organizationId = dto.organizationId || clinic.organizationId;

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to register patients in this organization');
      }
    }

    // Duplicate check: prevent duplicate registration with identical phone number & full name in the organization
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        organizationId,
        phone: dto.phone,
        fullName: { equals: dto.fullName, mode: 'insensitive' },
      },
    });

    if (existingPatient) {
      throw new ConflictException(
        `A patient with name '${dto.fullName}' and phone '${dto.phone}' is already registered under MRN ${existingPatient.patientNumber}`,
      );
    }

    // Generate formatted MRN / Patient Number: MRN-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const count = await this.prisma.patient.count({
      where: { organizationId },
    });

    let seq = count + 1;
    let patientNumber = `MRN-${currentYear}-${String(seq).padStart(4, '0')}`;
    let exists = await this.prisma.patient.findUnique({
      where: {
        organizationId_patientNumber: {
          organizationId,
          patientNumber,
        },
      },
    });

    while (exists && seq < count + 50) {
      seq++;
      patientNumber = `MRN-${currentYear}-${String(seq).padStart(4, '0')}`;
      exists = await this.prisma.patient.findUnique({
        where: {
          organizationId_patientNumber: {
            organizationId,
            patientNumber,
          },
        },
      });
    }

    const patient = await this.prisma.patient.create({
      data: {
        organizationId,
        clinicId: dto.clinicId,
        userProfileId: dto.userProfileId,
        patientNumber,
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        consentStatus: dto.consentStatus || 'GRANTED',
        status: dto.status || 'ACTIVE',
      },
      include: {
        clinic: {
          select: { id: true, name: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId,
      clinicId: dto.clinicId,
      action: 'PATIENT_REGISTER',
      resourceType: 'patient',
      resourceId: patient.id,
      metadata: { patientNumber: patient.patientNumber, fullName: patient.fullName },
    });

    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_ADMIN &&
      user.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Only administrators and reception staff can update patient records');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: patient.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to update patients in this organization');
      }
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        clinicId: dto.clinicId,
        userProfileId: dto.userProfileId,
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        consentStatus: dto.consentStatus,
        status: dto.status,
      },
      include: {
        clinic: {
          select: { id: true, name: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: patient.organizationId,
      clinicId: updated.clinicId,
      action: 'PATIENT_UPDATE',
      resourceType: 'patient',
      resourceId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async updateStatus(id: string, status: string, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CLINIC_ADMIN) {
      throw new ForbiddenException('Only clinic administrators can change patient active status');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: patient.organizationId,
          userProfileId: user.id,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] },
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to modify patient status');
      }
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      actorUserId: user.id,
      organizationId: patient.organizationId,
      clinicId: patient.clinicId,
      action: 'PATIENT_STATUS_UPDATE',
      resourceType: 'patient',
      resourceId: id,
      metadata: { previousStatus: patient.status, newStatus: status },
    });

    return updated;
  }
}

