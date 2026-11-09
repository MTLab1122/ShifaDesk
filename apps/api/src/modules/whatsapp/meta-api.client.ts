import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

export interface MetaMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface MetaPhoneNumberDetails {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  code_verification_status?: string;
  quality_rating?: string;
}

@Injectable()
export class MetaApiClient {
  private readonly logger = new Logger(MetaApiClient.name);
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor() {
    this.baseUrl = (process.env.META_GRAPH_BASE_URL || 'https://graph.facebook.com').replace(/\/$/, '');
    this.apiVersion = process.env.META_API_VERSION || 'v21.0';
  }

  /**
   * Send a free-form text message via WhatsApp Business Cloud API
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<MetaMessageResponse> {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { preview_url: false, body: text },
    };

    return this.postWithRetry<MetaMessageResponse>(phoneNumberId, 'messages', accessToken, payload);
  }

  /**
   * Send a pre-approved template message via WhatsApp Business Cloud API
   */
  async sendTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
    parameters: string[] = [],
  ): Promise<MetaMessageResponse> {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const components: any[] = [];

    if (parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: parameters.map((param) => ({
          type: 'text',
          text: String(param),
        })),
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    return this.postWithRetry<MetaMessageResponse>(phoneNumberId, 'messages', accessToken, payload);
  }

  /**
   * Inspect phone number verification details and status
   */
  async getPhoneNumberDetails(phoneNumberId: string, accessToken: string): Promise<MetaPhoneNumberDetails> {
    const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}?fields=id,verified_name,display_phone_number,code_verification_status,quality_rating`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Meta Graph API returned status ${response.status} for phone verification: ${JSON.stringify(this.sanitizeError(errorData))}`);
        throw new HttpException(
          errorData?.error?.message || 'Failed to verify phone number with Meta Cloud API',
          response.status,
        );
      }

      return (await response.json()) as MetaPhoneNumberDetails;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Failed to reach Meta Graph API: ${err.message}`);
      throw new HttpException('Meta WhatsApp service unreachable', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * HTTP POST with retry backoff for rate limits (429) and transient server errors (5xx)
   */
  private async postWithRetry<T>(
    phoneNumberId: string,
    endpoint: string,
    accessToken: string,
    payload: any,
    maxRetries: number = 3,
  ): Promise<T> {
    const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/${endpoint}`;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const errorBody = await response.json().catch(() => ({}));
        const sanitized = this.sanitizeError(errorBody);

        // Rate limit (429) or Server error (5xx) -> retry with exponential backoff
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 5000);
          this.logger.warn(`Meta API status ${response.status} on attempt ${attempt}. Retrying in ${delayMs.toFixed(0)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        this.logger.error(`Meta API request failed with status ${response.status}: ${JSON.stringify(sanitized)}`);
        const message = errorBody?.error?.message || 'Meta Cloud API error occurred';
        const code = errorBody?.error?.code;

        throw new HttpException(
          {
            statusCode: response.status,
            message: `Meta API Error: ${message}`,
            metaErrorCode: code,
          },
          response.status,
        );
      } catch (err: any) {
        if (err instanceof HttpException) throw err;
        if (attempt >= maxRetries) {
          this.logger.error(`Meta API request timed out or network error after ${attempt} attempts: ${err.message}`);
          throw new HttpException('Meta WhatsApp Cloud API is unreachable', HttpStatus.GATEWAY_TIMEOUT);
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    throw new HttpException('Meta WhatsApp request failed after maximum retries', HttpStatus.SERVICE_UNAVAILABLE);
  }

  /**
   * Mask authorization tokens and credentials from logged errors
   */
  private sanitizeError(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    if (sanitized.access_token) sanitized.access_token = '[REDACTED]';
    if (sanitized.error?.fbtrace_id) delete sanitized.error.fbtrace_id;
    return sanitized;
  }
}
