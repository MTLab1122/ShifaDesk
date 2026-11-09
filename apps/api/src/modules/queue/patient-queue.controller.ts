import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { PrismaService } from '../../common/database/prisma.service';
import { QueueTokenStatus } from '@matabai/shared';

@Controller('patient/tokens')
@UseGuards(JwtAuthGuard)
export class PatientQueueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMyTokens(@CurrentUser() user: AuthenticatedUser) {
    // Find patient record linked to current authenticated user
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    if (!patient) {
      return { data: [] };
    }

    const tokens = await this.prisma.queueToken.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        queueSession: {
          include: {
            clinic: { select: { id: true, name: true, phone: true } },
            doctor: { select: { id: true, fullName: true, specialty: true } },
            queueSettings: { select: { queueName: true, tokenPrefix: true } },
          },
        },
      },
    });

    return { data: tokens };
  }

  @Get(':id')
  async getMyTokenById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    const token = await this.prisma.queueToken.findUnique({
      where: { id },
      include: {
        queueSession: {
          include: {
            clinic: { select: { id: true, name: true, phone: true } },
            doctor: { select: { id: true, fullName: true, specialty: true } },
            queueSettings: { select: { queueName: true, tokenPrefix: true, estimatedConsultationMinutes: true } },
          },
        },
      },
    });

    if (!token || (patient && token.patientId !== patient.id)) {
      throw new NotFoundException(`Token ${id} not found`);
    }

    // Get current serving/called token in this session
    const currentActiveToken = await this.prisma.queueToken.findFirst({
      where: {
        queueSessionId: token.queueSessionId,
        status: { in: [QueueTokenStatus.CALLED, QueueTokenStatus.SERVING] },
      },
      select: {
        tokenNumber: true,
        tokenDisplay: true,
        status: true,
      },
    });

    // Count how many patients ahead
    const patientsAhead =
      token.status === QueueTokenStatus.WAITING
        ? await this.prisma.queueToken.count({
            where: {
              queueSessionId: token.queueSessionId,
              status: QueueTokenStatus.WAITING,
              queuePosition: { lt: token.queuePosition },
            },
          })
        : 0;

    return {
      ...token,
      currentActiveToken: currentActiveToken || null,
      patientsAhead,
    };
  }
}
