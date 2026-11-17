import { RaastPaymentAdapter } from './adapters/raast-payment.adapter';
import { CardPaymentAdapter } from './adapters/card-payment.adapter';
import { BankTransferAdapter } from './adapters/bank-transfer.adapter';
import * as crypto from 'crypto';

describe('Payment Gateway Adapters', () => {
  describe('RaastPaymentAdapter', () => {
    it('should return BLOCKED when SBP credentials are not configured', () => {
      const adapter = new RaastPaymentAdapter();
      const status = adapter.getStatus();
      expect(status.isConfigured).toBe(false);

      const result = adapter.initiateP2M('PAY-202611-0001', 150000, 'INV-202611-0001');
      expect(result.status).toBe('BLOCKED');
      expect(result.blockedReason).toContain('State Bank of Pakistan (SBP) Raast gateway is not active');
    });

    it('should verify webhook signature correctly when configured', () => {
      const secret = 'raast-secret-key-12345';
      process.env.RAAST_WEBHOOK_SECRET = secret;

      const adapter = new RaastPaymentAdapter();
      const payload = JSON.stringify({ eventId: 'evt-1', amount: 1000 });
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const isValid = adapter.verifyWebhookSignature(payload, signature);
      expect(isValid).toBe(true);

      const isInvalid = adapter.verifyWebhookSignature(payload, 'wrong-signature-hex');
      expect(isInvalid).toBe(false);

      delete process.env.RAAST_WEBHOOK_SECRET;
    });
  });

  describe('CardPaymentAdapter', () => {
    it('should return BLOCKED when card gateway credentials are not configured', () => {
      const adapter = new CardPaymentAdapter();
      const status = adapter.getStatus();
      expect(status.isConfigured).toBe(false);

      const result = adapter.initiateCheckout('PAY-202611-0001', 250000);
      expect(result.status).toBe('BLOCKED');
      expect(result.blockedReason).toContain('Card payment processor');
    });

    it('should verify webhook signature correctly with timing-safe HMAC check', () => {
      const secret = 'card-webhook-secret-99999';
      process.env.CARD_GATEWAY_WEBHOOK_SECRET = secret;

      const adapter = new CardPaymentAdapter();
      const payload = JSON.stringify({ id: 'evt-card-1', type: 'CHARGE_CAPTURED' });
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const isValid = adapter.verifyWebhookSignature(payload, signature);
      expect(isValid).toBe(true);

      delete process.env.CARD_GATEWAY_WEBHOOK_SECRET;
    });
  });

  describe('BankTransferAdapter', () => {
    it('should provide verified clinic bank transfer instructions with valid IBAN format', () => {
      const adapter = new BankTransferAdapter();
      const details = adapter.getClinicBankDetails();

      expect(details.bankName).toBeDefined();
      expect(details.iban).toBeDefined();
      expect(adapter.validateIban(details.iban)).toBe(true);
      expect(adapter.validateIban('INVALID-IBAN-STRING')).toBe(false);
    });
  });
});
