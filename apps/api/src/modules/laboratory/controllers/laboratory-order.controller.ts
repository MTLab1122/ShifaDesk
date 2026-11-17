import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LaboratoryOrderService } from '../services/laboratory-order.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createLabOrderSchema,
  updateLabOrderSchema,
  cancelLabOrderSchema,
  queryLabOrdersSchema,
  CreateLabOrderInput,
  UpdateLabOrderInput,
  CancelLabOrderInput,
} from '@matabai/validation';

@Controller('laboratory/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratoryOrderController {
  constructor(private readonly orderService: LaboratoryOrderService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async listOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryLabOrdersSchema.parse(query);
    return this.orderService.listOrders(this.getOrgId(user), validated);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getOrderById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.orderService.getOrderById(this.getOrgId(user), id);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLabOrderInput,
  ) {
    const validated = createLabOrderSchema.parse(body);
    return this.orderService.createOrder(this.getOrgId(user), validated, user.id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_STAFF,
  )
  async updateOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateLabOrderInput,
  ) {
    const validated = updateLabOrderSchema.parse(body);
    return this.orderService.updateOrder(this.getOrgId(user), id, validated, user.id);
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.DOCTOR,
  )
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CancelLabOrderInput,
  ) {
    const validated = cancelLabOrderSchema.parse(body);
    return this.orderService.cancelOrder(this.getOrgId(user), id, validated, user.id);
  }
}

