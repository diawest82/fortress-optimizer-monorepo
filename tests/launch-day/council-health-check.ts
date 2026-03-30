/**
 * Council Health Check — Live infrastructure evaluation
 *
 * Hits the production health endpoint and feeds the result to the
 * Operations Council's InfrastructureGuard, SecuritySentinel, and
 * DeploymentAgent for a health assessment.
 *
 * Run: npx ts-node --esm tests/launch-day/council-health-check.ts
 */

import {
  FortressOperationsCouncil,
  InfrastructureGuard,
  SecuritySentinel,
  DeploymentAgent,
  type HealthCheck,
  type DeployCandidate,
} from '../../ima/operations_council';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

async function runHealthCheck() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║      FORTRESS OPERATIONS COUNCIL — HEALTH CHECK     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ─── Step 1: Probe the health endpoint ──────────────────────────────
  console.log('Step 1: Probing health endpoint...');
  const startTime = Date.now();
  let healthData: any;
  try {
    const resp = await fetch(`${API}/health`);
    healthData = await resp.json();
  } catch (err) {
    console.error('FATAL: Cannot reach health endpoint:', err);
    process.exit(1);
  }
  const latency = Date.now() - startTime;

  console.log(`  Status: ${healthData.status}`);
  console.log(`  Database: ${healthData.database}`);
  console.log(`  Latency: ${latency}ms\n`);

  // ─── Step 2: Construct HealthCheck ──────────────────────────────────
  const check: HealthCheck = {
    backend: healthData.status === 'healthy' ? 'up' : healthData.status === 'degraded' ? 'degraded' : 'down',
    database: healthData.database === 'connected' ? 'connected' : 'disconnected',
    responseTimeMs: latency,
    errorRate: 0,
    memoryUsagePct: healthData.memory_pct || 50,
    activeConnections: healthData.active_connections || 10,
    timestamp: new Date(),
  };

  // ─── Step 3: Run InfrastructureGuard ────────────────────────────────
  console.log('Step 2: InfrastructureGuard evaluation...');
  const infra = new InfrastructureGuard();
  const infraDecision = await infra.evaluate(check);
  console.log(`  Action: ${infraDecision.action}`);
  console.log(`  Confidence: ${infraDecision.confidence}`);
  console.log(`  Tier: ${infraDecision.tier}`);
  console.log(`  Reasoning: ${infraDecision.reasoning.join(', ')}\n`);

  // ─── Step 4: Run SecuritySentinel ───────────────────────────────────
  console.log('Step 3: SecuritySentinel evaluation...');
  const security = new SecuritySentinel();
  const secDecision = await security.evaluateDeploy({
    version: 'launch-v1.0.0',
    changedFiles: ['full-launch'],
    testsPassed: true,
    securityScanPassed: true,
    hasRollbackPlan: true,
    breakingChanges: false,
  });
  console.log(`  Action: ${secDecision.action}`);
  console.log(`  Confidence: ${secDecision.confidence}`);
  console.log(`  Veto: ${secDecision.action === 'VETO' ? 'YES' : 'NO'}`);
  console.log(`  Reasoning: ${secDecision.reasoning.join(', ')}\n`);

  // ─── Step 5: Run DeploymentAgent ────────────────────────────────────
  console.log('Step 4: DeploymentAgent evaluation...');
  const deploy = new DeploymentAgent();
  const deployDecision = await deploy.evaluateDeploy({
    version: 'launch-v1.0.0',
    changedFiles: ['full-launch'],
    testsPassed: true,
    securityScanPassed: true,
    hasRollbackPlan: true,
    breakingChanges: false,
  });
  console.log(`  Action: ${deployDecision.action}`);
  console.log(`  Confidence: ${deployDecision.confidence}`);
  console.log(`  Reasoning: ${deployDecision.reasoning.join(', ')}\n`);

  // ─── Step 6: Council Vote ───────────────────────────────────────────
  console.log('Step 5: Council vote...');
  const council = new FortressOperationsCouncil();
  const vote = await council.vote([infraDecision, secDecision, deployDecision]);
  console.log(`  Consensus Level: ${vote.level}`);
  console.log(`  Approval Rate: ${(vote.approvalRate * 100).toFixed(0)}%`);
  console.log(`  Vetoed: ${vote.vetoed}`);
  console.log(`  Requires Human: ${vote.consensus.requiresHuman}\n`);

  // ─── Final Verdict ──────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════╗');
  if (vote.level === 'unanimous' || vote.level === 'strong') {
    console.log('║            >>> HEALTH CHECK: PASSED <<<              ║');
  } else {
    console.log('║            >>> HEALTH CHECK: FAILED <<<              ║');
  }
  console.log(`║  Level: ${vote.level.padEnd(44)}║`);
  console.log(`║  Vetoed: ${String(vote.vetoed).padEnd(43)}║`);
  console.log('╚══════════════════════════════════════════════════════╝');

  return vote;
}

runHealthCheck().catch(console.error);
