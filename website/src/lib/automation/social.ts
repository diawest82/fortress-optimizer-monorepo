// Social media automation
// File: src/lib/automation/social.ts

/**
 * Generate UTM parameters for a URL
 */
export function generateUtmParams(
  source: string,
  medium: string,
  campaign: string,
  content?: string
): Record<string, string> {
  return {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    ...(content && { utm_content: content }),
  };
}

/**
 * Add UTM parameters to a URL
 */
export function addUtmToUrl(baseUrl: string, utmParams: Record<string, string>): string {
  const url = new URL(baseUrl);
  Object.entries(utmParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

/**
 * Generate Twitter post templates
 */
export function generateTwitterTemplates() {
  return [
    {
      name: 'Token Savings Highlight',
      template: 'Just saved {{percentage}}% on token costs with @FortressOpt! 🚀 From {{before}} tokens to {{after}} tokens on this prompt. Your AI bills will thank you.',
    },
    {
      name: 'Feature Announcement',
      template: 'Exciting news! Fortress now works with {{platform}}. Optimize your {{platform}} prompts and save {{percentage}}% on tokens. Try it free today →',
    },
    {
      name: 'Engagement Question',
      template: 'Question: What\'s your biggest pain point with AI token costs? Drop a comment below 👇 Fortress can help reduce them by up to 20%.',
    },
    {
      name: 'Quote/Insight',
      template: '"Most teams waste 30% of their AI budget on unoptimized prompts." - That\'s why we built Fortress. Cut your token costs by 20% automatically.',
    },
    {
      name: 'Social Proof',
      template: '{{user}} just saved {{savings}} with Fortress! 🎉 "I didn\'t think optimizing prompts could be this easy." - {{testimonial}}',
    },
  ];
}

/**
 * Generate LinkedIn post templates
 */
export function generateLinkedInTemplates() {
  return [
    {
      name: 'Enterprise Value',
      template: 'Enterprise teams are finding that unoptimized AI prompts cost 30% more than necessary. Fortress automatically optimizes prompts across npm, Copilot, VS Code, Slack, and Claude Desktop. Result: 20% cost reduction, 68ms faster responses.',
    },
    {
      name: 'Industry Insight',
      template: 'The future of AI cost management isn\'t manual optimization—it\'s automation. Token compression, latency reduction, and quality preservation all in one platform.',
    },
    {
      name: 'Case Study Teaser',
      template: 'How {{company}} reduced their monthly AI spend by {{amount}} while improving response quality. See how →',
    },
  ];
}

/**
 * Generate Dev.to post templates
 */
export function generateDevtoTemplates() {
  return [
    {
      name: 'How-To Guide',
      template: `# How to Reduce Your LLM Token Costs by 20%

Prompt optimization doesn't have to be manual. Learn how Fortress automatically compresses your prompts across npm, Copilot, VS Code, Slack, and Claude Desktop.

## The Problem
Token costs are the second-largest expense in AI development, often wasted on redundant prompt text.

## The Solution
Fortress uses intelligent compression to eliminate unnecessary tokens while preserving quality.

## Results
- 20% token cost reduction
- 68ms latency improvement
- No API changes needed

[Try it free →]`,
    },
    {
      name: 'Tutorial',
      template: `# Getting Started with Fortress: Token Optimization in 5 Minutes

This tutorial walks you through setting up Fortress with your favorite tools...`,
    },
  ];
}

/**
 * Calculate best times to post
 */
export function getBestPostTimes(): Record<string, string[]> {
  return {
    twitter: ['9:00 AM', '12:00 PM', '5:00 PM'],
    linkedin: ['8:00 AM', '12:00 PM', '5:00 PM'],
    'dev.to': ['10:00 AM'],
    reddit: ['10:00 AM', '3:00 PM'],
  };
}

/**
 * Social media calendar
 */
export function generateSocialCalendar() {
  return [
    {
      date: 'Monday',
      twitter: 'Motivation: How to reduce token costs',
      linkedin: 'Industry insight',
      devto: null,
    },
    {
      date: 'Tuesday',
      twitter: 'Feature highlight',
      linkedin: null,
      devto: 'Tutorial or how-to',
    },
    {
      date: 'Wednesday',
      twitter: 'Question/engagement',
      linkedin: 'Case study',
      devto: null,
    },
    {
      date: 'Thursday',
      twitter: 'User testimonial',
      linkedin: null,
      devto: null,
    },
    {
      date: 'Friday',
      twitter: 'Wins & achievements',
      linkedin: 'Thought leadership',
      devto: null,
    },
  ];
}
