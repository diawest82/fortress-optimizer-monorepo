/**
 * API Client for Fortress Token Optimizer Backend
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

class ApiClient {
  private baseURL: string;
  private getAuthToken: () => string | null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.getAuthToken = () => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('auth_token');
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const headersObj: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(typeof options.headers === 'object' ? (options.headers as Record<string, string>) : {}),
    };

    // Add JWT token if available
    if (token) {
      headersObj['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: headersObj,
      });

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('api_key');
          window.location.href = '/auth/login';
        }
        throw {
          message: 'Unauthorized. Please log in again.',
          status: 401,
        } as ApiError;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || `HTTP ${response.status}`,
          status: response.status,
          details: errorData,
        } as ApiError;
      }

      // Return parsed response
      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        throw {
          message: 'Network error. Is the backend running?',
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  async signup(email: string, password: string, name: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'GET',
    });
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  async getProfile() {
    return this.request('/users/profile', {
      method: 'GET',
    });
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  }

  // ============================================================================
  // API KEYS ENDPOINTS
  // ============================================================================

  async getAPIKeys() {
    return this.request('/api-keys', {
      method: 'GET',
    });
  }

  async generateAPIKey(keyName: string) {
    return this.request('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ key_name: keyName }),
    });
  }

  async revokeAPIKey(keyName: string) {
    return this.request(`/api-keys/${keyName}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // USAGE & BILLING ENDPOINTS
  // ============================================================================

  async getUsage() {
    return this.request('/usage', {
      method: 'GET',
    });
  }

  async getSubscription() {
    return this.request('/billing/subscription', {
      method: 'GET',
    });
  }

  async upgradeSubscription(tier: string) {
    return this.request('/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }

  async downgradeSubscription() {
    return this.request('/billing/cancel', {
      method: 'POST',
    });
  }

  async getPricing() {
    return this.request('/pricing', {
      method: 'GET',
    });
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  async getAnalytics() {
    return this.request('/analytics', {
      method: 'GET',
    });
  }

  async getSavingsBands() {
    return this.request('/savings-bands', {
      method: 'GET',
    });
  }

  async getSavingsBandForTier(tier: string) {
    return this.request(`/savings-bands/tier/${tier}`, {
      method: 'GET',
    });
  }

  // ============================================================================
  // OPTIMIZATION ENDPOINTS
  // ============================================================================

  async optimize(prompt: string, provider: string, model: string) {
    return this.request('/optimize', {
      method: 'POST',
      body: JSON.stringify({ prompt, provider, model }),
    });
  }

  async getProviders() {
    return this.request('/providers', {
      method: 'GET',
    });
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck() {
    try {
      return await this.request('/health', {
        method: 'GET',
      });
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export type for API errors
export type { ApiError };
