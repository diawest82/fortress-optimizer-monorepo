# Email Receiving System Documentation

## Overview

The email receiving system allows you to:
1. **Receive emails** via webhook from email services
2. **AI-powered analysis** that categorizes and evaluates emails
3. **Enterprise detection** for companies with >999 users
4. **View and manage** emails through an admin dashboard

## Key Features

### 1. Email Reception
- **Webhook Endpoint**: `/api/webhook/email`
- Receives incoming emails from Resend, Mailgun, SendGrid, or any email service
- Automatically stores and analyzes emails

### 2. AI-Powered Analysis
The system analyzes each email for:

#### Categorization
- **Support**: Help, problems, issues, bugs, errors
- **Sales**: Pricing, quotes, plans, upgrades, purchases
- **Enterprise**: Custom integrations, scaling, compliance
- **Feedback**: Suggestions, feature requests, improvements
- **General**: Everything else

#### Enterprise Detection
Automatically identifies companies with >999 users by detecting:
- Direct mentions of employee/user counts (e.g., "5000+ employees")
- Enterprise keywords (compliance, SLA, custom contracts)
- Company size indicators (Fortune 500, etc.)

#### Smart Recommendations
- **Enterprise queries** → Route to enterprise sales
- **Complex support issues** → Escalate to specialists
- **Sales inquiries** → Forward to sales team
- **Feedback** → Log to product roadmap
- **Simple questions** → Self-serve resources

### 3. REST API

#### List Emails
```bash
GET /api/emails
GET /api/emails?status=unread
GET /api/emails?status=read
GET /api/emails?category=support
GET /api/emails?isEnterprise=true
```

#### View Single Email
```bash
GET /api/emails/{id}
```

#### Update Email Status
```bash
PATCH /api/emails/{id}
Content-Type: application/json

{
  "status": "read|replied|archived"
}
```

#### Enterprise Queries
```bash
GET /api/emails/enterprise
```

#### Get Unread Count
```bash
GET /api/emails/stats/unread
```

### 4. Admin Dashboard
Access at `/admin/emails`

Features:
- **Inbox view** with email list
- **Filtering**: All, Unread, Enterprise
- **Quick stats**: Total emails, unread, requiring action, enterprise
- **Detail panel**: Full email content with AI analysis
- **Actions**: Mark as read, archive
- **Visual indicators**: 
  - 🏢 = Enterprise
  - ❓ = Support
  - 💼 = Sales
  - 💡 = Feedback
  - 🚩 = Requires human review

## How to Use

### 1. Set Up Email Webhook
Configure your email service to send incoming emails to:
```
https://your-domain.com/api/webhook/email
```

**Expected payload:**
```json
{
  "from": "customer@example.com",
  "to": "support@fortress-optimizer.com",
  "subject": "Question about pricing",
  "text": "Hi, I wanted to ask...",
  "html": "<p>Hi, I wanted to ask...</p>"
}
```

### 2. Monitor Inbox
Visit `/admin/emails` to:
- See all incoming emails
- Review AI analysis and recommendations
- Filter by category or enterprise status
- Identify which emails need human attention

### 3. Take Action
For emails requiring your services:
- **Enterprise queries** → Contact customer for custom proposal
- **Sales questions** → Send pricing and plan info
- **Support issues** → Provide technical assistance
- **Feedback** → Thank user and log for product team

## AI Decision Logic

### Auto-Response Capability (Coming Soon)
These emails can be auto-handled by AI:
- ✅ General inquiries (FAQ answers)
- ✅ Simple pricing questions
- ✅ Basic technical troubleshooting
- ❌ Enterprise deals (always human)
- ❌ Complex technical issues
- ❌ Complaints

### Human Review Required
The system flags for human review if:
- Enterprise query detected
- Complex support issue (>500 chars)
- Sales inquiry received
- Custom/special request
- Customer complaint

## Storage

**Current**: In-memory storage (session-based)
**Upgrade path**: PostgreSQL/MongoDB with Prisma ORM

To upgrade to persistent storage:
1. Install Prisma: `npm install @prisma/client`
2. Define schema in `prisma/schema.prisma`
3. Replace in-memory functions with database calls
4. Run migrations

Example schema:
```prisma
model Email {
  id        String    @id @default(cuid())
  from      String
  to        String
  subject   String
  body      String
  html      String?
  status    String    @default("unread")
  category  String?
  isEnterprise Boolean @default(false)
  companySize Int?
  aiSummary String?
  aiRecommendation String?
  requiresHuman Boolean @default(false)
  timestamp DateTime  @default(now())
}
```

## Customization

### Add Custom Categories
Edit `src/lib/email-processing.ts` function `categorizeEmail()`:
```typescript
function categorizeEmail(email: { subject: string; body: string }): ReceivedEmail['category'] {
  const content = `${email.subject} ${email.body}`.toLowerCase();
  
  // Add your patterns
  if (/\b(pattern1|pattern2)\b/i.test(content)) {
    return 'custom-category';
  }
  
  // ... rest
}
```

### Adjust Enterprise Detection Threshold
Edit in `src/lib/email-processing.ts`:
```typescript
// Change from > 999 to your threshold
if (size > 999) {  // ← Change this number
  isEnterprise = true;
}
```

### Modify Recommendations
Edit the `generateRecommendation()` function to customize what advice is shown for each category.

## Examples

### Example 1: Enterprise Sales Inquiry
```
From: john@bigcorp.com
Subject: Fortress implementation for 5000 developers

Email Analysis:
- Category: Enterprise ✓
- Is Enterprise: Yes ✓ (5000 developers mentioned)
- Company Size: 5000
- Requires Human: Yes
- Recommendation: 📌 ENTERPRISE QUERY: Route to sales team for custom proposal
```

### Example 2: Simple Support Question
```
From: user@smallcompany.com
Subject: How do I install?

Email Analysis:
- Category: Support
- Is Enterprise: No
- Requires Human: No
- Recommendation: 📚 Check FAQ and documentation. Provide self-serve resources.
```

### Example 3: Enterprise Support Issue
```
From: support-team@enterprise.com
Subject: We have 2500+ users and experiencing performance issues

Email Analysis:
- Category: Support ✓
- Is Enterprise: Yes ✓ (2500+ users)
- Company Size: 2500
- Requires Human: Yes
- Recommendation: 👤 Complex enterprise support - assign to specialist team
```

## Security Considerations

- ✅ Webhook signature verification (optional - add based on your service)
- ✅ Email validation before storage
- ✅ No sensitive data logged
- ❌ Consider adding authentication to `/admin/emails`
- ❌ Consider adding rate limiting to webhook

## Future Enhancements

1. **Database persistence** - Replace in-memory storage
2. **Auto-responses** - AI-generated replies for simple queries
3. **Email templates** - Pre-built response templates
4. **Sentiment analysis** - Detect angry/happy customers
5. **Slack integration** - Notify team of urgent emails
6. **Email forwarding** - Route emails to team members
7. **Analytics** - Track response times and resolution rates
8. **Custom workflows** - Define rules for auto-handling

## Troubleshooting

**Emails not arriving?**
- Check webhook URL is correct
- Verify email service is configured
- Check server logs at `/tmp/dev.log`

**Enterprise detection not working?**
- Verify email content includes company size
- Check patterns in `detectEnterpriseQuery()`
- Review matched signals in email response

**Dashboard not loading?**
- Ensure `/admin/emails` page is accessible
- Check browser console for API errors
- Verify API endpoints are responding
