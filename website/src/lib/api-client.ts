/**
 * API Client for Fortress Backend
 * Handles all HTTP communication with the Next.js backend.
 *
 * Response shapes mirror the actual route handlers in src/app/api/.
 * Keep these in sync when route response payloads change. Adding a real
 * type here is much better than `any` because it catches drift between
 * client and server at compile time.
 */

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

interface ApiError {
  detail?: string;
  error?: string;
  status?: number;
}

// ─── Response shape interfaces ──────────────────────────────────────────

export interface UserSummary {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
}

export interface UserProfile extends UserSummary {
  createdAt?: string;
  // Legacy snake_case + dashboard convenience fields. The Prisma User model
  // uses createdAt/tier; some response shapes also include them as
  // created_at/tier for client-side convenience. Keep both supported.
  created_at?: string;
  tier?: string;
}

export interface LoginResponse {
  user_id?: string;
  user?: UserSummary;
}

export interface SignupResponse {
  api_key: string;
  user_id: string;
}

export interface MessageResponse {
  message: string;
}

export interface EmailReply {
  id: string;
  status: 'draft' | 'sent' | 'scheduled';
  createdAt: string;
  user?: { id: string; name?: string | null; email: string } | null;
}

export interface EmailRecord {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string | null;
  timestamp: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  category?: string | null;
  isEnterprise: boolean;
  companySize?: number | null;
  aiSummary?: string | null;
  aiRecommendation?: string | null;
  requiresHuman: boolean;
  replies?: EmailReply[];
}

export interface EmailListResponse {
  success: boolean;
  count: number;
  emails: EmailRecord[];
}

export interface AdminKpiResponse {
  totalUsers?: number;
  recentSignups?: number;
  openTickets?: number;
  enterpriseInquiries?: number;
  totalOptimizations?: number;
  tokensSaved?: number;
  tokensProcessed?: number;
  visitorAcquisitions?: number;
  serviceInterruptions?: number;
  packagesInstalled?: number;
  lastUpdated: string;
  isCached?: boolean;
  isFallback?: boolean;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  masked?: string;
  createdAt?: string;
  lastUsedAt?: string | null;
}

export interface ApiKeyListResponse {
  keys: ApiKeySummary[];
  count: number;
}

export interface SubscriptionResponse {
  id?: string;
  tier: string;
  status: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  features?: string[];
  stripeCustomerId?: string | null;
  // Legacy / dashboard convenience fields populated by some response shapes
  tokens_used?: number;
  tokens_limit?: number;
  tokens_saved?: number;
  next_billing_date?: string;
}

export interface CheckoutResponse {
  message?: string;
  tier?: string;
  status?: string;
  renewalDate?: string;
  url?: string;
  sessionId?: string;
}

export interface OptimizeResponse {
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved?: number;
  savingsPercent: number;
  optimizedText: string;
  provider?: string;
  model?: string;
  timestamp?: string;
}

export interface PricingTierConfig {
  tokens_per_month: number | string;
  price_monthly: number | string;
  max_seats?: number | string;
  features?: string[];
  pricing_scale?: Record<string, { base?: number; per_seat: number }>;
}

export interface PricingResponse {
  tiers: Record<string, PricingTierConfig>;
  currency: string;
  billing_cycle: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'ok';
  timestamp: string;
  version?: string;
  database?: string;
  redis?: string;
  sentry?: string;
}

export interface ProfileUpdatePayload {
  name?: string;
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
    // Auth tokens are now in httpOnly cookies only — not stored in localStorage
    // API keys are still in localStorage for SDK usage (not auth tokens)
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('api_key');
    }
  }

  setToken(_token: string) {
    // No-op: auth tokens are now cookie-only (set by login API response)
    // This method kept for backward compatibility but does not store locally
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

    // CSRF: read token from cookie and send in header (double-submit pattern)
    if (typeof document !== 'undefined') {
      const csrfMatch = document.cookie.match(/fortress_csrf_token=([^;]+)/);
      if (csrfMatch) {
        headers['X-CSRF-Token'] = csrfMatch[1];
      }
    }

    return headers;
  }

  /**
   * All API requests go through this wrapper.
   * Always includes credentials: 'include' so httpOnly cookies are sent.
   */
  private async request(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: { ...this.getHeaders(), ...(options.headers as Record<string, string> || {}) },
    });
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      // Global 401 handler — session expired or invalid
      if (response.status === 401 && typeof window !== 'undefined') {
        // Only redirect to login from protected pages — never from public pages
        const path = window.location.pathname;
        const protectedPrefixes = ['/account', '/dashboard'];
        const isProtectedPage = protectedPrefixes.some(p => path.startsWith(p));
        if (isProtectedPage) {
          this.clearCredentials();
          document.cookie = 'fortress_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(path)}`;
          throw new Error('Session expired — redirecting to login');
        }
      }

      const error = data as ApiError;
      throw new Error(error.detail || error.error || `API Error: ${response.status}`);
    }

    return data as T;
  }

  // Authentication Endpoints
  async signup(email: string, password: string, name?: string): Promise<SignupResponse> {
    const response = await this.request(`${this.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, name: name || email.split('@')[0] }),
    });
    const data = await this.handleResponse<SignupResponse>(response);
    this.setApiKey(data.api_key);
    return data;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<{ user?: UserSummary }>(response);
    // Token is now in httpOnly cookie only — not stored in localStorage
    return {
      user_id: data.user?.id,
      user: data.user,
    };
  }

  // Change Password
  async changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
    const response = await this.request(`${this.baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return this.handleResponse<MessageResponse>(response);
  }

  // ============ EMAIL MANAGEMENT ENDPOINTS (admin-only) ============
  async getEmails(options?: { status?: string; category?: string; limit?: number }): Promise<EmailListResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request(`${this.baseUrl}/api/emails${queryString}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<EmailListResponse>(response);
  }

  async getEmail(emailId: string): Promise<{ success: boolean; email: EmailRecord }> {
    const response = await this.request(`${this.baseUrl}/api/emails/${emailId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean; email: EmailRecord }>(response);
  }

  async replyToEmail(emailId: string, replyText: string): Promise<EmailReply> {
    const response = await this.request(`${this.baseUrl}/api/emails/${emailId}/replies`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text: replyText }),
    });
    return this.handleResponse<EmailReply>(response);
  }

  async getEnterpriseEmails(): Promise<EmailListResponse> {
    const response = await this.request(`${this.baseUrl}/api/emails/enterprise`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<EmailListResponse>(response);
  }

  // ============ ADMIN ENDPOINTS ============
  async getAdminKPIs(): Promise<AdminKpiResponse> {
    const response = await this.request(`${this.baseUrl}/api/admin/kpis`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminKpiResponse>(response);
  }

  // ============ User Profile Endpoints ============
  async getProfile(): Promise<UserProfile> {
    const response = await this.request(`${this.baseUrl}/api/users/profile`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<UserProfile>(response);
  }

  async updateProfile(data: ProfileUpdatePayload): Promise<UserProfile> {
    const response = await this.request(`${this.baseUrl}/api/users/profile`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse<UserProfile>(response);
  }

  // ============ API Key Management ============
  async generateApiKey(name: string): Promise<{ id: string; apiKey: string; message: string }> {
    const response = await this.request(`${this.baseUrl}/api/api-keys`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await this.handleResponse<{ id: string; apiKey: string; message: string }>(response);
    return data;
  }

  async listApiKeys(): Promise<ApiKeyListResponse> {
    const response = await this.request(`${this.baseUrl}/api/api-keys`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<ApiKeyListResponse>(response);
  }

  async deleteApiKey(keyId: string): Promise<MessageResponse> {
    const response = await this.request(`${this.baseUrl}/api/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<MessageResponse>(response);
  }

  // ============ Subscription Management ============
  async getCurrentSubscription(): Promise<SubscriptionResponse> {
    const response = await this.request(`${this.baseUrl}/api/subscriptions`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubscriptionResponse>(response);
  }

  async upgradeTier(newTier: string): Promise<CheckoutResponse> {
    const response = await this.request(`${this.baseUrl}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newTier }),
    });
    return this.handleResponse<CheckoutResponse>(response);
  }

  async downgradeTier(newTier: string): Promise<CheckoutResponse> {
    const response = await this.request(`${this.baseUrl}/api/subscriptions/downgrade`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newTier }),
    });
    return this.handleResponse<CheckoutResponse>(response);
  }

  async cancelSubscription(): Promise<CheckoutResponse> {
    const response = await this.request(`${this.baseUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<CheckoutResponse>(response);
  }

  // ============ Optimization Engine ============
  async optimize(text: string, provider: string, model: string): Promise<OptimizeResponse> {
    const response = await this.request(`${this.baseUrl}/api/optimize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text, provider, model }),
    });
    return this.handleResponse<OptimizeResponse>(response);
  }

  // ============ Pricing API ============
  async getPricing(): Promise<PricingResponse> {
    const response = await this.request(`${this.baseUrl}/api/pricing`, {
      method: 'GET',
    });
    return this.handleResponse<PricingResponse>(response);
  }

  // Health Check
  async healthCheck(): Promise<HealthResponse> {
    const response = await this.request(`${this.baseUrl}/api/health`, {
      method: 'GET',
    });
    return this.handleResponse<HealthResponse>(response);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
