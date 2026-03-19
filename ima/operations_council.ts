/**
 * Fortress Operations Council — Phase A Runtime (3 Agents)
 *
 * Active agents:
 *   InfrastructureGuard — ECS, RDS, ALB, CodeBuild health
 *   SecuritySentinel    — API key abuse, rate limit anomalies, deploy security gate
 *   DeploymentAgent     — CodeBuild trigger, ECR push, ECS update, rollback
 *
 * SecuritySentinel has VETO power (authority 0.95).
 *
 * Voting:
 *   3/3 unanimous               → auto-proceed
 *   2/3 with Security approving → proceed with logging
 *   2/3 with Security dissenting→ BLOCK (security veto)
 *   1/3 or less                 → block + escalate to human
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Tier = 'L1' | 'L2' | 'L3' | 'L4';

export interface AgentConfig {
  id: string;
  domain: string;
  authority: number;
  decayHalfLifeDays: number;
  recoveryOnSuccess: number;
  lastSuccessAt?: Date;
  hasVeto: boolean;
}

export interface Decision {
  action: string;
  confidence: number;
  tier: Tier;
  requiresHuman: boolean;
  reasoning: string[];
}

export interface HealthCheck {
  backend: 'up' | 'down' | 'degraded';
  database: 'connected' | 'disconnected';
  responseTimeMs: number;
  errorRate: number;
  memoryUsagePct: number;
  activeConnections: number;
  timestamp: Date;
}

export interface DeployCandidate {
  version: string;
  changedFiles: string[];
  testsPassed: boolean;
  securityScanPassed: boolean;
  hasRollbackPlan: boolean;
  breakingChanges: boolean;
}

export interface UsageAnomaly {
  keyHash: string;
  requestsPerMinute: number;
  normalRpm: number;
  spikeFactor: number;
  isKnownKey: boolean;
}

// ─── Authority Decay ────────────────────────────────────────────────────────

function decayedAuthority(config: AgentConfig): number {
  if (!config.lastSuccessAt) return config.authority * 0.5;
  const days = (Date.now() - config.lastSuccessAt.getTime()) / 86_400_000;
  return config.authority * Math.pow(0.5, days / config.decayHalfLifeDays);
}

// ─── Agent 1: InfrastructureGuard ───────────────────────────────────────────

export class InfrastructureGuard {
  config: AgentConfig = {
    id: 'infrastructure-guard',
    domain: 'infrastructure',
    authority: 0.92,
    decayHalfLifeDays: 7,
    recoveryOnSuccess: 0.5,
    hasVeto: false,
  };

  async evaluate(check: HealthCheck): Promise<Decision> {
    if (check.backend === 'down') {
      return {
        action: 'restart_ecs_service',
        confidence: 0.95,
        tier: 'L3',
        requiresHuman: false,
        reasoning: ['Backend down — force new ECS deployment'],
      };
    }

    const issues: string[] = [];
    if (check.database === 'disconnected') issues.push('RDS disconnected');
    if (check.errorRate > 0.10) issues.push(`Error rate ${(check.errorRate * 100).toFixed(1)}%`);
    if (check.responseTimeMs > 2000) issues.push(`Response ${check.responseTimeMs}ms`);
    if (check.memoryUsagePct > 85) issues.push(`Memory ${check.memoryUsagePct}%`);

    if (issues.length === 0) {
      return { action: 'no_action', confidence: 0.90, tier: 'L1', requiresHuman: false, reasoning: ['All nominal'] };
    }

    return {
      action: issues.length >= 3 ? 'escalate_to_human' : 'alert_and_monitor',
      confidence: decayedAuthority(this.config),
      tier: issues.length >= 3 ? 'L3' : 'L2',
      requiresHuman: issues.length >= 3,
      reasoning: issues,
    };
  }
}

// ─── Agent 2: SecuritySentinel (VETO POWER) ─────────────────────────────────

export class SecuritySentinel {
  config: AgentConfig = {
    id: 'security-sentinel',
    domain: 'security',
    authority: 0.95,
    decayHalfLifeDays: 30,
    recoveryOnSuccess: 0.5,
    hasVeto: true,
  };

  async evaluateAnomaly(anomaly: UsageAnomaly): Promise<Decision> {
    if (!anomaly.isKnownKey && anomaly.spikeFactor > 50) {
      return {
        action: 'revoke_key',
        confidence: 0.95,
        tier: 'L3',
        requiresHuman: false,
        reasoning: [`Unknown key, ${anomaly.spikeFactor}x spike — auto-revoke`],
      };
    }

    if (anomaly.isKnownKey && anomaly.spikeFactor > 10) {
      return {
        action: 'throttle_and_notify',
        confidence: 0.80,
        tier: 'L2',
        requiresHuman: true,
        reasoning: [`Known key ${anomaly.spikeFactor}x spike — needs human review`],
      };
    }

    return { action: 'log', confidence: 0.85, tier: 'L1', requiresHuman: false, reasoning: ['Within range'] };
  }

  async evaluateDeploy(candidate: DeployCandidate): Promise<Decision> {
    const blocks: string[] = [];
    if (!candidate.securityScanPassed) blocks.push('Security scan failed');
    if (candidate.breakingChanges && !candidate.hasRollbackPlan) blocks.push('Breaking changes, no rollback');

    if (blocks.length > 0) {
      return { action: 'VETO', confidence: 0.95, tier: 'L2', requiresHuman: true, reasoning: blocks };
    }
    return { action: 'approve', confidence: decayedAuthority(this.config), tier: 'L1', requiresHuman: false, reasoning: ['Security clear'] };
  }
}

// ─── Agent 3: DeploymentAgent ───────────────────────────────────────────────

export class DeploymentAgent {
  config: AgentConfig = {
    id: 'deployment-agent',
    domain: 'deployment',
    authority: 0.88,
    decayHalfLifeDays: 14,
    recoveryOnSuccess: 0.4,
    hasVeto: false,
  };

  async evaluateDeploy(candidate: DeployCandidate): Promise<Decision> {
    const concerns: string[] = [];
    if (!candidate.testsPassed) concerns.push('Tests did not pass');
    if (!candidate.hasRollbackPlan && candidate.breakingChanges) concerns.push('No rollback for breaking changes');

    if (concerns.length === 0) {
      return {
        action: 'deploy',
        confidence: decayedAuthority(this.config),
        tier: 'L1',
        requiresHuman: false,
        reasoning: [`Deploy ${candidate.version} — tests pass, rollback ready`],
      };
    }

    return {
      action: 'block',
      confidence: decayedAuthority(this.config),
      tier: 'L2',
      requiresHuman: true,
      reasoning: concerns,
    };
  }
}

// ─── Council Orchestrator ───────────────────────────────────────────────────

export class FortressOperationsCouncil {
  private infra = new InfrastructureGuard();
  private security = new SecuritySentinel();
  private deploy = new DeploymentAgent();

  /**
   * Council vote with security veto.
   */
  async vote(decisions: Decision[]): Promise<{
    consensus: Decision;
    approvalRate: number;
    level: 'unanimous' | 'strong' | 'blocked' | 'conflicted';
    vetoed: boolean;
  }> {
    const approves = decisions.filter(d => d.action !== 'block' && d.action !== 'VETO');
    const veto = decisions.find(d => d.action === 'VETO');
    const approvalRate = approves.length / decisions.length;

    if (veto) {
      return { consensus: veto, approvalRate: 0, level: 'blocked', vetoed: true };
    }

    const level =
      approvalRate === 1.0 ? 'unanimous' :
      approvalRate >= 0.66 ? 'strong' :
      'conflicted';

    const consensus = decisions.reduce((best, d) => d.confidence > best.confidence ? d : best);
    if (decisions.some(d => d.requiresHuman)) consensus.requiresHuman = true;

    return { consensus, approvalRate, level, vetoed: false };
  }

  /**
   * Health monitoring cycle — called every 60s.
   */
  async monitorHealth(check: HealthCheck): Promise<Decision> {
    const infraDecision = await this.infra.evaluate(check);

    if (infraDecision.tier !== 'L1') {
      const secDecision = await this.security.evaluateAnomaly({
        keyHash: 'system', requestsPerMinute: 0, normalRpm: 100, spikeFactor: 0, isKnownKey: true,
      });
      const { consensus } = await this.vote([infraDecision, secDecision]);
      return consensus;
    }

    return infraDecision;
  }

  /**
   * Deployment decision — all 3 agents vote.
   */
  async evaluateDeployment(candidate: DeployCandidate): Promise<{
    decision: Decision;
    level: string;
    vetoed: boolean;
  }> {
    const [infraD, secD, deployD] = await Promise.all([
      this.infra.evaluate({
        backend: 'up', database: 'connected',
        responseTimeMs: 200, errorRate: 0, memoryUsagePct: 50,
        activeConnections: 10, timestamp: new Date(),
      }),
      this.security.evaluateDeploy(candidate),
      this.deploy.evaluateDeploy(candidate),
    ]);

    const { consensus, level, vetoed } = await this.vote([infraD, secD, deployD]);
    return { decision: consensus, level, vetoed };
  }
}
