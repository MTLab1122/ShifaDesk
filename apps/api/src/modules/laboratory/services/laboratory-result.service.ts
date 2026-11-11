import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { LaboratoryAuditService } from './laboratory-audit.service';
import {
  EnterLabResultInput,
  AmendLabResultInput,
  ReviewLabResultInput,
} from '@matabai/validation';
import { LabResultStatus, LabOrderStatus, ReviewDecision, UserRole } from '@matabai/shared';

@Injectable()
export class LaboratoryResultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: LaboratoryAuditService,
  ) {}

  /**
   * Enter test result for an order line item
   */
  public async enterResult(
    organizationId: string,
    orderItemId: string,
    input: EnterLabResultInput,
    actorId: string,
  ) {
    const orderItem = await this.prisma.laboratoryOrderItem.findFirst({
      where: { id: orderItemId },
      include: {
        order: true,
        test: true,
        result: true,
      },
    });

    if (!orderItem || orderItem.order.organizationId !== organizationId) {
      throw new NotFoundException('Laboratory order item not found');
    }

    if (orderItem.result) {
      throw new ConflictException(
        'Result has already been recorded for this test item. Use the amendment workflow to update existing values.',
      );
    }

    if (orderItem.order.orderStatus === 'CANCELLED') {
      throw new BadRequestException('Cannot enter results for a cancelled order');
    }

    const unit = input.unit ?? orderItem.test.unit;
    const referenceRange = input.referenceRange ?? orderItem.test.referenceRange;

    const result = await this.prisma.$transaction(async (tx) => {
      const createdResult = await tx.laboratoryResult.create({
        data: {
          organizationId,
          clinicId: orderItem.order.clinicId,
          orderItemId: orderItem.id,
          resultType: input.resultType || orderItem.test.resultType || 'NUMERIC',
          resultValue: input.resultValue,
          unit: unit || null,
          referenceRange: referenceRange || null,
          resultNotes: input.resultNotes || null,
          resultStatus: LabResultStatus.ENTERED,
          enteredById: actorId,
        },
        include: {
          enteredBy: { select: { id: true, fullName: true } },
          orderItem: { include: { test: true } },
        },
      });

      // Update line item status
      await tx.laboratoryOrderItem.update({
        where: { id: orderItem.id },
        data: { status: 'COMPLETED' },
      });

      // Check if all items in this order now have entered results
      const totalItems = await tx.laboratoryOrderItem.count({
        where: { orderId: orderItem.orderId },
      });
      const enteredResultsCount = await tx.laboratoryResult.count({
        where: { orderItem: { orderId: orderItem.orderId } },
      });

      if (enteredResultsCount >= totalItems) {
        await tx.laboratoryOrder.update({
          where: { id: orderItem.orderId },
          data: { orderStatus: LabOrderStatus.UNDER_REVIEW },
        });
      } else {
        await tx.laboratoryOrder.update({
          where: { id: orderItem.orderId },
          data: { orderStatus: LabOrderStatus.PROCESSING },
        });
      }

      return createdResult;
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: orderItem.order.clinicId,
      actorId,
      entityType: 'RESULT',
      entityId: result.id,
      action: 'RESULT_ENTERED',
      newValues: {
        orderItemId,
        resultValue: input.resultValue,
        unit,
        referenceRange,
      },
    });

    return result;
  }

  /**
   * Amend already entered result with mandatory justification
   */
  public async amendResult(
    organizationId: string,
    resultId: string,
    input: AmendLabResultInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryResult.findFirst({
      where: { id: resultId, organizationId },
      include: {
        orderItem: {
          include: {
            order: {
              include: { reports: true },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Diagnostic result not found');
    }

    const previousValues = {
      resultValue: existing.resultValue,
      unit: existing.unit,
      referenceRange: existing.referenceRange,
      resultStatus: existing.resultStatus,
      resultNotes: existing.resultNotes,
    };

    const updated = await this.prisma.laboratoryResult.update({
      where: { id: resultId },
      data: {
        resultValue: input.resultValue,
        unit: input.unit !== undefined ? input.unit : existing.unit,
        referenceRange:
          input.referenceRange !== undefined ? input.referenceRange : existing.referenceRange,
        resultNotes: input.resultNotes !== undefined ? input.resultNotes : existing.resultNotes,
        amendedReason: input.amendedReason,
        resultStatus: LabResultStatus.AMENDED,
      },
      include: {
        enteredBy: { select: { id: true, fullName: true } },
        orderItem: { include: { test: true } },
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: existing.clinicId,
      actorId,
      entityType: 'RESULT',
      entityId: resultId,
      action: 'RESULT_AMENDED',
      previousValues,
      newValues: {
        resultValue: updated.resultValue,
        amendedReason: input.amendedReason,
        resultStatus: updated.resultStatus,
      },
    });

    return updated;
  }

  /**
   * Reviewer evaluation with separation of duties enforcement
   */
  public async reviewResult(
    organizationId: string,
    resultId: string,
    input: ReviewLabResultInput,
    reviewerId: string,
    reviewerRole: UserRole | string,
  ) {
    const result = await this.prisma.laboratoryResult.findFirst({
      where: { id: resultId, organizationId },
      include: {
        orderItem: {
          include: { order: true },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Diagnostic result not found');
    }

    // Separation of duties policy:
    // Technician who entered the result cannot self-approve their own result,
    // unless acting as SUPER_ADMIN. A distinct reviewer or CLINIC_ADMIN / LAB_MANAGER / LAB_REVIEWER is required.
    if (result.enteredById === reviewerId && reviewerRole !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'Separation of duties violation: The technician who entered this result cannot approve their own result. Independent review is required.',
      );
    }

    const review = await this.prisma.$transaction(async (tx) => {
      // Create review ledger entry
      const createdReview = await tx.laboratoryResultReview.create({
        data: {
          resultId,
          reviewerId,
          decision: input.decision,
          comments: input.comments || null,
        },
        include: {
          reviewer: { select: { id: true, fullName: true } },
        },
      });

      // Update result status based on decision
      const newResultStatus =
        input.decision === ReviewDecision.APPROVED
          ? LabResultStatus.APPROVED
          : LabResultStatus.REJECTED;

      await tx.laboratoryResult.update({
        where: { id: resultId },
        data: { resultStatus: newResultStatus },
      });

      // If approved, check if all items in this order are now approved
      if (input.decision === ReviewDecision.APPROVED) {
        const orderId = result.orderItem.orderId;
        const totalItems = await tx.laboratoryOrderItem.count({
          where: { orderId },
        });

        const approvedResultsCount = await tx.laboratoryResult.count({
          where: {
            orderItem: { orderId },
            resultStatus: LabResultStatus.APPROVED,
          },
        });

        if (approvedResultsCount >= totalItems) {
          await tx.laboratoryOrder.update({
            where: { id: orderId },
            data: { orderStatus: LabOrderStatus.APPROVED },
          });
        }
      }

      return createdReview;
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: result.clinicId,
      actorId: reviewerId,
      entityType: 'RESULT',
      entityId: resultId,
      action: 'REVIEWED',
      newValues: {
        decision: input.decision,
        comments: input.comments,
      },
    });

    return review;
  }

  /**
   * Get all results for an order
   */
  public async getOrderResults(organizationId: string, orderId: string) {
    const order = await this.prisma.laboratoryOrder.findFirst({
      where: { id: orderId, organizationId },
      include: {
        items: {
          include: {
            test: {
              include: { category: true },
            },
            result: {
              include: {
                enteredBy: { select: { id: true, fullName: true } },
                reviews: {
                  include: {
                    reviewer: { select: { id: true, fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Laboratory order not found');
    }

    return order.items.map((item) => ({
      orderItemId: item.id,
      testName: item.testNameSnapshot,
      testCode: item.testCodeSnapshot,
      price: item.priceSnapshot,
      result: item.result,
    }));
  }
}
