/**
 * API Client for Fortress Backend
 * Handles all HTTP communication with the Next.js backend
 */

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

interface ApiError {
  detail?: string;
  error?: string;
  status?: number;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private apiKey: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadCredentials();
  }

  private loadCredentials() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.apiKey = localStorage.getItem('api_key');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('api_key', key);
    }
  }

  clearCredentials() {
    this.token = null;
    this.apiKey = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('api_key');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.detail || error.error || `API Error: ${response.status}`);
    }

    return data as T;
  }

  // Authentication Endpoints
  async signup(email: string, password: string): Promise<{ api_key: string; user_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<{ api_key: string; user_id: string }>(response);
    this.setApiKey(data.api_key);
    return data;
  }

  async login(email: string, password: string): Promise<{ token: string; user_id?: string; user?: any }> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<{ token: string; user?: any }>(response);
    this.setToken(data.token);
    return {
      token: data.token,
      user_id: data.user?.id,
      user: data.user,
    };
  }

  // TODO: Implement /api/auth/change-password endpoint
  // async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  //   const response = await fetch(`${this.baseUrl}/api/auth/change-password`, { ... });
  // }

  // ============ EMAIL MANAGEMENT ENDPOINTS ============
  async getEmails(options?: { status?: string; category?: string; limit?: number }): Promise<any> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${this.baseUrl}/api/emails${queryString}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async getEmail(emailId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/emails/${emailId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async replyToEmail(emailId: string, replyText: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/emails/${emailId}/replies`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text: replyText }),
    });
    return this.handleResponse<any>(response);
  }

  async getEnterpriseEmails(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/emails/enterprise`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // ============ ADMIN ENDPOINTS ============
  async getAdminKPIs(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/admin/kpis`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // ============ TODO: User Profile Endpoints (NOT YET IMPLEMENTED) ============
  // These need to be created:
  // - POST /api/users/profile - Create/update profile
  // - GET /api/users/profile - Get current user profile
  // - DELETE /api/users/profile - Delete user account
  
  // async getProfile(): Promise<any> {
  //   const response = await fetch(`${this.baseUrl}/api/users/profile`, {
  //     method: 'GET',
  //     headers: this.getHeaders(),
  //   });
  //   return this.handleResponse<any>(response);
  // }

  // async updateProfile(data: any): Promise<any> {
  //   const response = await fetch(`${this.baseUrl}/api/users/profile`, {
  //     method: 'PUT',
  //     headers: this.getHeaders(),
  //     body: JSON.stringify(data),
  //   });
  //   return this.handleResponse<any>(response);
  // }

  // ============ TODO: API Key Management (NOT YET IMPLEMENTED) ============
  // These need to be created:
  // - POST /api/api-keys - Generate new key
  // - GET /api/api-keys - List all keys
  // - DELETE /api/api-keys/[id] - Delete key
  
  // async generateApiKey(): Promise<{ api_key: string }> {
  //   const response = await fetch(`${this.baseUrl}/api/api-keys`, {
  //     method: 'POST',
  //     headers: this.getHeaders(),
  //   });
  //   const data = await this.handleResponse<{ api_key: string }>(response);
  //   this.setApiKey(data.api_key);
  //   return data;
  // }

  // async listApiKeys(): Promise<{ keys: any[] }> {
  //   const response = await fetch(`${this.baseUrl}/api/api-keys`, {
  //     method: 'GET',
  //     headers: this.getHeaders(),
  //   });
  //   return this.handleResponse<{ keys: any[] }>(response);
  // }

  // async deleteApiKey(keyId: string): Promise<{ message: string }> {
  //   const response = await fetch(`${this.baseUrl}/api/api-keys/${keyId}`, {
  //     method: 'DELETE',
  //     headers: this.getHeaders(),
  //   });
  //   return this.handleResponse<{ message: string }>(response);
  // }

  // ============ TODO: Subscription Management (NOT YET IMPLEMENTED) ============
  // These need to be created:
  // - GET /api/subscriptions - Get current subscription
  // - POST /api/subscriptions/upgrade - Upgrade tier
  // - POST /api/subscriptions/downgrade - Downgrade tier
  // - POST /api/subscriptions/cancel - Cancel subscription
  
  // async getCurrentSubscription(): Promise<any> { ... }
  // async upgradeTier(newTier: string): Promise<any> { ... }
  // async downgradeTier(): Promise<any> { ... }
  // async cancelSubscription(): Promise<any> { ... }

  // ============ TODO: Optimization Engine (NOT YET IMPLEMENTED) ============
  // async optimize(text: string, provider: string, model: string): Promise<any> { ... }

  // ============ TODO: Pricing API (NOT YET IMPLEMENTED) ============
  // async getPricing(): Promise<any> { ... }

  // Health Check
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/health`, {
      method: 'GET',
    });
    return this.handleResponse<any>(response);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
