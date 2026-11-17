import {
  Controller,
  Post,
  Headers,
  Body,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { RaastPaymentAdapter } from '../adapters/raast-payment.adapter';
import { CardPaymentAdapter } from '../adapters/card-payment.adapter';

@Controller('webhooks/payments')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly raastAdapter: RaastPaymentAdapter,
    private readonly cardAdapter: CardPaymentAdapter,
  ) {}

  @Post('raast')
  @HttpCode(HttpStatus.OK)
  async handleRaastWebhook(
    @Headers('x-raast-signature') signature: string,
    @Body() payload: any,
  ) {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (this.raastAdapter.getStatus().isConfigured) {
      const isValid = this.raastAdapter.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        this.logger.warn('Rejected invalid Raast webhook signature');
        throw new UnauthorizedException('Invalid Raast webhook signature');
      }
    }

    const eventId = payload.eventId || payload.id || `raast-${Date.now()}`;
    const eventType = payload.eventType || payload.type || 'P2M_PAYMENT_CONFIRMED';

    // Duplicate event check
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: 'RAAST_SBP',
          providerEventId: eventId,
        },
      },
    });

    if (existing) {
      this.logger.log(`Ignoring duplicate Raast webhook event: ${eventId}`);
      return { status: 'duplicate_ignored' };
    }

    await this.prisma.paymentWebhookEvent.create({
      data: {
        provider: 'RAAST_SBP',
        providerEventId: eventId,
        eventType,
        payloadMetadata: payload,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Processed Raast webhook event: ${eventId} (${eventType})`);
    return { status: 'processed' };
  }

  @Post('card')
  @HttpCode(HttpStatus.OK)
  async handleCardWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Body() payload: any,
  ) {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (this.cardAdapter.getStatus().isConfigured) {
      const isValid = this.cardAdapter.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        this.logger.warn('Rejected invalid card gateway webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const eventId = payload.eventId || payload.id || `card-${Date.now()}`;
    const eventType = payload.eventType || payload.type || 'CHARGE_CAPTURED';

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: this.cardAdapter.getStatus().provider,
          providerEventId: eventId,
        },
      },
    });

    if (existing) {
      this.logger.log(`Ignoring duplicate card webhook event: ${eventId}`);
      return { status: 'duplicate_ignored' };
    }

    await this.prisma.paymentWebhookEvent.create({
      data: {
        provider: this.cardAdapter.getStatus().provider,
        providerEventId: eventId,
        eventType,
        payloadMetadata: payload,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Processed card webhook event: ${eventId} (${eventType})`);
    return { status: 'processed' };
  }
}
