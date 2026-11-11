import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import * as crypto from 'crypto';
import { CreateVoiceIntegrationInput, UpdateVoiceIntegrationInput } from '@matabai/validation';

@Injectable()
export class VoiceIntegrationService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key-at-least-32-characters-long-matabai';
    this.secretKey = crypto.createHash('sha256').update(secret).digest();
  }

  private encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Creates or updates a voice integration for a clinic
   */
  async createIntegration(organizationId: string, input: CreateVoiceIntegrationInput) {
    const encryptedAuthToken = this.encrypt(input.authToken);

    const existing = await this.prisma.voiceIntegration.findFirst({
      where: { clinicId: input.clinicId },
    });

    const config: any = {
      ...(input.config || {}),
      encryptedAuthToken,
      webhookUrl: input.webhookUrl || null,
      statusCallbackUrl: input.statusCallbackUrl || null,
    };

    if (existing) {
      return this.prisma.voiceIntegration.update({
        where: { id: existing.id },
        data: {
          provider: input.provider,
          providerAccountId: input.accountSid,
          phoneNumber: input.phoneNumber,
          providerConfiguration: config,
          enabled: input.enabled ?? true,
        },
      });
    }

    return this.prisma.voiceIntegration.create({
      data: {
        organizationId,
        clinicId: input.clinicId,
        provider: input.provider,
        providerAccountId: input.accountSid,
        phoneNumber: input.phoneNumber,
        providerConfiguration: config,
        enabled: input.enabled ?? true,
        verificationStatus: 'CONNECTED',
      },
    });
  }

  /**
   * Updates existing voice integration
   */
  async updateIntegration(id: string, input: UpdateVoiceIntegrationInput) {
    const existing = await this.prisma.voiceIntegration.findUnique({
      where: { id },
    });

    const currentConfig = (existing?.providerConfiguration as any) || {};

    if (input.authToken) {
      currentConfig.encryptedAuthToken = this.encrypt(input.authToken);
    }
    if (input.webhookUrl !== undefined) {
      currentConfig.webhookUrl = input.webhookUrl;
    }
    if (input.statusCallbackUrl !== undefined) {
      currentConfig.statusCallbackUrl = input.statusCallbackUrl;
    }

    const data: any = {};
    if (input.provider) data.provider = input.provider;
    if (input.accountSid) data.providerAccountId = input.accountSid;
    if (input.phoneNumber) data.phoneNumber = input.phoneNumber;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.isVerified !== undefined) {
      data.verificationStatus = input.isVerified ? 'CONNECTED' : 'PENDING';
    }
    data.providerConfiguration = currentConfig;

    return this.prisma.voiceIntegration.update({
      where: { id },
      data,
    });
  }

  /**
   * Retrieves voice integration for a clinic
   */
  async getByClinic(clinicId: string) {
    const integration = await this.prisma.voiceIntegration.findFirst({
      where: { clinicId },
    });

    if (!integration) return null;

    const config = (integration.providerConfiguration as any) || {};

    return {
      id: integration.id,
      organizationId: integration.organizationId,
      clinicId: integration.clinicId,
      provider: integration.provider,
      accountSid: integration.providerAccountId,
      phoneNumber: integration.phoneNumber,
      webhookUrl: config.webhookUrl || null,
      statusCallbackUrl: config.statusCallbackUrl || null,
      encryptedAuthToken: '••••••••••••••••',
      isVerified: integration.verificationStatus === 'CONNECTED',
      enabled: integration.enabled,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  }

  /**
   * Checks real telephony provider readiness status
   * Strict Zero Fake Simulation: returns BLOCKED if credentials not supplied
   */
  async getProviderStatus(clinicId: string) {
    const integration = await this.prisma.voiceIntegration.findFirst({
      where: { clinicId },
    });

    const envSid = process.env.TWILIO_ACCOUNT_SID;
    const envToken = process.env.TWILIO_AUTH_TOKEN;
    const envPhone = process.env.TWILIO_PHONE_NUMBER;

    const config = (integration?.providerConfiguration as any) || {};
    const hasDbCreds = Boolean(
      integration?.providerAccountId && config.encryptedAuthToken && integration?.phoneNumber
    );
    const hasEnvCreds = Boolean(envSid && envToken && envPhone);

    if (hasDbCreds || hasEnvCreds) {
      return {
        status: 'READY',
        provider: integration?.provider || 'TWILIO',
        phoneNumber: integration?.phoneNumber || envPhone,
        isVerified: true,
        liveCallTestingBlocked: false,
        message: 'Telephony carrier credentials configured and ready for live calls.',
        regulatoryNotice:
          'Pakistan Telephony Notice: PTA carrier regulations apply for local +92 inbound CLI. Twilio BYOC/SIP Trunking or international inbound DID can be routed.',
      };
    }

    return {
      status: 'BLOCKED',
      provider: 'TWILIO',
      phoneNumber: null,
      isVerified: false,
      liveCallTestingBlocked: true,
      message:
        'Live telephony calls are BLOCKED until real carrier credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are configured in .env or clinic voice integration.',
      regulatoryNotice:
        'Pakistan Telephony Notice: Local +92 numbers require PTA operator registration. For testing, use an international Twilio DID, Twilio SIP Trunking, or the integrated Voice Simulator.',
    };
  }
}
