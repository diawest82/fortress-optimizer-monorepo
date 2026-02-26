// SEO automation tools
// File: src/lib/automation/seo.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate SEO checklist for a page
 */
export async function generateSeoChecklist(slug: string) {
  const checklist = {
    technical: {
      hasMetaDescription: false,
      hasOgImage: false,
      hasKeywords: false,
      hasSitemap: true,
      hasRobotsTxt: true,
    },
    content: {
      minWordCount: 300,
      hasHeadings: false,
      hasInternalLinks: false,
    },
    performance: {
      coreWebVitals: {},
      pageSpeed: 0,
    },
  };

  return checklist;
}

/**
 * Validate SEO metadata for a blog post
 */
export async function validateBlogPostSeo(postId: string) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
  });

  if (!post) return null;

  const issues = [];

  if (!post.metaDescription || post.metaDescription.length < 120) {
    issues.push('Meta description is missing or too short (min 120 chars)');
  }

  if (!post.ogImage) {
    issues.push('OG image is missing');
  }

  if (!post.keywords || post.keywords.length === 0) {
    issues.push('No keywords defined');
  }

  if (post.content.length < 300) {
    issues.push('Content is too short (min 300 words)');
  }

  return {
    postId,
    isValid: issues.length === 0,
    issues,
    score: Math.max(0, 100 - issues.length * 20),
  };
}

/**
 * Generate XML sitemap
 */
export async function generateSitemap() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  const baseUrl = 'https://www.fortress-optimizer.com';
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'weekly' },
    { url: '/dashboard', priority: 0.9, changefreq: 'daily' },
    { url: '/pricing', priority: 0.8, changefreq: 'monthly' },
    { url: '/install', priority: 0.8, changefreq: 'monthly' },
  ];

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static pages
  for (const page of staticPages) {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += '  </url>\n';
  }

  // Add blog posts
  for (const post of posts) {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
    sitemap += `    <lastmod>${post.updatedAt.toISOString()}</lastmod>\n`;
    sitemap += '    <changefreq>weekly</changefreq>\n';
    sitemap += '    <priority>0.7</priority>\n';
    sitemap += '  </url>\n';
  }

  sitemap += '</urlset>';

  return sitemap;
}

/**
 * Calculate keyword density
 */
export function calculateKeywordDensity(content: string, keyword: string): number {
  const words = content.toLowerCase().split(/\s+/);
  const keywordCount = words.filter(w => w === keyword.toLowerCase()).length;
  return (keywordCount / words.length) * 100;
}

/**
 * Suggest keywords based on content
 */
export async function suggestKeywords(content: string, limit = 5) {
  // This would ideally use an NLP library or API
  // For now, return common high-frequency words
  const words = content
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4);

  const frequency: Record<string, number> = {};
  words.forEach(w => {
    frequency[w] = (frequency[w] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt() {
  return `# Allow all robots
User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/private/
Disallow: /_next/
Disallow: /api/auth/

# Sitemap
Sitemap: https://www.fortress-optimizer.com/sitemap.xml

# Crawl delay
Crawl-delay: 1

# Search engines
User-agent: Googlebot
Crawl-delay: 0
Allow: /

User-agent: Bingbot
Crawl-delay: 1
Allow: /`;
}
