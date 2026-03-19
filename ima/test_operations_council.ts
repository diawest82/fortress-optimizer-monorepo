/**
 * Test Suite 5: Operations Council Tests
 * Verifies voting, veto, authority decay, and health monitoring.
 *
 * Run: npx ts-node --esm ima/test_operations_council.ts
 */

import {
  InfrastructureGuard,
  SecuritySentinel,
  DeploymentAgent,
  FortressOperationsCouncil,
  HealthCheck,
  DeployCandidate,
  UsageAnomaly,
  Decision,
} from './operations_council.js';

let pass = 0;
let fail = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.log(`  ✗ FAIL: ${name}`);
    fail++;
  }
}

function assertEq(actual: any, expected: any, name: string) {
  assert(actual === expected, `${name} (got ${actual}, expected ${expected})`);
}

function assertGt(actual: number, threshold: number, name: string) {
  assert(actual > threshold, `${name} (got ${actual}, expected > ${threshold})`);
}

function assertLte(actual: number, threshold: number, name: string) {
  assert(actual <= threshold, `${name} (got ${actual}, expected <= ${threshold})`);
}

const healthyCheck: HealthCheck = {
  backend: 'up', database: 'connected',
  responseTimeMs: 150, errorRate: 0.01,
  memoryUsagePct: 45, activeConnections: 10,
  timestamp: new Date(),
};

const degradedCheck: HealthCheck = {
  backend: 'up', database: 'connected',
  responseTimeMs: 3000, errorRate: 0.15,
  memoryUsagePct: 90, activeConnections: 50,
  timestamp: new Date(),
};

const downCheck: HealthCheck = {
  backend: 'down', database: 'disconnected',
  responseTimeMs: 0, errorRate: 1.0,
  memoryUsagePct: 0, activeConnections: 0,
  timestamp: new Date(),
};

const goodCandidate: DeployCandidate = {
  version: '1.3.0',
  changedFiles: ['main.py', 'core.py'],
  testsPassed: true,
  securityScanPassed: true,
  hasRollbackPlan: true,
  breakingChanges: false,
};

const badCandidate: DeployCandidate = {
  version: '2.0.0',
  changedFiles: ['main.py', 'schema.py'],
  testsPassed: false,
  securityScanPassed: false,
  hasRollbackPlan: false,
  breakingChanges: true,
};

async function testInfrastructureGuard() {
  console.log('\n─── InfrastructureGuard ───');
  const guard = new InfrastructureGuard();

  // Healthy system
  const healthy = await guard.evaluate(healthyCheck);
  assertEq(healthy.action, 'no_action', 'Healthy system = no_action');
  assertEq(healthy.tier, 'L1', 'Healthy = L1 tier');
  assertEq(healthy.requiresHuman, false, 'Healthy = no human needed');

  // Backend down
  const down = await guard.evaluate(downCheck);
  assertEq(down.action, 'restart_ecs_service', 'Down = restart_ecs_service');
  assertEq(down.tier, 'L3', 'Down = L3 tier');

  // Degraded (multiple issues)
  const degraded = await guard.evaluate(degradedCheck);
  assert(degraded.action === 'escalate_to_human' || degraded.action === 'alert_and_monitor',
    'Degraded = escalate or alert');
  assert(degraded.reasoning.length > 0, 'Degraded has reasons');

  // Single issue (high response time only)
  const slowCheck: HealthCheck = {
    ...healthyCheck, responseTimeMs: 3000,
  };
  const slow = await guard.evaluate(slowCheck);
  assertEq(slow.action, 'alert_and_monitor', 'Single issue = alert_and_monitor');
  assertEq(slow.tier, 'L2', 'Single issue = L2');

  // Config
  assertEq(guard.config.authority, 0.92, 'Authority = 0.92');
  assertEq(guard.config.hasVeto, false, 'No veto power');
}

async function testSecuritySentinel() {
  console.log('\n─── SecuritySentinel ───');
  const sentinel = new SecuritySentinel();

  // Unknown key with massive spike → auto-revoke
  const unknownSpike: UsageAnomaly = {
    keyHash: 'abc123', requestsPerMinute: 5000,
    normalRpm: 100, spikeFactor: 60, isKnownKey: false,
  };
  const revoke = await sentinel.evaluateAnomaly(unknownSpike);
  assertEq(revoke.action, 'revoke_key', 'Unknown 60x spike = revoke');
  assertEq(revoke.requiresHuman, false, 'Auto-revoke no human');

  // Known key with spike → throttle + human review
  const knownSpike: UsageAnomaly = {
    keyHash: 'def456', requestsPerMinute: 1500,
    normalRpm: 100, spikeFactor: 15, isKnownKey: true,
  };
  const throttle = await sentinel.evaluateAnomaly(knownSpike);
  assertEq(throttle.action, 'throttle_and_notify', 'Known 15x spike = throttle');
  assertEq(throttle.requiresHuman, true, 'Throttle needs human');

  // Normal usage → log
  const normal: UsageAnomaly = {
    keyHash: 'ghi789', requestsPerMinute: 50,
    normalRpm: 100, spikeFactor: 0.5, isKnownKey: true,
  };
  const log = await sentinel.evaluateAnomaly(normal);
  assertEq(log.action, 'log', 'Normal usage = log');

  // Deploy: good candidate → approve
  const approve = await sentinel.evaluateDeploy(goodCandidate);
  assertEq(approve.action, 'approve', 'Good candidate = approve');

  // Deploy: bad candidate → VETO
  const veto = await sentinel.evaluateDeploy(badCandidate);
  assertEq(veto.action, 'VETO', 'Bad candidate = VETO');
  assertEq(veto.requiresHuman, true, 'VETO requires human');

  // Config
  assertEq(sentinel.config.authority, 0.95, 'Authority = 0.95');
  assertEq(sentinel.config.hasVeto, true, 'Has veto power');
}

async function testDeploymentAgent() {
  console.log('\n─── DeploymentAgent ───');
  const agent = new DeploymentAgent();

  // Good candidate → deploy
  const deploy = await agent.evaluateDeploy(goodCandidate);
  assertEq(deploy.action, 'deploy', 'Good candidate = deploy');
  assertEq(deploy.tier, 'L1', 'Good deploy = L1');

  // Bad candidate → block
  const block = await agent.evaluateDeploy(badCandidate);
  assertEq(block.action, 'block', 'Bad candidate = block');
  assertEq(block.requiresHuman, true, 'Block requires human');

  // Config
  assertEq(agent.config.authority, 0.88, 'Authority = 0.88');
  assertEq(agent.config.hasVeto, false, 'No veto power');
}

async function testAuthorityDecay() {
  console.log('\n─── Authority Decay ───');
  const guard = new InfrastructureGuard();

  // With recent success
  guard.config.lastSuccessAt = new Date();
  const recent = await guard.evaluate(degradedCheck);
  const recentConf = recent.confidence;

  // With old success (7 days ago = 1 half-life)
  guard.config.lastSuccessAt = new Date(Date.now() - 7 * 86400000);
  const old = await guard.evaluate(degradedCheck);
  const oldConf = old.confidence;

  assert(recentConf > oldConf, 'Recent success = higher confidence than old');
  assertLte(oldConf, guard.config.authority * 0.55, 'After 1 half-life, ≈50% authority');

  // With no success ever
  guard.config.lastSuccessAt = undefined;
  const never = await guard.evaluate(degradedCheck);
  assertLte(never.confidence, guard.config.authority * 0.51, 'No success = 50% authority');
}

async function testCouncilVoting() {
  console.log('\n─── Council Voting ───');
  const council = new FortressOperationsCouncil();

  // Unanimous approval
  const decisions: Decision[] = [
    { action: 'deploy', confidence: 0.90, tier: 'L1', requiresHuman: false, reasoning: ['OK'] },
    { action: 'approve', confidence: 0.85, tier: 'L1', requiresHuman: false, reasoning: ['Clear'] },
    { action: 'deploy', confidence: 0.88, tier: 'L1', requiresHuman: false, reasoning: ['Ready'] },
  ];
  const unanimous = await council.vote(decisions);
  assertEq(unanimous.level, 'unanimous', 'All approve = unanimous');
  assertEq(unanimous.vetoed, false, 'No veto');
  assertEq(unanimous.approvalRate, 1.0, 'Approval rate = 1.0');

  // 2/3 strong
  const strong: Decision[] = [
    { action: 'deploy', confidence: 0.90, tier: 'L1', requiresHuman: false, reasoning: ['OK'] },
    { action: 'approve', confidence: 0.85, tier: 'L1', requiresHuman: false, reasoning: ['Clear'] },
    { action: 'block', confidence: 0.60, tier: 'L2', requiresHuman: true, reasoning: ['Concern'] },
  ];
  const strongResult = await council.vote(strong);
  assertEq(strongResult.level, 'strong', '2/3 = strong');

  // Security VETO overrides everything
  const vetoed: Decision[] = [
    { action: 'deploy', confidence: 0.90, tier: 'L1', requiresHuman: false, reasoning: ['OK'] },
    { action: 'VETO', confidence: 0.95, tier: 'L2', requiresHuman: true, reasoning: ['Security fail'] },
    { action: 'deploy', confidence: 0.88, tier: 'L1', requiresHuman: false, reasoning: ['Ready'] },
  ];
  const vetoResult = await council.vote(vetoed);
  assertEq(vetoResult.level, 'blocked', 'VETO = blocked');
  assertEq(vetoResult.vetoed, true, 'Vetoed flag true');
  assertEq(vetoResult.approvalRate, 0, 'Approval rate = 0 on veto');

  // All blocked = conflicted
  const conflicted: Decision[] = [
    { action: 'block', confidence: 0.50, tier: 'L2', requiresHuman: true, reasoning: ['No'] },
    { action: 'block', confidence: 0.50, tier: 'L2', requiresHuman: true, reasoning: ['No'] },
    { action: 'block', confidence: 0.50, tier: 'L2', requiresHuman: true, reasoning: ['No'] },
  ];
  const conflictedResult = await council.vote(conflicted);
  assertEq(conflictedResult.level, 'conflicted', 'All block = conflicted');
}

async function testCouncilHealthMonitor() {
  console.log('\n─── Council Health Monitor ───');
  const council = new FortressOperationsCouncil();

  // Healthy system → no_action, no council vote needed
  const healthy = await council.monitorHealth(healthyCheck);
  assertEq(healthy.action, 'no_action', 'Healthy = no_action');

  // Down system → triggers council
  const down = await council.monitorHealth(downCheck);
  assertEq(down.action, 'restart_ecs_service', 'Down triggers restart');
}

async function testCouncilDeployment() {
  console.log('\n─── Council Deployment ───');
  const council = new FortressOperationsCouncil();

  // Good candidate → approved
  const good = await council.evaluateDeployment(goodCandidate);
  assertEq(good.vetoed, false, 'Good candidate not vetoed');
  assert(good.level === 'unanimous' || good.level === 'strong', 'Good candidate approved');

  // Bad candidate → vetoed by SecuritySentinel
  const bad = await council.evaluateDeployment(badCandidate);
  assertEq(bad.vetoed, true, 'Bad candidate vetoed');
  assertEq(bad.level, 'blocked', 'Bad candidate blocked');
}

async function testRequiresHumanPropagation() {
  console.log('\n─── requiresHuman Propagation ───');
  const council = new FortressOperationsCouncil();

  // If any decision requires human, consensus should too
  const mixed: Decision[] = [
    { action: 'deploy', confidence: 0.90, tier: 'L1', requiresHuman: false, reasoning: ['OK'] },
    { action: 'approve', confidence: 0.85, tier: 'L1', requiresHuman: true, reasoning: ['Need review'] },
    { action: 'deploy', confidence: 0.88, tier: 'L1', requiresHuman: false, reasoning: ['Ready'] },
  ];
  const result = await council.vote(mixed);
  assertEq(result.consensus.requiresHuman, true, 'Any requiresHuman → consensus requiresHuman');
}

// ─── Run All ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══ Fortress Operations Council Test Suite ═══');

  await testInfrastructureGuard();
  await testSecuritySentinel();
  await testDeploymentAgent();
  await testAuthorityDecay();
  await testCouncilVoting();
  await testCouncilHealthMonitor();
  await testCouncilDeployment();
  await testRequiresHumanPropagation();

  console.log(`\n═══ Results: ${pass} passed, ${fail} failed, ${pass + fail} total ═══`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
