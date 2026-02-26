import axios, { AxiosInstance } from 'axios';

export class AnthropicProvider {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Count tokens using Anthropic's API
   * Claude provides native token counting via the API
   */
  async countTokens(text: string, model: string = 'claude-3-sonnet-20240229'): Promise<number> {
    try {
      const response = await this.client.post('/messages/count_tokens', {
        model: model,
        messages: [{ role: 'user', content: text }]
      });

      if (response.data.input_tokens) {
        return response.data.input_tokens;
      }

      return Math.ceil(text.length / 4);
    } catch (error: any) {
      console.error('Anthropic token counting error:', error.message);
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * List available Claude models
   */
  async listModels(): Promise<string[]> {
    // Anthropic doesn't expose a models endpoint, return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.post('/messages/count_tokens', {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cost estimate for input and output tokens
   */
  getCostEstimate(inputTokens: number, outputTokens: number, model: string = 'claude-3-sonnet-20240229'): number {
    // Pricing as of Feb 2026
    const pricingMap: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
      'claude-3-sonnet-20240229': { input: 0.003 / 1000, output: 0.015 / 1000 },
      'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 }
    };

    const pricing = pricingMap[model] || pricingMap['claude-3-sonnet-20240229'];
    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }
}
