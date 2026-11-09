import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { PrismaService } from '../../common/database/prisma.service';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly inboundService: WhatsAppInboundService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Meta Webhook Verification Endpoint (hub verification handshake)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    const configuredToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode !== 'subscribe') {
      this.logger.warn(`Rejected webhook verification with mode: ${mode}`);
      throw new ForbiddenException('Invalid hub.mode');
    }

    let isValid = false;

    // Check against global env verify token
    if (configuredToken && token === configuredToken) {
      isValid = true;
    } else {
      // Check if any clinic integration has this verify token configured
      const matchingIntegration = await this.prisma.whatsappIntegration.findFirst({
        where: { webhookVerifyToken: token },
      });
      if (matchingIntegration) {
        isValid = true;
        // Mark webhook verified
        await this.prisma.whatsappIntegration.update({
          where: { id: matchingIntegration.id },
          data: { isWebhookVerified: true, status: 'CONNECTED', lastConnectedAt: new Date() },
        });
      }
    }

    if (!isValid) {
      this.logger.warn(`Verification token mismatch. Received: ${token}`);
      throw new ForbiddenException('Webhook verification token mismatch');
    }

    this.logger.log('Meta WhatsApp webhook verification successful');
    return challenge;
  }

  /**
   * Meta Webhook Event Ingestion Endpoint (messages, statuses, delivery updates)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: any,
    @Req() req: Request,
  ) {
    const appSecret = process.env.META_APP_SECRET;

    // Verify HMAC-SHA256 signature if appSecret is configured
    if (appSecret) {
      if (!signature) {
        this.logger.warn('Received webhook request missing X-Hub-Signature-256 header');
        throw new ForbiddenException('Missing X-Hub-Signature-256 header');
      }

      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(payload));
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')}`;

      try {
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          this.logger.warn('X-Hub-Signature-256 validation failed');
          throw new ForbiddenException('Invalid webhook signature');
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
        this.logger.warn(`Signature verification error: ${err.message}`);
        throw new ForbiddenException('Signature verification failed');
      }
    }

    // Generate unique eventId for deduplication
    const messageId =
      payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
      payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id ||
      payload?.entry?.[0]?.id;

    const eventId = messageId
      ? `evt_${messageId}`
      : `evt_${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;

    // Process asynchronously or synchronously and return 200 OK immediately to Meta
    try {
      await this.inboundService.processWebhookEvent(payload, eventId);
    } catch (err: any) {
      this.logger.error(`Error processing webhook event ${eventId}: ${err.message}`);
      // Meta requires 200 OK even if business processing fails, so it doesn't storm retries indefinitely
    }

    return { status: 'EVENT_RECEIVED' };
  }
}

