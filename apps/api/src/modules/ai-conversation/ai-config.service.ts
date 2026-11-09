import { Injectable } from '@nestjs/common';

export interface AiProviderConfig {
  provider: string;
  apiKey?: string;
  model: string;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  temperature: number;
}

@Injectable()
export class AiConfigService {
  getConfig(): AiProviderConfig {
    return {
      provider: process.env.AI_PROVIDER || 'openai',
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      maxOutputTokens: process.env.AI_MAX_OUTPUT_TOKENS ? parseInt(process.env.AI_MAX_OUTPUT_TOKENS, 10) : 1000,
      requestTimeoutMs: process.env.AI_REQUEST_TIMEOUT ? parseInt(process.env.AI_REQUEST_TIMEOUT, 10) : 15000,
      temperature: process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : 0.2,
    };
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.apiKey && config.apiKey.trim().length > 0);
  }

  /**
   * Estimated pricing per 1M tokens based on standard public provider tiers
   */
  calculateEstimatedCost(inputTokens: number = 0, outputTokens: number = 0, model: string = 'gpt-4o-mini'): number {
    let inputCostPer1K = 0.00015;
    let outputCostPer1K = 0.0006;

    if (model.includes('gpt-4o') && !model.includes('mini')) {
      inputCostPer1K = 0.0025;
      outputCostPer1K = 0.01;
    } else if (model.includes('gemini-1.5-flash')) {
      inputCostPer1K = 0.000075;
      outputCostPer1K = 0.0003;
    }

    const cost = (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;
    return parseFloat(cost.toFixed(6));
  }

  estimateCost(inputTokens: number = 0, outputTokens: number = 0, model: string = 'gpt-4o-mini'): number {
    return this.calculateEstimatedCost(inputTokens, outputTokens, model);
  }
}
