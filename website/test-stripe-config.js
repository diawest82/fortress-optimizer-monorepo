/**
 * Comprehensive Stripe Configuration Test Suite
 * Tests all aspects of Stripe integration
 */

const Stripe = require('stripe');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, status = 'info') {
  const timestamp = new Date().toISOString();
  const colors_map = {
    error: colors.red,
    success: colors.green,
    warning: colors.yellow,
    info: colors.blue,
  };
  const color = colors_map[status] || colors.blue;
  console.log(`${color}[${status.toUpperCase()}]${colors.reset} ${timestamp} - ${message}`);
}

async function testStripeConfiguration() {
  log('Starting Stripe Configuration Test Suite', 'info');
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Environment Variables
  log('Test 1: Checking environment variables...', 'info');
  const envVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_PRODUCT_ID_INDIVIDUAL: process.env.STRIPE_PRODUCT_ID_INDIVIDUAL,
    STRIPE_PRODUCT_ID_TEAMS: process.env.STRIPE_PRODUCT_ID_TEAMS,
    STRIPE_PRODUCT_ID_ENTERPRISE: process.env.STRIPE_PRODUCT_ID_ENTERPRISE,
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      log(`  ❌ ${key} is not set`, 'error');
      results.failed++;
      results.tests.push({ name: `Env: ${key}`, status: 'FAILED', message: 'Not set' });
    } else {
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      log(`  ✓ ${key} = ${masked}`, 'success');
      results.passed++;
      results.tests.push({ name: `Env: ${key}`, status: 'PASSED' });
    }
  }

  // Test 2: Stripe Connection
  console.log('');
  log('Test 2: Testing Stripe API connection...', 'info');
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });

    const account = await stripe.account.retrieve();
    log(`  ✓ Connected to Stripe account: ${account.email}`, 'success');
    log(`  ✓ Account type: ${account.type}`, 'success');
    results.passed++;
    results.tests.push({ name: 'Stripe Connection', status: 'PASSED' });
  } catch (error) {
    log(`  ❌ Stripe connection failed: ${error.message}`, 'error');
    results.failed++;
    results.tests.push({
      name: 'Stripe Connection',
      status: 'FAILED',
      message: error.message,
    });
  }

  // Test 3: Product Verification
  console.log('');
  log('Test 3: Verifying Stripe products...', 'info');
  const productIds = {
    individual: process.env.STRIPE_PRODUCT_ID_INDIVIDUAL,
    teams: process.env.STRIPE_PRODUCT_ID_TEAMS,
    enterprise: process.env.STRIPE_PRODUCT_ID_ENTERPRISE,
  };

  try {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    for (const [tier, productId] of Object.entries(productIds)) {
      try {
        const product = await stripe.products.retrieve(productId);
        log(
          `  ✓ ${tier.toUpperCase()} product found: ${product.name} (${product.id})`,
          'success'
        );

        // Check for prices
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
        });

        if (prices.data.length > 0) {
          const price = prices.data[0];
          const amount = price.unit_amount / 100;
          log(
            `    ✓ Price found: $${amount} ${price.currency.toUpperCase()} ${price.recurring?.interval || 'one-time'}`,
            'success'
          );
        } else {
          log(`    ⚠ No active prices found for this product`, 'warning');
        }

        results.passed++;
        results.tests.push({
          name: `Product: ${tier}`,
          status: 'PASSED',
          productId,
        });
      } catch (error) {
        log(`  ❌ ${tier.toUpperCase()} product error: ${error.message}`, 'error');
        results.failed++;
        results.tests.push({
          name: `Product: ${tier}`,
          status: 'FAILED',
          message: error.message,
        });
      }
    }
  } catch (error) {
    log(`  ❌ Product verification failed: ${error.message}`, 'error');
    results.failed++;
  }

  // Test 4: Database Connection
  console.log('');
  log('Test 4: Testing database connection...', 'info');
  try {
    const userCount = await prisma.user.count();
    log(`  ✓ Database connected. Total users: ${userCount}`, 'success');
    results.passed++;
    results.tests.push({ name: 'Database Connection', status: 'PASSED' });

    // Check test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });
    if (testUser) {
      log(`  ✓ Test user found: ${testUser.email} (ID: ${testUser.id})`, 'success');
      log(`    - Tier: ${testUser.tier}`, 'info');
      log(`    - Stripe Customer ID: ${testUser.stripeCustomerId || 'Not set'}`, 'info');
    } else {
      log(`  ⚠ Test user not found`, 'warning');
    }
  } catch (error) {
    log(`  ❌ Database connection failed: ${error.message}`, 'error');
    results.failed++;
    results.tests.push({
      name: 'Database Connection',
      status: 'FAILED',
      message: error.message,
    });
  }

  // Test 5: Simulate Checkout Flow
  console.log('');
  log('Test 5: Simulating checkout flow...', 'info');
  try {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const productId = process.env.STRIPE_PRODUCT_ID_INDIVIDUAL;
    if (!productId) throw new Error('Product ID not configured');

    // Get or create price
    let prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    let priceId = prices.data[0]?.id;

    if (!priceId) {
      log('  Creating price for checkout...', 'info');
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: 999, // $9.99
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });
      priceId = price.id;
    }

    // Create test session
    const session = await stripe.checkout.sessions.create({
      customer_email: 'test@example.com',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
      metadata: {
        userId: 'test-user-123',
        tier: 'individual',
      },
    });

    log(`  ✓ Checkout session created: ${session.id}`, 'success');
    log(`    - URL: ${session.url}`, 'info');
    results.passed++;
    results.tests.push({
      name: 'Checkout Session',
      status: 'PASSED',
      sessionId: session.id,
    });
  } catch (error) {
    log(`  ❌ Checkout flow failed: ${error.message}`, 'error');
    results.failed++;
    results.tests.push({
      name: 'Checkout Session',
      status: 'FAILED',
      message: error.message,
    });
  }

  // Summary
  console.log('');
  console.log('═'.repeat(60));
  log('Test Summary', 'info');
  console.log('═'.repeat(60));
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  console.log('');
  console.log('Detailed Results:');
  results.tests.forEach((test) => {
    const statusColor = test.status === 'PASSED' ? 'success' : 'error';
    log(
      `  ${test.name.padEnd(30)} ${test.status}${test.message ? ` - ${test.message}` : ''}`,
      statusColor
    );
  });

  console.log('');
  if (results.failed === 0) {
    log('✓ All tests passed!', 'success');
  } else {
    log(`✗ ${results.failed} test(s) failed`, 'error');
  }

  await prisma.$disconnect();
  process.exit(results.failed > 0 ? 1 : 0);
}

testStripeConfiguration().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
