import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface AiCompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
  provider: string;
}

@Injectable()
export class AiProviderClient {
  private readonly logger = new Logger(AiProviderClient.name);

  constructor(private readonly configService: AiConfigService) { }

  /**
   * Execute chat completion with timeouts, retry backoff, and token usage measurement
   */
  async generateCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<AiCompletionResponse> {
    const config = this.configService.getConfig();
    const startTime = Date.now();

    // 1. If no external API key is provided, return grounded fallback response
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      this.logger.debug('No AI_API_KEY configured; using grounded offline heuristic processor.');
      const userMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';
      return {
        content: userMessage,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startTime,
        model: config.model,
        provider: 'offline_rule_engine',
      };
    }

    const endpoint =
      process.env.AI_ENDPOINT ||
      (config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions');

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: options?.temperature ?? config.temperature,
            max_tokens: options?.maxTokens ?? config.maxOutputTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          const latencyMs = Date.now() - startTime;
          const choice = data?.choices?.[0]?.message?.content || '';
          const usage = data?.usage || {};

          return {
            content: choice.trim(),
            inputTokens: usage.prompt_tokens || 0,
            outputTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            latencyMs,
            model: data?.model || config.model,
            provider: config.provider,
          };
        }

        const errorBody: any = await response.json().catch(() => ({}));
        this.logger.warn(`AI Provider returned HTTP ${response.status}: ${JSON.stringify(errorBody)}`);

        // Retry rate limits (429) or server errors (5xx)
        if ((response.status === 429 || response.status >= 500) && attempt <= maxRetries) {
          const delay = attempt * 1000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new HttpException(
          errorBody?.error?.message || 'AI service provider error',
          response.status,
        );
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          this.logger.error(`AI Provider request timed out after ${config.requestTimeoutMs}ms`);
          throw new HttpException('AI service request timed out', HttpStatus.GATEWAY_TIMEOUT);
        }
        if (err instanceof HttpException) throw err;
        if (attempt > maxRetries) {
          this.logger.error(`AI Provider failed after ${maxRetries} attempts: ${err.message}`);
          throw new HttpException('AI service currently unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        }
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    throw new HttpException('AI service unavailable after retries', HttpStatus.SERVICE_UNAVAILABLE);
  }
}
