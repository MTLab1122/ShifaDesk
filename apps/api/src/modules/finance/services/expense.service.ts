import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAuditService } from './financial-audit.service';
import {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  QueryExpensesInput,
} from '@matabai/validation';
import { ExpenseStatus } from '@matabai/shared';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FinancialAuditService,
  ) {}

  /**
   * Generates sequential unique expense reference: EXP-YYYYMM-XXXX
   */
  public async generateExpenseReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `EXP-${yearMonth}-`;

    const count = await this.prisma.expense.count({
      where: {
        organizationId,
        expenseReference: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Seed standard clinic operating expense categories if none exist for organization.
   */
  public async seedDefaultCategoriesIfEmpty(organizationId: string): Promise<void> {
    const count = await this.prisma.expenseCategory.count({ where: { organizationId } });
    if (count > 0) return;

    const defaults = [
      { name: 'Clinic Rent & Facility', code: 'RENT', description: 'Facility lease and rental payments' },
      { name: 'Utilities & Power', code: 'UTILITIES', description: 'Electricity, gas, backup generator fuel, water' },
      { name: 'Medical & Diagnostic Supplies', code: 'SUPPLIES', description: 'Syringes, reagents, gloves, PPE, strips' },
      { name: 'Staff Salaries & Stipends', code: 'PAYROLL', description: 'Receptionist, phlebotomist, and support staff compensation' },
      { name: 'Equipment Maintenance', code: 'MAINTENANCE', description: 'Analyzer calibrations, autoclave service, repairs' },
      { name: 'IT, Software & Telephony', code: 'TECH', description: 'Internet, WhatsApp API, Twilio carrier minutes, cloud hosting' },
      { name: 'General & Administrative', code: 'GENERAL', description: 'Office supplies, cleaning, refreshments, security' },
    ];

    for (const cat of defaults) {
      await this.prisma.expenseCategory.create({
        data: {
          organizationId,
          name: cat.name,
          code: cat.code,
          description: cat.description,
          active: true,
        },
      });
    }

    this.logger.log(`Seeded ${defaults.length} default expense categories for organization ${organizationId}`);
  }

  /**
   * List expense categories.
   */
  public async listCategories(organizationId: string) {
    await this.seedDefaultCategoriesIfEmpty(organizationId);
    return this.prisma.expenseCategory.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create custom category.
   */
  public async createCategory(organizationId: string, data: CreateExpenseCategoryInput) {
    return this.prisma.expenseCategory.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description || null,
        active: true,
      },
    });
  }

  /**
   * Create a new clinic expense record.
   */
  public async createExpense(
    organizationId: string,
    data: CreateExpenseInput,
    actorId: string,
  ) {
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: data.clinicId, organizationId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${data.clinicId} not found`);
    }

    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: data.categoryId, organizationId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${data.categoryId} not found`);
    }

    const expenseReference = await this.generateExpenseReference(organizationId);
    const expenseDate = new Date(data.expenseDate);

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        clinicId: data.clinicId,
        categoryId: data.categoryId,
        expenseReference,
        description: data.description,
        amountMinor: data.amountMinor,
        currency: data.currency || 'PKR',
        paymentMethod: data.paymentMethod || 'CASH',
        vendor: data.vendor || null,
        referenceNumber: data.referenceNumber || null,
        expenseDate,
        status: ExpenseStatus.APPROVED, // Direct clinic operating expense logged by authorized staff
        createdById: actorId,
        approvedById: actorId,
        notes: data.notes || null,
      },
      include: {
        category: true,
        clinic: true,
      },
    });

    // If paid by CASH, record in active cash register session
    if (expense.paymentMethod === 'CASH') {
      const activeCashSession = await this.prisma.cashRegisterSession.findFirst({
        where: {
          clinicId: data.clinicId,
          status: 'OPEN',
        },
      });

      if (activeCashSession) {
        await this.prisma.cashRegisterTransaction.create({
          data: {
            sessionId: activeCashSession.id,
            transactionType: 'CASH_EXPENSE',
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            amountMinor: -expense.amountMinor,
            recordedById: actorId,
            notes: `Cash expense: ${expense.description} (${category.name})`,
          },
        });

        await this.prisma.cashRegisterSession.update({
          where: { id: activeCashSession.id },
          data: {
            expectedClosingMinor: activeCashSession.expectedClosingMinor - expense.amountMinor,
          },
        });
      }
    }

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: data.clinicId,
      actorId,
      entityType: 'EXPENSE',
      entityId: expense.id,
      action: 'CREATED',
      newValues: {
        expenseReference: expense.expenseReference,
        amountMinor: expense.amountMinor,
        paymentMethod: expense.paymentMethod,
        category: category.name,
      },
    });

    return expense;
  }

  /**
   * Update draft expense.
   */
  public async updateExpense(
    organizationId: string,
    expenseId: string,
    data: UpdateExpenseInput,
    actorId: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organizationId },
    });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    if (expense.status === ExpenseStatus.PAID) {
      throw new BadRequestException('Cannot modify an already PAID expense record');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: data.description,
        amountMinor: data.amountMinor,
        paymentMethod: data.paymentMethod,
        vendor: data.vendor,
        referenceNumber: data.referenceNumber,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
        notes: data.notes,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: expense.clinicId,
      actorId,
      entityType: 'EXPENSE',
      entityId: expenseId,
      action: 'EXPENSE_APPROVED',
      previousValues: { amountMinor: expense.amountMinor, description: expense.description },
      newValues: { amountMinor: updated.amountMinor, description: updated.description },
    });

    return updated;
  }

  /**
   * Paginated list of expenses with filters.
   */
  public async queryExpenses(organizationId: string, query: QueryExpensesInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) where.expenseDate.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          category: true,
          clinic: true,
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
