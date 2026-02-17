/**
 * Email Storage Service
 * Handles storing and managing received emails
 * Can be upgraded to use a real database (Prisma, MongoDB, etc.)
 */

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  timestamp: Date;
  status: 'unread' | 'read' | 'replied' | 'archived';
  category?: 'support' | 'sales' | 'enterprise' | 'feedback' | 'general';
  isEnterprise?: boolean;
  companySize?: number;
  aiSummary?: string;
  aiRecommendation?: string;
  requiresHuman?: boolean;
}

// In-memory storage (for now - upgrade to database later)
const emailStorage = new Map<string, ReceivedEmail>();

/**
 * Store a received email
 */
export async function storeEmail(email: Omit<ReceivedEmail, 'id' | 'timestamp' | 'status'>): Promise<ReceivedEmail> {
  const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const storedEmail: ReceivedEmail = {
    ...email,
    id,
    timestamp: new Date(),
    status: 'unread',
  };
  
  emailStorage.set(id, storedEmail);
  return storedEmail;
}

/**
 * Get all stored emails with optional filtering
 */
export async function getEmails(filters?: {
  status?: ReceivedEmail['status'];
  category?: ReceivedEmail['category'];
  isEnterprise?: boolean;
}): Promise<ReceivedEmail[]> {
  let emails = Array.from(emailStorage.values());
  
  if (filters?.status) {
    emails = emails.filter(e => e.status === filters.status);
  }
  if (filters?.category) {
    emails = emails.filter(e => e.category === filters.category);
  }
  if (filters?.isEnterprise !== undefined) {
    emails = emails.filter(e => e.isEnterprise === filters.isEnterprise);
  }
  
  // Sort by timestamp, newest first
  return emails.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get a single email by ID
 */
export async function getEmail(id: string): Promise<ReceivedEmail | null> {
  return emailStorage.get(id) || null;
}

/**
 * Update email status
 */
export async function updateEmailStatus(id: string, status: ReceivedEmail['status']): Promise<ReceivedEmail | null> {
  const email = emailStorage.get(id);
  if (!email) return null;
  
  email.status = status;
  emailStorage.set(id, email);
  return email;
}

/**
 * Update email with AI analysis
 */
export async function updateEmailAnalysis(
  id: string,
  analysis: {
    category?: ReceivedEmail['category'];
    isEnterprise?: boolean;
    companySize?: number;
    aiSummary?: string;
    aiRecommendation?: string;
    requiresHuman?: boolean;
  }
): Promise<ReceivedEmail | null> {
  const email = emailStorage.get(id);
  if (!email) return null;
  
  Object.assign(email, analysis);
  emailStorage.set(id, email);
  return email;
}

/**
 * Delete an email
 */
export async function deleteEmail(id: string): Promise<boolean> {
  return emailStorage.delete(id);
}

/**
 * Get unread count
 */
export async function getUnreadCount(): Promise<number> {
  return Array.from(emailStorage.values()).filter(e => e.status === 'unread').length;
}

/**
 * Get enterprise queries (companies with >999 users)
 */
export async function getEnterpriseQueries(): Promise<ReceivedEmail[]> {
  const emails = Array.from(emailStorage.values());
  return emails.filter(e => e.isEnterprise || (e.companySize && e.companySize > 999));
}
