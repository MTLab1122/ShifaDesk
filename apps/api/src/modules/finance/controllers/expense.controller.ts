import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { ExpenseService } from '../services/expense.service';
import {
  createExpenseSchema,
  updateExpenseSchema,
  createExpenseCategorySchema,
  queryExpensesSchema,
} from '@matabai/validation';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get('expense-categories')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.expenseService.listCategories(user.organizationId!);
  }

  @Post('expense-categories')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = createExpenseCategorySchema.parse(body);
    return this.expenseService.createCategory(user.organizationId!, validated);
  }

  @Get('expenses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async queryExpenses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryExpensesSchema.parse(query);
    return this.expenseService.queryExpenses(user.organizationId!, validated);
  }

  @Post('expenses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = createExpenseSchema.parse(body);
    return this.expenseService.createExpense(user.organizationId!, validated, user.id);
  }

  @Patch('expenses/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async updateExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = updateExpenseSchema.parse(body);
    return this.expenseService.updateExpense(user.organizationId!, id, validated, user.id);
  }
}
