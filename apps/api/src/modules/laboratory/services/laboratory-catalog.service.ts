import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { LaboratoryAuditService } from './laboratory-audit.service';
import {
  CreateLabCategoryInput,
  UpdateLabCategoryInput,
  CreateLabTestInput,
  UpdateLabTestInput,
  QueryLabTestsInput,
  CreateLabPackageInput,
  UpdateLabPackageInput,
  QueryLabPackagesInput,
} from '@matabai/validation';

@Injectable()
export class LaboratoryCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: LaboratoryAuditService,
  ) {}

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  public async listCategories(organizationId: string, clinicId?: string) {
    return this.prisma.laboratoryTestCategory.findMany({
      where: {
        organizationId,
        ...(clinicId ? { OR: [{ clinicId }, { clinicId: null }] } : {}),
      },
      include: {
        _count: {
          select: { tests: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  public async createCategory(
    organizationId: string,
    input: CreateLabCategoryInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryTestCategory.findFirst({
      where: {
        organizationId,
        name: { equals: input.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${input.name}" already exists in this organization`);
    }

    const category = await this.prisma.laboratoryTestCategory.create({
      data: {
        organizationId,
        clinicId: input.clinicId || null,
        name: input.name,
        description: input.description || null,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: input.clinicId || null,
      actorId,
      entityType: 'TEST',
      entityId: category.id,
      action: 'CREATED',
      newValues: { name: category.name },
    });

    return category;
  }

  public async updateCategory(
    organizationId: string,
    categoryId: string,
    input: UpdateLabCategoryInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryTestCategory.findFirst({
      where: { id: categoryId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Category not found`);
    }

    if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.prisma.laboratoryTestCategory.findFirst({
        where: {
          organizationId,
          name: { equals: input.name, mode: 'insensitive' },
          id: { not: categoryId },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Category "${input.name}" already exists`);
      }
    }

    const updated = await this.prisma.laboratoryTestCategory.update({
      where: { id: categoryId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: existing.clinicId,
      actorId,
      entityType: 'TEST',
      entityId: categoryId,
      action: 'UPDATED',
      previousValues: { name: existing.name, active: existing.active },
      newValues: { name: updated.name, active: updated.active },
    });

    return updated;
  }

  // =========================================================================
  // TESTS
  // =========================================================================

  public async listTests(organizationId: string, query: QueryLabTestsInput) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      clinicId,
      sampleType,
      active,
      sortBy = 'testName',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(categoryId ? { categoryId } : {}),
      ...(clinicId ? { OR: [{ clinicId }, { clinicId: null }] } : {}),
      ...(sampleType ? { sampleType } : {}),
      ...(active !== undefined ? { active } : {}),
    };

    if (search) {
      where.OR = [
        { testCode: { contains: search, mode: 'insensitive' } },
        { testName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.laboratoryTest.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take: limit,
      }),
      this.prisma.laboratoryTest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getTestById(organizationId: string, testId: string) {
    const test = await this.prisma.laboratoryTest.findFirst({
      where: { id: testId, organizationId },
      include: {
        category: true,
        packageItems: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`Diagnostic test not found`);
    }

    return test;
  }

  public async createTest(
    organizationId: string,
    input: CreateLabTestInput,
    actorId: string,
  ) {
    // Verify category belongs to organization
    const category = await this.prisma.laboratoryTestCategory.findFirst({
      where: { id: input.categoryId, organizationId },
    });
    if (!category) {
      throw new BadRequestException('Specified category does not exist in this organization');
    }

    // Check test code uniqueness per organization
    const existingCode = await this.prisma.laboratoryTest.findUnique({
      where: {
        organizationId_testCode: {
          organizationId,
          testCode: input.testCode.toUpperCase(),
        },
      },
    });
    if (existingCode) {
      throw new ConflictException(
        `Test with code "${input.testCode.toUpperCase()}" already exists in this organization`,
      );
    }

    const test = await this.prisma.laboratoryTest.create({
      data: {
        organizationId,
        clinicId: input.clinicId || null,
        categoryId: input.categoryId,
        testCode: input.testCode.toUpperCase(),
        testName: input.testName,
        description: input.description || null,
        sampleType: input.sampleType || 'Blood',
        collectionInstructions: input.collectionInstructions || null,
        preparationInstructions: input.preparationInstructions || null,
        processingNotes: input.processingNotes || null,
        turnaroundMinutes: input.turnaroundMinutes || 240,
        price: input.price,
        currency: input.currency || 'PKR',
        referenceRange: input.referenceRange || null,
        unit: input.unit || null,
        resultType: input.resultType || 'NUMERIC',
        createdById: actorId,
      },
      include: {
        category: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: input.clinicId || null,
      actorId,
      entityType: 'TEST',
      entityId: test.id,
      action: 'CREATED',
      newValues: {
        testCode: test.testCode,
        testName: test.testName,
        price: test.price,
      },
    });

    return test;
  }

  public async updateTest(
    organizationId: string,
    testId: string,
    input: UpdateLabTestInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryTest.findFirst({
      where: { id: testId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Diagnostic test not found`);
    }

    if (input.testCode && input.testCode.toUpperCase() !== existing.testCode) {
      const duplicate = await this.prisma.laboratoryTest.findUnique({
        where: {
          organizationId_testCode: {
            organizationId,
            testCode: input.testCode.toUpperCase(),
          },
        },
      });
      if (duplicate && duplicate.id !== testId) {
        throw new ConflictException(`Test code "${input.testCode.toUpperCase()}" already in use`);
      }
    }

    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const category = await this.prisma.laboratoryTestCategory.findFirst({
        where: { id: input.categoryId, organizationId },
      });
      if (!category) {
        throw new BadRequestException('Target category not found');
      }
    }

    const updated = await this.prisma.laboratoryTest.update({
      where: { id: testId },
      data: {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.testCode !== undefined ? { testCode: input.testCode.toUpperCase() } : {}),
        ...(input.testName !== undefined ? { testName: input.testName } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sampleType !== undefined ? { sampleType: input.sampleType } : {}),
        ...(input.collectionInstructions !== undefined
          ? { collectionInstructions: input.collectionInstructions }
          : {}),
        ...(input.preparationInstructions !== undefined
          ? { preparationInstructions: input.preparationInstructions }
          : {}),
        ...(input.processingNotes !== undefined ? { processingNotes: input.processingNotes } : {}),
        ...(input.turnaroundMinutes !== undefined
          ? { turnaroundMinutes: input.turnaroundMinutes }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.referenceRange !== undefined ? { referenceRange: input.referenceRange } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.resultType !== undefined ? { resultType: input.resultType } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: {
        category: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: existing.clinicId,
      actorId,
      entityType: 'TEST',
      entityId: testId,
      action: 'UPDATED',
      previousValues: {
        testCode: existing.testCode,
        testName: existing.testName,
        price: existing.price,
        active: existing.active,
      },
      newValues: {
        testCode: updated.testCode,
        testName: updated.testName,
        price: updated.price,
        active: updated.active,
      },
    });

    return updated;
  }

  // =========================================================================
  // PACKAGES
  // =========================================================================

  public async listPackages(organizationId: string, query: QueryLabPackagesInput) {
    const { page = 1, limit = 20, search, clinicId, active } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(clinicId ? { OR: [{ clinicId }, { clinicId: null }] } : {}),
      ...(active !== undefined ? { active } : {}),
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.laboratoryPackage.findMany({
        where,
        include: {
          items: {
            include: {
              test: {
                select: {
                  id: true,
                  testCode: true,
                  testName: true,
                  price: true,
                  sampleType: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.laboratoryPackage.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getPackageById(organizationId: string, packageId: string) {
    const pkg = await this.prisma.laboratoryPackage.findFirst({
      where: { id: packageId, organizationId },
      include: {
        items: {
          include: {
            test: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundException(`Diagnostic package not found`);
    }

    return pkg;
  }

  public async createPackage(
    organizationId: string,
    input: CreateLabPackageInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryPackage.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: input.code.toUpperCase(),
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Package code "${input.code.toUpperCase()}" already exists in this organization`,
      );
    }

    // Verify all test IDs belong to organization
    const tests = await this.prisma.laboratoryTest.findMany({
      where: {
        id: { in: input.testIds },
        organizationId,
      },
      select: { id: true },
    });
    if (tests.length !== input.testIds.length) {
      throw new BadRequestException('One or more test IDs are invalid for this organization');
    }

    const pkg = await this.prisma.$transaction(async (tx) => {
      const created = await tx.laboratoryPackage.create({
        data: {
          organizationId,
          clinicId: input.clinicId || null,
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description || null,
          price: input.price,
        },
      });

      await tx.laboratoryPackageItem.createMany({
        data: input.testIds.map((testId) => ({
          packageId: created.id,
          testId,
        })),
      });

      return tx.laboratoryPackage.findUnique({
        where: { id: created.id },
        include: {
          items: {
            include: {
              test: true,
            },
          },
        },
      });
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: input.clinicId || null,
      actorId,
      entityType: 'PACKAGE',
      entityId: pkg!.id,
      action: 'CREATED',
      newValues: { code: pkg!.code, name: pkg!.name, price: pkg!.price },
    });

    return pkg;
  }

  public async updatePackage(
    organizationId: string,
    packageId: string,
    input: UpdateLabPackageInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryPackage.findFirst({
      where: { id: packageId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Diagnostic package not found`);
    }

    if (input.code && input.code.toUpperCase() !== existing.code) {
      const duplicate = await this.prisma.laboratoryPackage.findUnique({
        where: {
          organizationId_code: {
            organizationId,
            code: input.code.toUpperCase(),
          },
        },
      });
      if (duplicate && duplicate.id !== packageId) {
        throw new ConflictException(`Package code "${input.code.toUpperCase()}" already in use`);
      }
    }

    if (input.testIds) {
      const tests = await this.prisma.laboratoryTest.findMany({
        where: { id: { in: input.testIds }, organizationId },
        select: { id: true },
      });
      if (tests.length !== input.testIds.length) {
        throw new BadRequestException('One or more test IDs are invalid');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.laboratoryPackage.update({
        where: { id: packageId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });

      if (input.testIds) {
        await tx.laboratoryPackageItem.deleteMany({
          where: { packageId },
        });
        await tx.laboratoryPackageItem.createMany({
          data: input.testIds.map((testId) => ({
            packageId,
            testId,
          })),
        });
      }

      return tx.laboratoryPackage.findUnique({
        where: { id: packageId },
        include: {
          items: {
            include: { test: true },
          },
        },
      });
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: existing.clinicId,
      actorId,
      entityType: 'PACKAGE',
      entityId: packageId,
      action: 'UPDATED',
      previousValues: { code: existing.code, name: existing.name, price: existing.price },
      newValues: { code: updated!.code, name: updated!.name, price: updated!.price },
    });

    return updated;
  }
}
