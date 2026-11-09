import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateClinicFaqInput, QueryClinicFaqsInput, UpdateClinicFaqInput } from '@matabai/validation';

@Injectable()
export class AiFaqService {
  constructor(private readonly prisma: PrismaService) {}

  async createFaq(organizationId: string, input: CreateClinicFaqInput, userId?: string) {
    return this.prisma.clinicFaq.create({
      data: {
        organizationId,
        clinicId: input.clinicId || null,
        questionEn: input.questionEn,
        answerEn: input.answerEn,
        questionUr: input.questionUr || null,
        answerUr: input.answerUr || null,
        questionPs: input.questionPs || null,
        answerPs: input.answerPs || null,
        category: input.category || 'GENERAL',
        isActive: input.isActive ?? true,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });
  }

  async updateFaq(organizationId: string, id: string, input: UpdateClinicFaqInput, userId?: string) {
    const existing = await this.prisma.clinicFaq.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`FAQ entry not found with ID ${id}`);
    }

    return this.prisma.clinicFaq.update({
      where: { id },
      data: {
        ...(input.clinicId !== undefined ? { clinicId: input.clinicId } : {}),
        ...(input.questionEn !== undefined ? { questionEn: input.questionEn } : {}),
        ...(input.answerEn !== undefined ? { answerEn: input.answerEn } : {}),
        ...(input.questionUr !== undefined ? { questionUr: input.questionUr } : {}),
        ...(input.answerUr !== undefined ? { answerUr: input.answerUr } : {}),
        ...(input.questionPs !== undefined ? { questionPs: input.questionPs } : {}),
        ...(input.answerPs !== undefined ? { answerPs: input.answerPs } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedBy: userId || null,
      },
    });
  }

  async deleteFaq(organizationId: string, id: string) {
    const existing = await this.prisma.clinicFaq.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`FAQ entry not found with ID ${id}`);
    }

    await this.prisma.clinicFaq.delete({
      where: { id },
    });

    return { success: true, message: 'FAQ entry deleted successfully' };
  }

  async getFaq(organizationId: string, id: string) {
    const faq = await this.prisma.clinicFaq.findFirst({
      where: { id, organizationId },
    });

    if (!faq) {
      throw new NotFoundException(`FAQ entry not found with ID ${id}`);
    }

    return faq;
  }

  async listFaqs(organizationId: string, query: QueryClinicFaqsInput) {
    const { clinicId, category, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (category) {
      where.category = category;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { questionEn: { contains: term, mode: 'insensitive' } },
        { answerEn: { contains: term, mode: 'insensitive' } },
        { questionUr: { contains: term, mode: 'insensitive' } },
        { answerUr: { contains: term, mode: 'insensitive' } },
        { questionPs: { contains: term, mode: 'insensitive' } },
        { answerPs: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.clinicFaq.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinicFaq.count({ where }),
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
