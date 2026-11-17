import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface CardCheckoutInitiationResult {
  status: 'PENDING' | 'BLOCKED';
  paymentReference: string;
  checkoutUrl?: string;
  blockedReason?: string;
}

@Injectable()
export class CardPaymentAdapter {
  private readonly logger = new Logger(CardPaymentAdapter.name);
  private readonly providerName: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly isConfigured: boolean;

  constructor() {
    this.providerName = process.env.CARD_GATEWAY_PROVIDER || 'SAFEPAY'; // Safepay, PayMob, Stripe
    this.apiKey = process.env.CARD_GATEWAY_API_KEY || '';
    this.webhookSecret = process.env.CARD_GATEWAY_WEBHOOK_SECRET || '';

    this.isConfigured = Boolean(this.apiKey && this.webhookSecret);

    if (!this.isConfigured) {
      this.logger.warn(
        `Card payment adapter (${this.providerName}) is running in UNCONFIGURED mode. Online card processing is BLOCKED.`,
      );
    } else {
      this.logger.log(`Card payment adapter initialized with provider: ${this.providerName}`);
    }
  }

  public getStatus(): { isConfigured: boolean; provider: string } {
    return {
      isConfigured: this.isConfigured,
      provider: this.providerName,
    };
  }

  public initiateCheckout(
    paymentReference: string,
    amountMinor: number,
    currency: string = 'PKR',
    redirectUrl?: string,
  ): CardCheckoutInitiationResult {
    if (!this.isConfigured) {
      return {
        status: 'BLOCKED',
        paymentReference,
        blockedReason: `Card payment processor (${this.providerName}) is not configured. Real merchant API keys and webhook secret must be supplied.`,
      };
    }

    return {
      status: 'PENDING',
      paymentReference,
      checkoutUrl: `https://checkout.${this.providerName.toLowerCase()}.pk/pay?ref=${paymentReference}&amt=${amountMinor}&curr=${currency}&ret=${encodeURIComponent(redirectUrl || '')}`,
    };
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.webhookSecret || !signatureHeader) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const computed = hmac.update(rawBody).digest('hex');
      const sigBuf = Buffer.from(signatureHeader, 'hex');
      const compBuf = Buffer.from(computed, 'hex');

      if (sigBuf.length !== compBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuf, compBuf);
    } catch (err: any) {
      this.logger.error(`Card webhook signature verification error: ${err.message}`);
      return false;
    }
  }
}
