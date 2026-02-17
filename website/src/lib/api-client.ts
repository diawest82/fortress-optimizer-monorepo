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

  // Change Password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return this.handleResponse<{ message: string }>(response);
  }

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
  async getProfile(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/users/profile`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async updateProfile(data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/users/profile`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  // ============ API Key Management ============
  async generateApiKey(name: string): Promise<{ id: string; apiKey: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/api-keys`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await this.handleResponse<{ id: string; apiKey: string; message: string }>(response);
    return data;
  }

  async listApiKeys(): Promise<{ keys: any[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/api/api-keys`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ keys: any[]; count: number }>(response);
  }

  async deleteApiKey(keyId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // ============ Subscription Management ============
  async getCurrentSubscription(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/subscriptions`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async upgradeTier(newTier: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newTier }),
    });
    return this.handleResponse<any>(response);
  }

  async downgradeTier(newTier: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/subscriptions/downgrade`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newTier }),
    });
    return this.handleResponse<any>(response);
  }

  async cancelSubscription(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // ============ Optimization Engine ============
  async optimize(text: string, provider: string, model: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/optimize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text, provider, model }),
    });
    return this.handleResponse<any>(response);
  }

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
