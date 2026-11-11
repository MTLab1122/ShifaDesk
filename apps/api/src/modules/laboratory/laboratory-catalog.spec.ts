import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryCatalogService } from './services/laboratory-catalog.service';
import { LaboratoryAuditService } from './services/laboratory-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('LaboratoryCatalogService', () => {
  let service: LaboratoryCatalogService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockActorId = 'user-tech-1';

  beforeEach(async () => {
    mockPrisma = {
      laboratoryTestCategory: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      laboratoryTest: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      laboratoryPackage: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      laboratoryPackageItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryCatalogService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LaboratoryAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<LaboratoryCatalogService>(LaboratoryCatalogService);
  });

  describe('Categories', () => {
    it('should list categories for an organization', async () => {
      mockPrisma.laboratoryTestCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Hematology', organizationId: mockOrgId },
      ]);

      const result = await service.listCategories(mockOrgId);
      expect(result).toHaveLength(1);
      expect(mockPrisma.laboratoryTestCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: mockOrgId }) }),
      );
    });

    it('should create a new category and write an audit record', async () => {
      mockPrisma.laboratoryTestCategory.findFirst.mockResolvedValue(null);
      mockPrisma.laboratoryTestCategory.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Clinical Biochemistry',
        organizationId: mockOrgId,
      });

      const cat = await service.createCategory(
        mockOrgId,
        { name: 'Clinical Biochemistry', description: 'Biochem panels' },
        mockActorId,
      );

      expect(cat.name).toBe('Clinical Biochemistry');
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'TEST',
          action: 'CREATED',
        }),
      );
    });

    it('should reject duplicate category name within organization', async () => {
      mockPrisma.laboratoryTestCategory.findFirst.mockResolvedValue({ id: 'cat-dup', name: 'Hematology' });

      await expect(
        service.createCategory(mockOrgId, { name: 'Hematology' }, mockActorId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Diagnostic Tests Catalog', () => {
    it('should create a diagnostic test when valid category and unique test code', async () => {
      mockPrisma.laboratoryTestCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.laboratoryTest.findUnique.mockResolvedValue(null);
      mockPrisma.laboratoryTest.create.mockResolvedValue({
        id: 'test-1',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        price: 1200,
        currency: 'PKR',
        organizationId: mockOrgId,
      });

      const test = await service.createTest(
        mockOrgId,
        {
          categoryId: 'cat-1',
          testCode: 'CBC',
          testName: 'Complete Blood Count',
          price: 1200,
          turnaroundMinutes: 180,
          sampleType: 'Blood',
          currency: 'PKR',
          resultType: 'NUMERIC',
        },
        mockActorId,
      );

      expect(test.testCode).toBe('CBC');
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'TEST', action: 'CREATED' }),
      );
    });

    it('should reject test creation if testCode already exists in organization', async () => {
      mockPrisma.laboratoryTestCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.laboratoryTest.findUnique.mockResolvedValue({ id: 'existing-test', testCode: 'CBC' });

      await expect(
        service.createTest(
          mockOrgId,
          {
            categoryId: 'cat-1',
            testCode: 'CBC',
            testName: 'Duplicate Test',
            price: 500,
            turnaroundMinutes: 60,
            sampleType: 'Blood',
            currency: 'PKR',
            resultType: 'NUMERIC',
          },
          mockActorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject test creation if category does not exist', async () => {
      mockPrisma.laboratoryTestCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.createTest(
          mockOrgId,
          {
            categoryId: 'non-existent-cat',
            testCode: 'LFT',
            testName: 'Liver Function Test',
            price: 2500,
            turnaroundMinutes: 240,
            sampleType: 'Serum',
            currency: 'PKR',
            resultType: 'NUMERIC',
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Diagnostic Packages / Panels', () => {
    it('should create a package linking its member tests atomically', async () => {
      mockPrisma.laboratoryPackage.findUnique
        .mockResolvedValueOnce(null) // Uniqueness check
        .mockResolvedValueOnce({
          id: 'pkg-1',
          code: 'LIPID-PANEL',
          name: 'Lipid Profile',
          price: 2200,
          items: [{ test: { id: 't1' } }, { test: { id: 't2' } }],
        });

      mockPrisma.laboratoryTest.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      mockPrisma.laboratoryPackage.create.mockResolvedValue({ id: 'pkg-1' });

      const pkg = await service.createPackage(
        mockOrgId,
        {
          name: 'Lipid Profile',
          code: 'LIPID-PANEL',
          price: 2200,
          testIds: ['t1', 't2'],
        },
        mockActorId,
      );

      expect(pkg).toBeDefined();
      expect(mockPrisma.laboratoryPackageItem.createMany).toHaveBeenCalledWith({
        data: [
          { packageId: 'pkg-1', testId: 't1' },
          { packageId: 'pkg-1', testId: 't2' },
        ],
      });
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'PACKAGE', action: 'CREATED' }),
      );
    });
  });
});
