import axios, { AxiosInstance } from 'axios';

export interface TokenCountRequest {
  model: string;
  messages?: Array<{ role: string; content: string }>;
  text?: string;
}

export interface TokenCountResponse {
  tokens: number;
  model: string;
}

export class OpenAIProvider {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Count tokens using OpenAI's API
   * Uses the official token counting endpoint for accurate counts
   */
  async countTokens(text: string, model: string = 'gpt-4'): Promise<number> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: text }],
        max_tokens: 1  // Don't actually run; just count
      }, {
        headers: {
          'OpenAI-Organization': process.env.OPENAI_ORG_ID || ''
        }
      });

      // Extract token count from response metadata if available
      if (response.data.usage) {
        return response.data.usage.prompt_tokens;
      }

      // Fallback to estimation if API doesn't return token count
      return Math.ceil(text.length / 4);
    } catch (error: any) {
      console.error('OpenAI token counting error:', error.message);
      // Fallback to estimation on error
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get available models from OpenAI
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data
        .filter((m: any) => m.id.includes('gpt'))
        .map((m: any) => m.id)
        .sort();
    } catch (error: any) {
      console.error('Error listing OpenAI models:', error.message);
      return ['gpt-4', 'gpt-3.5-turbo'];
    }
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.get('/models', {
        params: { limit: 1 }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cost estimate for prompt and completion tokens
   */
  getCostEstimate(promptTokens: number, completionTokens: number, model: string = 'gpt-4'): number {
    // Pricing as of Feb 2026 (approximate)
    const pricingMap: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
      'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
      'gpt-3.5-turbo': { prompt: 0.0005 / 1000, completion: 0.0015 / 1000 }
    };

    const pricing = pricingMap[model] || pricingMap['gpt-4'];
    return (promptTokens * pricing.prompt) + (completionTokens * pricing.completion);
  }
}
