import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface RaastInitiationResult {
  status: 'PENDING' | 'BLOCKED';
  paymentReference: string;
  qrPayload?: string;
  deepLink?: string;
  instructions?: string;
  blockedReason?: string;
}

export interface RaastVerificationResult {
  verified: boolean;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'BLOCKED';
  providerTransactionId?: string;
  settlementTimestamp?: Date;
  rawResponse?: Record<string, unknown>;
}

@Injectable()
export class RaastPaymentAdapter {
  private readonly logger = new Logger(RaastPaymentAdapter.name);
  private readonly participantCode: string;
  private readonly apiKey: string;
  private readonly merchantIban: string;
  private readonly webhookSecret: string;
  private readonly isConfigured: boolean;

  constructor() {
    this.participantCode = process.env.RAAST_PARTICIPANT_CODE || '';
    this.apiKey = process.env.RAAST_API_KEY || '';
    this.merchantIban = process.env.RAAST_MERCHANT_IBAN || '';
    this.webhookSecret = process.env.RAAST_WEBHOOK_SECRET || '';

    this.isConfigured = Boolean(
      this.participantCode &&
      this.apiKey &&
      this.merchantIban &&
      this.merchantIban.startsWith('PK'),
    );

    if (!this.isConfigured) {
      this.logger.warn(
        'Raast SBP payment adapter is running in UNCONFIGURED mode. Live instant settlement is BLOCKED until official SBP member participant bank credentials are provided.',
      );
    } else {
      this.logger.log(`Raast SBP adapter initialized for member ${this.participantCode}`);
    }
  }

  public getStatus(): { isConfigured: boolean; participantCode?: string; merchantIban?: string } {
    return {
      isConfigured: this.isConfigured,
      participantCode: this.participantCode || undefined,
      merchantIban: this.merchantIban ? `${this.merchantIban.slice(0, 4)}...${this.merchantIban.slice(-4)}` : undefined,
    };
  }

  /**
   * Initiate Raast Person-to-Merchant (P2M) dynamic QR or payment request.
   */
  public initiateP2M(
    paymentReference: string,
    amountMinor: number,
    billReference: string,
  ): RaastInitiationResult {
    if (!this.isConfigured) {
      return {
        status: 'BLOCKED',
        paymentReference,
        blockedReason:
          'State Bank of Pakistan (SBP) Raast gateway is not active. Clinic must register a Raast Merchant ID and IBAN through an authorized Raast participant bank in Pakistan.',
      };
    }

    const amountPkr = (amountMinor / 100).toFixed(2);
    // Standard PKQR EMVCo format payload:
    const qrPayload = `00020101021226500010PK.RAAST.010114${this.participantCode}0224${this.merchantIban}520480995303586540${amountPkr.length.toString().padStart(2, '0')}${amountPkr}5802PK5915MATABAI CLINIC6009ISLAMABAD62${(billReference.length + 4).toString().padStart(2, '0')}01${billReference.length.toString().padStart(2, '0')}${billReference}6304`;

    return {
      status: 'PENDING',
      paymentReference,
      qrPayload,
      deepLink: `raast://pay?iban=${this.merchantIban}&amount=${amountPkr}&ref=${billReference}`,
      instructions: `Scan this PKQR using any Raast-enabled banking app or 1Link mobile application in Pakistan to authorize PKR ${amountPkr}.`,
    };
  }

  /**
   * Verify Raast webhook request signature.
   */
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
      this.logger.error(`Raast signature verification error: ${err.message}`);
      return false;
    }
  }
}
